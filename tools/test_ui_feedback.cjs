const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const crypto = require('node:crypto');
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
    react, 'react-native': native, '@/services/buttonSoundService': { buttonSoundService: { play: () => { taps++; } } },
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

test('wrappers forward the chosen category and native switches distinguish on from off', () => {
  const played = [];
  const react = { forwardRef: render => render, useCallback: fn => fn, createElement: (type, props) => ({ type, props }) };
  const native = Object.fromEntries(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TouchableWithoutFeedback', 'Switch'].map(name => [name, name]));
  const controls = load('components/ui/FeedbackPressable.tsx', {
    react, 'react-native': native,
    '@/services/buttonSoundService': { buttonSoundService: { play: kind => played.push(kind) } },
  });
  const save = controls.TouchableOpacity({ onPress() {}, sound: 'confirm' }, null);
  save.props.onPress({});
  assert.equal(save.props.sound, undefined);
  const toggle = controls.Switch({ onValueChange() {} }, null);
  toggle.props.onValueChange(true); toggle.props.onValueChange(false);
  controls.Switch({ onValueChange() {}, disabled: true }, null).props.onValueChange(true);
  assert.deepEqual(played, ['confirm', 'toggle-on', 'toggle-off']);
});

function soundFixture({ preference = null, gate = null } = {}) {
  let clock = 1000;
  const saved = { value: preference };
  const players = [];
  const assets = Object.fromEntries(fs.readdirSync(path.join(root, 'assets/sounds')).filter(name => name.endsWith('.wav')).map(name => [`@/assets/sounds/${name}`, name]));
  const { buttonSoundService: service, BUTTON_SOUNDS } = load('services/buttonSoundService.ts', {
    '@react-native-async-storage/async-storage': { getItem: async () => saved.value, setItem: async (_, value) => { saved.value = value; } },
    'react-native': { Platform: { OS: 'android' } },
    'expo-av': { Audio: { Sound: { createAsync: async (asset, options) => {
      assert.equal(options.shouldPlay, false);
      const sound = {
        asset, options, plays: [], stops: 0, unloads: 0,
        replayAsync: async (config) => { sound.plays.push(config); },
        stopAsync: async () => { sound.stops++; },
        unloadAsync: async () => { sound.unloads++; },
      };
      players.push(sound);
      if (gate) await gate.promise;
      return { sound };
    } } } },
    ...assets,
  }, { Date: class extends Date { static now() { return clock; } } });
  return { service, BUTTON_SOUNDS, players, saved, advance: () => { clock += 70; } };
}

test('distinct action sounds preload once, throttle rapid taps and stop overlapping UI cues', async () => {
  const f = soundFixture();
  await Promise.all([f.service.initialize(), f.service.initialize()]);
  assert.equal(f.players.length, Object.keys(f.BUTTON_SOUNDS).length);
  const increment = f.players.find(p => p.asset === 'increment.wav');
  const confirm = f.players.find(p => p.asset === 'confirm.wav');
  f.service.play('increment'); f.service.play('increment');
  assert.equal(increment.plays.length, 1);
  f.advance(); f.service.play('confirm');
  assert.equal(confirm.plays.length, 1);
  assert.equal(increment.stops, 1);
  assert.ok(increment.plays[0].volume < confirm.plays[0].volume);
  await f.service.setEnabled(false);
  f.advance(); f.service.play('confirm');
  assert.equal(confirm.plays.length, 1);
  assert.equal(f.saved.value, 'false');
  await f.service.release();
  assert.ok(f.players.every(p => p.unloads === 1));
});

test('saved mute skips loading, and enabling restores all sound categories', async () => {
  const f = soundFixture({ preference: 'false' });
  await f.service.initialize();
  assert.equal(f.players.length, 0);
  f.service.play('voice');
  await tick(); assert.equal(f.players.length, 0);
  await f.service.setEnabled(true);
  assert.equal(f.saved.value, 'true');
  assert.equal(f.players.length, Object.keys(f.BUTTON_SOUNDS).length);
  f.service.play('voice');
  assert.equal(f.players.find(p => p.asset === 'voice.wav').plays.length, 1);
  await f.service.release();
});

test('releasing during preload prevents delayed cues and unloads pending players', async () => {
  const gate = deferred();
  const f = soundFixture({ gate });
  const initializing = f.service.initialize();
  f.service.play('confirm');
  await tick();
  await f.service.release();
  gate.resolve();
  await initializing; await tick();
  assert.ok(f.players.every(p => p.unloads === 1 && p.plays.length === 0));
});

test('all cue assets are distinct short PCM waves without clipping', () => {
  const files = fs.readdirSync(path.join(root, 'assets/sounds')).filter(name => name.endsWith('.wav'));
  const hashes = new Set();
  assert.equal(files.length, 16);
  for (const file of files) {
    const data = fs.readFileSync(path.join(root, 'assets/sounds', file));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WAVE');
    assert.equal(data.readUInt16LE(20), 1); // PCM
    assert.equal(data.readUInt16LE(22), 1); // Mono
    assert.equal(data.readUInt32LE(24), 44100);
    assert.equal(data.readUInt16LE(34), 16);
    const samples = data.readUInt32LE(40) / 2;
    assert.ok(samples / 44100 <= 0.35);
    assert.equal(data.readInt16LE(44), 0);
    assert.ok(Math.abs(data.readInt16LE(44 + (samples - 1) * 2)) < 10);
    for (let i = 0; i < samples; i++) assert.ok(Math.abs(data.readInt16LE(44 + i * 2)) < 20000);
    hashes.add(crypto.createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(hashes.size, files.length);
});

function buttonAttributes(file) {
  const ast = ts.createSourceFile(file, fs.readFileSync(path.join(root, file), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const buttons = [];
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ['TouchableOpacity','Pressable','TouchableHighlight','TouchableWithoutFeedback','ActionTile'].includes(node.tagName.getText(ast))) {
      const props = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(prop => [prop.name.getText(ast), prop.initializer?.getText(ast)]));
      if (props.onPress) buttons.push(props);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); return buttons;
}

test('each app-owned action declares its cue independently of translated button labels', () => {
  function walk(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (file.endsWith('.tsx') && !file.endsWith('FeedbackPressable.tsx')) {
        for (const button of buttonAttributes(file)) assert.ok(button.sound, `Missing action sound: ${file} ${button.onPress}`);
      }
    }
  }
  walk('app'); walk('components');
  const portions = buttonAttributes('components/FoodQuantityModal.tsx');
  assert.equal(portions.find(b => b.onPress.includes('handleStep(-1)')).sound, '"decrement"');
  assert.equal(portions.find(b => b.onPress.includes('handleStep(1)')).sound, '"increment"');
  assert.equal(portions.find(b => b.onPress === '{handleConfirm}').sound, '"confirm"');
  const meals = buttonAttributes('components/MealCategoryDetailModal.tsx');
  assert.equal(meals.find(b => b.style.includes('styles.doneBtn')).sound, '"complete"');
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
