import { registerHooks } from 'node:module';

// Run the actual route modules, replacing only the authenticated database
// boundary and the external market/model analysis used by signal generation.
const fixture = new URL('./fixture.mjs', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/server'
      || (specifier === './generate-verified-signal'
        && context.parentURL?.endsWith('/src/lib/signals/generate-and-persist.ts'))) {
      return { url: fixture, shortCircuit: true };
    }
    if (specifier === 'next/server') return nextResolve('next/server.js', context);
    return nextResolve(specifier, context);
  },
});
