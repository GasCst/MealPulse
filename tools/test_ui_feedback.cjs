const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function load(file, imports, globals = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports, console: { log() {}, warn() {} }, process: { env: {} },
    setTimeout, clearTimeout, AbortController, Uint8Array, Date,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    require(name) { if (name in imports) return imports[name]; throw new Error(`Unexpected import ${name}`); },
    ...globals,
  });
  return exports;
}

test('every app-owned native button uses shared tap feedback', () => {
  const primitives = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Switch', 'Button']);
  const violations = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(file) && !file.endsWith('FeedbackPressable.tsx')) {
        const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        for (const node of ast.statements) {
          if (!ts.isImportDeclaration(node) || node.moduleSpecifier.text !== 'react-native') continue;
          for (const spec of node.importClause?.namedBindings?.elements || []) {
            if (!spec.isTypeOnly && primitives.has((spec.propertyName || spec.name).text)) violations.push(file);
          }
        }
      }
    }
  }
  walk(path.join(root, 'app')); walk(path.join(root, 'components'));
  assert.deepEqual(violations, []);
});

test('tap wrappers preserve handlers, native props and refs; disabled buttons stay silent', () => {
  let taps = 0, actions = 0;
  const react = {
    forwardRef: render => render, useCallback: fn => fn,
    createElement: (type, props) => ({ type, props }),
  };
  const native = Object.fromEntries(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Switch'].map(name => [name, name]));
  const controls = load('components/ui/FeedbackPressable.tsx', {
    react, 'react-native': native, '@/services/buttonSoundService': { buttonSoundService: { playTap: () => { taps++; } } },
  });
  for (const name of ['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback']) {
    const ref = {};
    const props = { onPress: () => { actions++; }, testID: 'button', accessibilityState: { busy: true } };
    const rendered = controls[name](props, ref);
    assert.equal(rendered.props.ref, ref);
    assert.equal(rendered.props.testID, 'button');
    assert.equal(rendered.props.accessibilityState.busy, true);
    rendered.props.onPress({});
    controls[name]({ ...props, disabled: true }, ref).props.onPress({});
  }
  assert.equal(taps, 4); assert.equal(actions, 4);
  controls.Pressable({ onPress: () => { actions++; }, sound: false }, null).props.onPress({});
  assert.equal(actions, 5); assert.equal(taps, 4);
});

test('tap sound is preloaded once, throttled and muted without network access', async () => {
  let loads = 0, plays = 0, saved = null;
  const sound = { replayAsync: async () => { plays++; }, stopAsync: async () => {}, unloadAsync: async () => {} };
  const { buttonSoundService: service } = load('services/buttonSoundService.ts', {
    '@react-native-async-storage/async-storage': { getItem: async () => saved, setItem: async (_, value) => { saved = value; } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-av': { Audio: { Sound: { createAsync: async () => { loads++; return { sound }; } } } },
    '@/assets/sounds/soft-pop.wav': 1,
  });
  await service.initialize();
  service.playTap(); service.playTap(); await tick();
  assert.equal(loads, 1); assert.equal(plays, 1);
  await service.setEnabled(false); service.playTap(); await tick();
  assert.equal(plays, 1); assert.equal(saved, 'false');
  await service.release();
});

function voiceFixture(fetchImpl, soundGate = null, stopSpeech = async () => {}) {
  const options = { speech: null, sounds: [] };
  const { voiceCoachService: service } = load('services/voiceCoachService.ts', {
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => {} },
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { expoConfig: {} },
    'expo-speech': { stop: stopSpeech, speak: (_, config) => { options.speech = config; } },
    'expo-file-system/legacy': { cacheDirectory: '/cache/', EncodingType: { Base64: 'base64' }, writeAsStringAsync: async () => {} },
    '@/services/remoteConfigService': { getDynamicTtsApiUrl: async () => 'http://mac:8000' },
    '@/services/voiceTextStyle': { cleanSpokenText: text => text.trim(), getVoiceLanguage: async () => 'it', speechCacheKey: (...args) => JSON.stringify(args) },
    'expo-av': { Audio: { setAudioModeAsync: async () => {}, Sound: { createAsync: async (_uri, initial, callback) => {
      assert.equal(initial.shouldPlay, false);
      const sound = {
        playAsync: async () => callback({ isLoaded: true, isPlaying: true }),
        stopCalls: 0, unloadCalls: 0,
        stopAsync: async () => { sound.stopCalls++; },
        unloadAsync: async () => { sound.unloadCalls++; }, callback,
      };
      options.sounds.push(sound);
      if (soundGate) await soundGate.promise;
      return { sound };
    } } } },
  }, { fetch: fetchImpl });
  const states = [];
  service.subscribePlaybackState((playing, loading, voice, scope) => states.push({ playing, loading, voice, scope }));
  return { service, states, options, latest: () => states.at(-1) };
}

test('voice loading lasts through generation, WAV download and player setup', async () => {
  const response = deferred(), body = deferred(), player = deferred();
  const f = voiceFixture(() => response.promise, player);
  const task = f.service.playSpeech('Briefing', 'zio_italiano', 'briefing');
  await tick(); assert.equal(f.latest().loading, true); assert.equal(f.latest().scope, 'briefing');
  response.resolve({ ok: true, arrayBuffer: () => body.promise });
  await tick(); assert.equal(f.latest().loading, true);
  body.resolve(new Uint8Array([1, 2, 3]).buffer);
  await tick(); assert.equal(f.latest().loading, true); assert.equal(f.latest().playing, false);
  player.resolve(); await task;
  assert.equal(f.latest().loading, false); assert.equal(f.latest().playing, true);
  await f.service.stopAudio();
});

test('cancelling a pending voice prevents late audio and device fallback', async () => {
  const response = deferred();
  const f = voiceFixture(() => response.promise);
  const task = f.service.playSpeech('Old request', 'zio_italiano', 'briefing');
  await tick(); await f.service.stopAudio();
  response.resolve({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer });
  await task;
  assert.equal(f.latest().loading, false); assert.equal(f.latest().playing, false);
  assert.equal(f.options.sounds.length, 0); assert.equal(f.options.speech, null);
});

test('late callbacks from another voice cannot change the active feature state', async () => {
  const f = voiceFixture(async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }));
  await f.service.playSpeech('First voice', 'zio_italiano', 'briefing');
  const first = f.options.sounds[0];
  await f.service.playSpeech('Second voice', 'if_sara', 'water');
  first.callback({ isLoaded: true, didJustFinish: true });
  assert.equal(f.latest().scope, 'water'); assert.equal(f.latest().playing, true);
  assert.equal(f.latest().voice, 'if_sara');
  await f.service.stopAudio();
});

test('device fallback clears loading on actual start and resets on error', async () => {
  const f = voiceFixture(async () => { throw new Error('Offline'); });
  await f.service.playSpeech('Fallback', 'zio_italiano', 'preview');
  assert.equal(f.latest().loading, true);
  f.options.speech.onStart(); assert.equal(f.latest().loading, false); assert.equal(f.latest().playing, true);
  f.options.speech.onError(); assert.equal(f.latest().loading, false); assert.equal(f.latest().playing, false);
  await f.service.stopAudio();
});

test('an older delayed stop cannot unload the next voice player', async () => {
  const stopGate = deferred();
  let delayNextStop = false;
  const f = voiceFixture(
    async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }),
    null,
    async () => {
      if (delayNextStop) { delayNextStop = false; await stopGate.promise; }
    },
  );
  await f.service.playSpeech('First voice', 'zio_italiano', 'briefing');
  delayNextStop = true;
  const oldStop = f.service.stopAudio();
  await tick();
  await f.service.playSpeech('Second voice', 'if_sara', 'preview');
  const second = f.options.sounds[1];
  stopGate.resolve();
  await oldStop;
  assert.equal(second.stopCalls, 0);
  assert.equal(second.unloadCalls, 0);
  assert.equal(f.latest().scope, 'preview');
  assert.equal(f.latest().playing, true);
  await f.service.stopAudio();
});
