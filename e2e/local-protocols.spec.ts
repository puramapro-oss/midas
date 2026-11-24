import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Run the actual current function bodies, not handwritten replicas. Browser
// globals and the provider client are doubles: these are local protocol tests,
// not authenticated UI, HttpOnly-cookie or server-session revocation evidence.
function readFunction(relative: string, name: string) {
  const file = ts.createSourceFile(relative, readFileSync(path.join(process.cwd(), relative), 'utf8'),
    ts.ScriptTarget.Latest, true, relative.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const declarations = file.statements.filter((node): node is ts.FunctionDeclaration =>
    ts.isFunctionDeclaration(node) && node.name?.text === name);
  expect(declarations).toHaveLength(1);
  expect(declarations[0].body).toBeDefined();
  return { file, declaration: declarations[0] };
}

function evaluateFunction(relative: string, name: string, globals: Record<string, unknown>) {
  const { file, declaration } = readFunction(relative, name);
  const result = ts.transpileModule(declaration.getText(file), {
    fileName: relative,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
  });
  expect(result.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error)).toEqual([]);
  return vm.runInNewContext(`${result.outputText}\n;${name};`, { ...globals, exports: {} },
    { filename: relative, timeout: 1000 }) as (...args: unknown[]) => unknown;
}

function localStorageDouble(seed: Record<string, string>, events: string[]) {
  const data = { ...seed };
  Object.defineProperties(data, {
    getItem: { value: (key: string) => Object.hasOwn(data, key) ? data[key] : null },
    setItem: { value: (key: string, value: string) => { data[key] = String(value); events.push(`set:${key}`); } },
    removeItem: { value: (key: string) => { delete data[key]; events.push(`remove:${key}`); } },
  });
  return data as unknown as Storage;
}

const logoutSources = [
  ['src/components/layout/UserMenu.tsx', 'signout-button'],
  ['src/components/settings/ProfilTab.tsx', 'settings-signout-button'],
];

for (const [relative, testId] of logoutSources) {
  test.describe(`Local logout protocol: ${relative}`, () => {
    test('the identified button binds directly to the real handleLogout', () => {
      const { file } = readFunction(relative, 'handleLogout');
      const matches: ts.JsxOpeningElement[] = [];
      function visit(node: ts.Node) {
        if (ts.isJsxOpeningElement(node) && node.attributes.properties.some(attribute =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'data-testid' &&
          attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === testId)) {
          matches.push(node);
        }
        ts.forEachChild(node, visit);
      }
      visit(file);
      expect(matches).toHaveLength(1);
      const onClick = matches[0].attributes.properties.find(attribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText(file) === 'onClick');
      expect(onClick?.getText(file)).toBe('onClick={handleLogout}');
    });

    for (const providerThrows of [false, true]) {
      test(`the real handler clears local auth and redirects with providerThrows=${providerThrows}`, () => {
        const events: string[] = [];
        const localStorage = localStorageDouble({
          'sb-local-fixture-auth-token': 'synthetic', supabaseFixture: 'synthetic',
          midas_remember: 'true', 'midas-theme': 'oled', unrelated: 'keep',
        }, events);
        const sessionStorage = localStorageDouble({ midas_session_valid: 'true', unrelated: 'keep' }, events);
        const cookies = new Map([['sb-visible-fixture', 'synthetic'], ['midas-visible-fixture', 'value']]);
        const cookieWrites: string[] = [];
        const document = {
          get cookie() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); },
          set cookie(value: string) {
            cookieWrites.push(value);
            cookies.delete(value.split('=')[0]);
            events.push('cookie-clear');
          },
        };
        let href = '/dashboard';
        const location = {
          get href() { return href; },
          set href(value: string) { href = value; events.push('redirect'); },
        };
        const calls: string[] = [];
        const createClient = () => ({ auth: { signOut: (options: { scope: string }) => {
          expect(localStorage.getItem('midas_forced_logout')).toBe('true');
          expect(localStorage.getItem('sb-local-fixture-auth-token')).toBeNull();
          calls.push(options.scope);
          events.push('signout');
          if (providerThrows) throw new Error('synthetic synchronous provider failure');
          return Promise.resolve({ error: null });
        } } });
        const run = evaluateFunction(relative, 'handleLogout', { localStorage, sessionStorage,
          document, window: { location }, createClient });
        run();

        expect(events[0]).toBe('set:midas_forced_logout');
        expect(events.indexOf('signout')).toBeGreaterThan(events.indexOf('remove:midas_remember'));
        expect(events.at(-1)).toBe('redirect');
        expect(calls).toEqual(['local']);
        expect(href).toBe('/login');
        expect(localStorage.getItem('supabaseFixture')).toBeNull();
        expect(localStorage.getItem('midas_remember')).toBeNull();
        expect(sessionStorage.getItem('midas_session_valid')).toBeNull();
        expect(localStorage.getItem('midas-theme')).toBe('oled');
        expect(localStorage.getItem('unrelated')).toBe('keep');
        expect(sessionStorage.getItem('unrelated')).toBe('keep');
        expect(cookies.size).toBe(0);
        expect(cookieWrites).toHaveLength(2);
        for (const write of cookieWrites) expect(write).toContain('expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/');
      });
    }
  });
}

test.describe('Cron refusal protocol without a secret or privileged job execution', () => {
  for (const secret of [undefined, 'local-fixture-with-no-authority']) {
    test(`actual cron guard refuses absent Authorization with secretConfigured=${Boolean(secret)}`, () => {
      const run = evaluateFunction('src/lib/cron-auth.ts', 'assertCronAuth', {
        process: { env: secret ? { CRON_SECRET: secret } : {} },
        NextResponse: { json: (body: unknown, init: { status: number }) => ({ body, status: init.status }) },
      });
      const result = run({ headers: new Headers() });
      expect(result).toEqual(secret
        ? { body: { error: 'Unauthorized' }, status: 401 }
        : { body: { error: 'CRON_SECRET not configured' }, status: 503 });
      // A deliberate 503 is tested here, not sent through the isolated server,
      // whose zero-application-5xx gate must remain strict.
    });
  }

  for (const period of ['weekly', 'monthly']) {
    test(`${period} contest handler returns the guard before its operational body`, () => {
      const { file, declaration } = readFunction(`src/app/api/cron/contest-${period}/route.ts`, 'GET');
      const statements = declaration.body!.statements;
      expect(statements[0].getText(file)).toBe('const unauthorized = assertCronAuth(request as unknown as NextRequest);');
      expect(statements[1].getText(file)).toBe('if (unauthorized) return unauthorized;');
      // The cron handler itself is intentionally never executed by this test.
    });
  }
});
