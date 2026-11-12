import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, rmSync, lstatSync, realpathSync, readlinkSync, openSync, readSync, closeSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fixtures from './fixtures.cjs';

const { ORIGIN, validateFonts } = fixtures;
const require = createRequire(new URL('../../package.json', import.meta.url));
const lockBytes = readFileSync(new URL('./fonts.lock.json', import.meta.url));
const lock = JSON.parse(lockBytes);
const lockSha256 = createHash('sha256').update(lockBytes).digest('hex');
const files = lock.fonts.map(item => ({ ...item, file: item.sha256 + '.woff2' }));
const cssDirectory = fileURLToPath(new URL('./fonts/', import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function verifiedFile(directory, item, extension) {
  assert.match(item.sha256, /^[a-f0-9]{64}$/);
  if (item.file) assert.match(item.file, /^[a-z-]+\.css$/);
  const filename = path.join(directory, item.file ?? item.sha256 + extension);
  assert(lstatSync(filename).isFile(), 'Prepared assets must be regular files');
  const bytes = readFileSync(filename);
  assert.equal(bytes.length, item.bytes, 'Pinned asset length changed');
  assert.equal(sha256(bytes), item.sha256, 'Pinned asset hash changed');
  return bytes;
}
function responseSource() {
  const responses = {};
  const observed = new Set();
  for (const stylesheet of lock.css) {
    let css = verifiedFile(cssDirectory, stylesheet, '.css').toString('utf8');
    assert.equal((css.match(/@font-face/g) ?? []).length, stylesheet.fontFaceRules);
    const urls = [...css.matchAll(/url\((https:\/\/[^)]+)\)/g)].map(match => match[1]);
    assert(urls.length > 0, 'No font URL in pinned stylesheet');
    for (const url of new Set(urls)) {
      const font = files.find(item => item.url === url && item.family === stylesheet.family);
      assert(font, 'Unlisted font URL in stylesheet');
      observed.add(url);
      css = css.split(url).join(ORIGIN + '/__e2e/fonts/' + font.file);
    }
    for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
      const url = new URL(match[1]);
      assert.equal(url.origin, ORIGIN, 'External font origin remains');
      assert(!url.search && !url.hash && !url.username && !url.password);
      assert(files.some(font => url.pathname === '/__e2e/fonts/' + font.file), 'Unlisted local font path');
    }
    responses[stylesheet.url] = css;
  }
  assert.equal(observed.size, files.length, 'Every pinned font must be referenced');
  return 'module.exports = ' + JSON.stringify(responses, null, 2) + ';\n';
}
export function loadPreparedFonts(directory) {
  const prepared = JSON.parse(readFileSync(path.join(directory, 'prepared.json'), 'utf8'));
  assert.equal(prepared.status, 'PASS');
  assert.equal(prepared.lockSha256, lockSha256);
  assert.deepEqual(prepared.files, files);
  const fonts = validateFonts(directory, prepared);
  const responseFile = path.join(directory, 'responses.cjs');
  assert(lstatSync(responseFile).isFile(), 'Font mapping must be a regular file');
  assert.equal(readFileSync(responseFile, 'utf8'), responseSource(), 'Font CSS mapping changed');
  return { manifest: prepared, fonts };
}
export function assertFontRuntime(manifest) {
  assert.equal(require('next/package.json').version, manifest.nextVersion);
}
function boundedProcFile(filename, maximum) {
  const descriptor = openSync(filename, 'r');
  try {
    const buffer = Buffer.alloc(maximum + 1);
    const bytes = readSync(descriptor, buffer, 0, buffer.length, null);
    if (bytes > maximum) throw new Error('proc_observation_limit');
    return buffer.subarray(0, bytes).toString('utf8');
  } finally { closeSync(descriptor); }
}
export function snapshotChildPids() {
  const text = boundedProcFile('/proc/self/task/' + process.pid + '/children', 4096).trim();
  if (text && !/^\d+(?:\s+\d+)*$/.test(text)) throw new Error('invalid_child_snapshot');
  const pids = text ? text.split(/\s+/).map(Number) : [];
  if (pids.length > 16) throw new Error('child_observation_limit');
  return pids;
}
export function inspectNewOwnedChildren(children, allowedExecutables) {
  try {
    if (children.length !== 1) return { status: 'NON OBSERVÉ', reason: 'missing_or_ambiguous_new_child' };
    const pid = children[0];
    if (!Number.isSafeInteger(pid) || pid <= 0) return { status: 'NON OBSERVÉ', reason: 'invalid_child_identity' };
    const status = boundedProcFile('/proc/' + pid + '/status', 16384);
    const parent = status.match(/^PPid:\s+(\d+)$/m);
    const ids = status.match(/^Uid:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/m);
    if (!parent || Number(parent[1]) !== process.pid || !ids || ids.slice(1).some(id => Number(id) !== process.getuid())) {
      return { status: 'NON OBSERVÉ', reason: 'child_ownership_not_verified' };
    }
    if (readlinkSync('/proc/' + pid + '/ns/net') !== readlinkSync('/proc/self/ns/net')) {
      return { status: 'NON OBSERVÉ', reason: 'child_namespace_not_verified' };
    }
    const executable = realpathSync('/proc/' + pid + '/exe');
    const allowed = allowedExecutables.flatMap(filename => {
      try { return [realpathSync(filename)]; } catch { return []; }
    });
    if (!allowed.includes(executable)) return { status: 'NON OBSERVÉ', reason: 'child_executable_not_verified' };
    const arguments_ = boundedProcFile('/proc/' + pid + '/cmdline', 65536).split('\0').filter(Boolean);
    if (!arguments_.length || realpathSync(arguments_[0]) !== executable) {
      return { status: 'NON OBSERVÉ', reason: 'child_command_identity_not_verified' };
    }
    // Never persist arbitrary arguments, environment, PID or another process's data.
    return { status: 'OBSERVÉ', identityVerified: true,
      sandboxFlags: arguments_.filter(argument => /^--[^=]*(?:sandbox|seccomp)[^=]*(?:=|$)/.test(argument)).map(argument => argument.split('=')[0]) };
  } catch {
    return { status: 'NON OBSERVÉ', reason: 'owned_process_metadata_unavailable' };
  }
}
export function observeNewOwnedChild(before, allowedExecutables) {
  try { return inspectNewOwnedChildren(snapshotChildPids().filter(pid => !before.includes(pid)), allowedExecutables); }
  catch { return { status: 'NON OBSERVÉ', reason: 'owned_child_snapshot_unavailable' }; }
}
const installedChromePath = '/opt/google/chrome/chrome';
const installedChromeProfile = '/etc/apparmor.d/chrome';
const installedChromeFiles = [
  ['/', 'directory'], ['/opt', 'directory'], ['/opt/google', 'directory'], ['/opt/google/chrome', 'directory'],
  [installedChromePath, 'file'], ['/etc', 'directory'], ['/etc/apparmor.d', 'directory'], [installedChromeProfile, 'file'],
];
export function assertInstalledChromeMetadata(entries) {
  assert.deepEqual(entries.map(entry => [entry.path, entry.type]), installedChromeFiles, 'The installed Chrome paths must be exact');
  for (const entry of entries) {
    assert.equal(entry.realpath, entry.path, 'The installed Chrome paths must not resolve to substitutes');
    assert.equal(entry.uid, 0, 'The installed Chrome paths must remain root-owned');
    assert.equal(entry.mode & 0o022, 0, 'The installed Chrome paths must not be writable by the runner: ' +
      entry.path + ' (mode 0' + (entry.mode & 0o7777).toString(8) + ')');
    assert.equal(entry.mode & 0o6000, 0, 'The observed Chrome paths must not require setuid or setgid');
  }
  return installedChromePath;
}
function inspectInstalledChrome() {
  const entries = installedChromeFiles.map(([filename]) => {
    const info = lstatSync(filename);
    return { path: filename, realpath: realpathSync(filename), uid: info.uid, mode: info.mode,
      type: info.isFile() ? 'file' : info.isDirectory() ? 'directory' : 'other' };
  });
  const executable = assertInstalledChromeMetadata(entries);
  const profile = boundedProcFile(installedChromeProfile, 65536);
  assert(profile.includes(installedChromePath) && /^\s*userns\s*,/m.test(profile), 'The pre-existing Chrome user namespace profile must be present');
  return { executable, paths: entries, profilePath: installedChromeProfile, profileSha256: sha256(profile),
    profileEvidence: 'Existing root-owned profile file observed; active kernel policy is not inferred from this file alone' };
}
export async function fontGate(manifest, env, browserDirectory) {
  const originalBrowsers = process.env.PLAYWRIGHT_BROWSERS_PATH;
  process.env.PLAYWRIGHT_BROWSERS_PATH = browserDirectory;
  try { return await verifyFontRendering(manifest, env); }
  finally {
    if (originalBrowsers === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH;
    else process.env.PLAYWRIGHT_BROWSERS_PATH = originalBrowsers;
  }
}
async function verifyFontRendering(manifest, env) {
  const { chromium } = require('playwright');
  const installation = inspectInstalledChrome();
  let previousChildren;
  try { previousChildren = snapshotChildPids(); } catch { previousChildren = null; }
  const browser = await chromium.launch({ env, channel: 'chrome', chromiumSandbox: true });
  try {
    let observation = { status: 'NON OBSERVÉ', reason: 'owned_child_snapshot_unavailable' };
    if (previousChildren) {
      try {
        observation = observeNewOwnedChild(previousChildren, [installation.executable]);
      } catch { observation = { status: 'NON OBSERVÉ', reason: 'registered_executable_metadata_unavailable' }; }
    }
    assert.equal(observation.status, 'OBSERVÉ', 'Owned Chromium command-line observation required: ' + (observation.reason ?? 'unknown'));
    assert.equal(observation.identityVerified, true, 'Owned Chromium identity must be verified');
    assert(!observation.sandboxFlags.includes('--no-sandbox'), 'The protected browser must not disable its sandbox');
    const browserPolicy = {
      version: browser.version(), channel: 'chrome', installation, chromiumSandboxOption: true, noSandboxFlagAbsent: true,
      observation,
      internalBrowserSandboxQualification: 'Launch option and verified owned-process flags only; not a full internal sandbox attestation',
    };
    const page = await browser.newPage();
    const externalRequests = [];
    const fontErrors = [];
    page.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== ORIGIN) externalRequests.push(url.origin + url.pathname);
    });
    page.on('console', message => {
      if (message.type() === 'error' && /font|decode|OTS|Content Security Policy/i.test(message.text())) fontErrors.push(message.text());
    });
    await page.goto(ORIGIN + '/login', { waitUntil: 'networkidle' });
    const loaded = await page.evaluate(async files => {
      const results = [];
      const families = [];
      const style = getComputedStyle(document.documentElement);
      for (const [variable, expectedName, weights] of [
        ['--font-orbitron', 'orbitron', [400, 500, 600, 700, 800, 900]],
        ['--font-dm-sans', 'dmsans', [300, 400, 500, 600, 700]],
        ['--font-jetbrains-mono', 'jetbrainsmono', [400, 500, 600, 700]],
      ]) {
        const family = style.getPropertyValue(variable).split(',')[0].trim();
        if (!family.toLowerCase().replace(/[^a-z]/g, '').includes(expectedName)) throw new Error('Wrong application font family: ' + variable);
        for (const weight of weights) {
          const specification = weight + ' 16px ' + family;
          const faces = await document.fonts.load(specification, 'MIDAS 0123456789');
          if (!faces.length || faces.some(face => face.status !== 'loaded') || !document.fonts.check(specification, 'MIDAS 0123456789')) {
            throw new Error('Application font did not load: ' + specification);
          }
          families.push({ variable, family, weight, status: 'loaded' });
        }
      }
      for (const [index, file] of files.entries()) {
        const face = new FontFace('MidasPinnedProbe' + index, 'url("/__e2e/fonts/' + file + '")');
        await face.load();
        if (face.status !== 'loaded') throw new Error('Pinned WOFF2 did not decode');
        results.push({ file, status: face.status });
      }
      await document.fonts.ready;
      return { files: results, families };
    }, manifest.files.map(item => item.file));
    assert.equal(loaded.files.length, manifest.files.length);
    assert.equal(loaded.families.length, 15);
    assert.deepEqual(externalRequests, []);
    assert.deepEqual(fontErrors, []);
    return { ...loaded, browserPolicy };
  } finally { await browser.close(); }
}
async function download(item, userAgent) {
  const url = new URL(item.url);
  assert.equal(url.protocol, 'https:');
  assert(['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname));
  assert(!url.username && !url.password && !url.hash);
  const response = await fetch(url, { redirect: 'error', headers: { 'user-agent': userAgent },
    signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, 'Pinned Google font resource unavailable');
  let size = 0;
  const parts = [];
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert(size <= item.bytes, 'Pinned asset exceeded expected byte count');
    parts.push(Buffer.from(chunk));
  }
  const bytes = Buffer.concat(parts);
  assert.equal(size, item.bytes);
  assert.equal(sha256(bytes), item.sha256, 'Pinned Google font bytes changed; require review, never silently refresh');
  return bytes;
}
async function prepare(directory) {
  assert.notEqual(process.env.NODE_TLS_REJECT_UNAUTHORIZED, '0', 'TLS verification must be enabled');
  mkdirSync(directory, { mode: 0o700 }); // Never replace a pre-existing directory.
  try {
    const responses = responseSource(); // Fixed, reviewed CSS is verified before any download.
    const acquisitions = await Promise.allSettled(
      files.map(async item => {
        const bytes = await download(item, lock.userAgent);
        assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
        assert.equal(bytes.readUInt32BE(8), bytes.length);
        writeFileSync(path.join(directory, item.file), bytes, { mode: 0o600 });
      })
    );
    const failure = acquisitions.find(item => item.status === 'rejected');
    if (failure) throw failure.reason;
    writeFileSync(path.join(directory, 'responses.cjs'), responses, { mode: 0o600 });
    const prepared = { status: 'PASS', at: new Date().toISOString(), nextVersion: lock.nextVersion,
      lockSha256, files, css: lock.css, fontBytes: files.reduce((sum, item) => sum + item.bytes, 0),
      tlsVerification: true, expectedHashesRefreshed: false };
    writeFileSync(path.join(directory, 'prepared.json'), JSON.stringify(prepared, null, 2) + '\n', { mode: 0o600 });
    loadPreparedFonts(directory);
    console.log(JSON.stringify({ preparedFonts: files.length, css: lock.css.length,
      fontBytes: prepared.fontBytes, lockSha256, tlsVerification: true }));
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await prepare(path.resolve(process.argv[2])); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
