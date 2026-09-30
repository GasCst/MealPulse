// Regression tests for changing Mac addresses, using the real service code.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadService({ stored = null, timeout = 2500 } = {}) {
  const state = { url: 'http://192.168.1.10:8000', fail: false, calls: 0, stored, gate: null };
  const query = {
    select() { return this; },
    eq() { return this; },
    abortSignal(signal) { this.signal = signal; return this; },
    async maybeSingle() {
      state.calls++;
      if (state.gate) await state.gate;
      return state.fail ? { error: new Error('Offline') } : { data: { value: state.url } };
    },
  };
  const source = fs.readFileSync(path.join(__dirname, '../services/remoteConfigService.ts'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const context = {
    exports, process: { env: {} }, AbortController, console,
    setTimeout: (fn) => setTimeout(fn, timeout), clearTimeout,
    require(name) {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === 'expo-constants') return { default: { expoConfig: null } };
      if (name === './supabaseService') return {
        supabase: { from: () => query },
        ExpoGoSafeAsyncStorage: {
          getItem: async () => state.stored,
          setItem: async (_, value) => { state.stored = value; },
        },
      };
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(output, context);
  return { service: exports, state };
}

test('a new request fetches the changed endpoint instead of reusing memory forever', async () => {
  const { service, state } = loadService();
  assert.equal(await service.getDynamicTtsApiUrl(), state.url);
  state.url = 'http://192.168.1.43:8000/';
  assert.equal(await service.getDynamicTtsApiUrl(), 'http://192.168.1.43:8000');
  assert.equal(state.calls, 2);
});

test('concurrent voice requests share one config fetch', async () => {
  const { service, state } = loadService();
  let release;
  state.gate = new Promise(resolve => { release = resolve; });
  const a = service.getDynamicTtsApiUrl();
  const b = service.getDynamicTtsApiUrl();
  release();
  assert.deepEqual(await Promise.all([a, b]), [state.url, state.url]);
  assert.equal(state.calls, 1);
});

test('remote failure preserves the last successfully fetched endpoint', async () => {
  const { service, state } = loadService();
  await service.getDynamicTtsApiUrl();
  state.fail = true;
  assert.equal(await service.getDynamicTtsApiUrl(), state.url);
});

test('persistent cache is only a fallback and invalid remote URLs are ignored', async () => {
  const { service, state } = loadService({ stored: 'http://192.168.1.20:8000' });
  state.url = 'javascript:invalid';
  assert.equal(await service.getDynamicTtsApiUrl(), state.stored);
  state.url = 'http://192.168.1.43:8000';
  assert.equal(await service.getDynamicTtsApiUrl(), state.url);
});
