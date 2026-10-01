const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const languages = ['it', 'en', 'es', 'fr', 'de', 'zh', 'ja'];
const voice = { id: 'zio_italiano', name: 'Zio Napoletano', styleTag: 'Zio', personality: 'Caldo', cadence: 'Napoletana' };
const base = { dateKey: '2026-10-01', targetCalories: 2000, eatenCalories: 0, burnedCalories: 0, proteinLeft: 140, includeBurnedInBudget: true };

function load(file, imports, globals = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.React, esModuleInterop: true },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, console: { log() {}, warn() {} }, process: { env: {} }, setTimeout, clearTimeout,
    AbortController, Uint8Array, Date, fetch: async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }),
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    require(name) { if (name in imports) return imports[name]; throw new Error(`Unexpected import ${name}`); },
    ...globals,
  });
  return exports;
}

function fixture() {
  const storage = new Map();
  const httpRequests = [];
  const asyncStorage = { getItem: async key => storage.get(key) || null, setItem: async (key, value) => { storage.set(key, value); } };
  const styles = load('services/voiceTextStyle.ts', {
    '@react-native-async-storage/async-storage': asyncStorage,
    '@/constants/translations': { SUPPORTED_LANGUAGES: languages.map(code => ({ code })) },
  });
  const context = load('services/briefingContext.ts', { '@/services/voiceTextStyle': styles });
  const { voiceCoachService: service } = load('services/voiceCoachService.ts', {
    '@react-native-async-storage/async-storage': asyncStorage,
    'react-native': { Platform: { OS: 'android' } },
    'expo-constants': { expoConfig: {} },
    'expo-speech': { stop: async () => {}, speak() {} },
    'expo-file-system/legacy': { cacheDirectory: '/cache/', EncodingType: { Base64: 'base64' }, writeAsStringAsync: async () => {} },
    '@/services/remoteConfigService': { getDynamicTtsApiUrl: async () => 'http://mac:8000' },
    '@/services/voiceTextStyle': styles, '@/services/briefingContext': context,
    'expo-av': { Audio: { setAudioModeAsync: async () => {}, Sound: { createAsync: async () => ({ sound: {
      playAsync: async () => {}, stopAsync: async () => {}, unloadAsync: async () => {},
    } }) } } },
  }, { fetch: async (_url, options) => {
    httpRequests.push(JSON.parse(options.body));
    return { ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer };
  } });
  const prompts = [];
  service.callGeminiQuick = async prompt => { prompts.push(prompt); return null; };
  return { service, storage, styles, context, prompts, httpRequests };
}

test('a meal changes the spoken remaining calories without changing the daily target', async () => {
  const f = fixture();
  const before = await f.service.getMorningBriefing(base, voice, 'en');
  const after = await f.service.getMorningBriefing({ ...base, eatenCalories: 650, proteinLeft: 90 }, voice, 'en');
  assert.match(before, /2000 calories/);
  assert.match(after, /650 calories eaten/); assert.match(after, /1350 calories/); assert.match(after, /90 grams/);
  assert.notEqual(before, after); assert.equal(f.prompts.length, 2);
});

test('walking burn updates both the narrated activity and the remaining budget', async () => {
  const f = fixture();
  const text = await f.service.getMorningBriefing({ ...base, eatenCalories: 650, burnedCalories: 200, proteinLeft: 90 }, voice, 'en');
  assert.match(text, /200 burned/); assert.match(text, /1550 calories/);
});

test('disabling activity in the budget still reports burn without adding it to remaining calories', async () => {
  const f = fixture();
  const text = await f.service.getMorningBriefing({ ...base, eatenCalories: 650, burnedCalories: 200, includeBurnedInBudget: false }, voice, 'en');
  assert.match(text, /200 burned/); assert.match(text, /1350 calories/); assert.doesNotMatch(text, /1550/);
});

test('zero remaining calories and protein remain zero after targets are reached', async () => {
  const f = fixture();
  const text = await f.service.getMorningBriefing({ ...base, eatenCalories: 2200, proteinLeft: 0 }, voice, 'en');
  assert.match(text, /0 calories and 0 grams/); assert.doesNotMatch(text, /140 grams/);
});

test('cache follows date, food, activity, protein, activity setting, voice and language', async () => {
  const f = fixture();
  const initial = await f.service.getMorningBriefing(base, voice, 'en');
  assert.equal(await f.service.getMorningBriefing({ ...base }, voice, 'en'), initial);
  assert.equal(f.prompts.length, 1);
  for (const change of [
    { dateKey: '2026-09-30' }, { targetCalories: 2100 }, { eatenCalories: 100 },
    { burnedCalories: 50 }, { proteinLeft: 120 }, { includeBurnedInBudget: false },
  ]) await f.service.getMorningBriefing({ ...base, ...change }, voice, 'en');
  await f.service.getMorningBriefing(base, { ...voice, id: 'if_sara' }, 'en');
  await f.service.getMorningBriefing(base, voice, 'it');
  assert.equal(f.prompts.length, 9);
  assert.equal([...f.storage.keys()].filter(key => key.includes('morning_briefing')).length, 1);
});

test('overlapping preview and play requests share the same text generation', async () => {
  const f = fixture(), gate = deferred();
  let calls = 0;
  f.service.callGeminiQuick = async () => { calls++; await gate.promise; return 'Keep going!'; };
  const first = f.service.getMorningBriefing(base, voice, 'en');
  const second = f.service.getMorningBriefing({ ...base }, voice, 'en');
  await tick(); assert.equal(calls, 1); gate.resolve();
  assert.equal(await first, await second);
});

test('Neapolitan wording and all seven languages preserve the latest numeric facts', async () => {
  const f = fixture();
  for (const language of languages) {
    const text = await f.service.getMorningBriefing({ ...base, eatenCalories: 650, burnedCalories: 200, proteinLeft: 90 }, voice, language);
    for (const value of ['650', '200', '1550', '90']) assert.ok(text.includes(value), `${language}: missing ${value}`);
    if (language === 'it') assert.match(text, /cu 'o movimento.*Te restano/);
  }
});

test('AI encouragement cannot replace nutrition facts with invented calorie amounts', async () => {
  const f = fixture();
  f.service.callGeminiQuick = async () => 'You have 9999 calories remaining!';
  const text = await f.service.getMorningBriefing({ ...base, eatenCalories: 650 }, voice, 'en');
  assert.match(text, /1350 calories/); assert.doesNotMatch(text, /9999/);
});

test('cancelling a stale briefing leaves another feature playing', async () => {
  const f = fixture();
  await f.service.playSpeech('Water encouragement', voice.id, 'water');
  const states = [];
  f.service.subscribePlaybackState((playing, loading, id, scope) => states.push({ playing, loading, id, scope }));
  await f.service.stopAudio('briefing');
  assert.equal(states.at(-1).scope, 'water'); assert.equal(states.at(-1).playing, true);
  await f.service.stopAudio('water'); assert.equal(states.at(-1).playing, false);
});

test('briefing playback sends the selected language even before the saved preference catches up', async () => {
  const f = fixture();
  f.storage.set('@mealpulse_language_v2', 'it');
  await f.service.playSpeech('Today: 650 calories eaten.', voice.id, 'briefing', 'en');
  assert.equal(f.httpRequests.at(-1).language, 'en');
  await f.service.stopAudio();
});

test('the homepage supplies the briefing with the same meal, activity and budget values as the ring', () => {
  const ast = ts.createSourceFile('index.tsx', fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const props = {};
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && ['MorningBriefingCard', 'CalorieProgressRing'].includes(node.tagName.getText(ast))) {
      props[node.tagName.getText(ast)] = Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute)
        .map(attribute => [attribute.name.getText(ast), attribute.initializer?.getText(ast)]));
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const name of ['targetCalories', 'eatenCalories', 'burnedCalories', 'includeBurnedInBudget', 'proteinLeft']) {
    assert.ok(props.MorningBriefingCard[name], `Briefing is missing ${name}`);
    assert.equal(props.MorningBriefingCard[name], props.CalorieProgressRing[name]);
  }
  assert.equal(props.MorningBriefingCard.dateKey, '{selectedDateKey}');
});

// Render the actual card with deterministic hooks so prop/voice/language changes
// and asynchronous responses can be exercised without a phone or a React test package.
function cardFixture() {
  const f = fixture();
  const slots = [];
  let cursor = 0, dirty = false, tree, props = { ...base }, language = 'en', voiceListener;
  const pending = [], requests = [], plays = [], stops = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    createElement: (type, attributes, ...children) => ({ type, props: { ...attributes, children } }),
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { value: initial };
      return [slots[i].value, value => {
        const next = typeof value === 'function' ? value(slots[i].value) : value;
        if (!Object.is(next, slots[i].value)) { slots[i].value = next; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useMemo(factory, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { value: factory(), deps };
      return slots[i].value;
    },
    useEffect(effect, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) { pending.push({ i, effect, old: slots[i]?.cleanup }); slots[i] = { deps }; }
    },
  };
  const animation = () => ({ start() {}, stop() {} });
  const service = {
    subscribePreferredVoice(cb) { voiceListener = cb; cb(voice); return () => {}; },
    getMorningBriefing(snapshot, selectedVoice, selectedLanguage) {
      const key = f.context.briefingContextKey(snapshot, selectedVoice.id, selectedLanguage);
      let record = requests.find(r => r.key === key);
      if (!record) { record = { key, snapshot, voice: selectedVoice, language: selectedLanguage, ...deferred() }; requests.push(record); }
      return record.promise;
    },
    playSpeech: async (text, id, scope) => { plays.push({ text, id, scope }); },
    stopAudio: async scope => { stops.push(scope); },
  };
  const { MorningBriefingCard: Card } = load('components/MorningBriefingCard.tsx', {
    react,
    'react-native': { View: 'View', Text: 'Text', ActivityIndicator: 'Spinner', Platform: { OS: 'web' }, StyleSheet: { create: x => x },
      Animated: { Value: class {}, View: 'AnimatedView', parallel: animation, timing: animation, loop: animation, sequence: animation } },
    '@/components/ui/FeedbackPressable': { TouchableOpacity: 'Button' },
    '@expo/vector-icons': { Ionicons: 'Icon' }, 'expo-haptics': {},
    'react-native-reanimated': { default: { View: 'AnimatedView' }, FadeInDown: { duration: () => ({}) } },
    '@/context/ThemeContext': { useTheme: () => ({ colors: {}, isDarkMode: false }) },
    '@/context/SubscriptionContext': { useSubscription: () => ({ isPro: true, openPaywall() {} }) },
    '@/context/LanguageContext': { useLanguage: () => ({ language, t: key => key }) },
    '@/hooks/useVoiceAction': { useVoiceAction: () => ({ isPlaying: false, isLoading: false, run: action => action() }) },
    '@/services/voiceCoachService': { voiceCoachService: service, DEFAULT_COACH_VOICE: voice },
    '@/services/briefingContext': f.context,
    './VoiceFeatureAdModal': { VoiceFeatureAdModal: 'AdModal' },
  });
  function render(changes = {}) {
    props = { ...props, ...changes };
    do {
      dirty = false; cursor = 0; tree = Card(props);
      for (const task of pending.splice(0)) { task.old?.(); slots[task.i].cleanup = task.effect(); }
    } while (dirty);
    return tree;
  }
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...(node.props?.children || []).flat(Infinity).flatMap(nodes)];
  }
  return { render, requests, plays, stops,
    subtitle: () => nodes(tree).find(node => node.type === 'Text' && node.props.numberOfLines)?.props.children.join(''),
    pressPlay: () => nodes(tree).find(node => node.type === 'Button' && node.props.accessibilityLabel === 'voice_listen').props.onPress(),
    language: value => { language = value; render(); },
    voice: value => { voiceListener(value); render(); },
  };
}

test('the card refreshes on meal/activity changes with the same selected voice', async () => {
  const f = cardFixture(); f.render();
  f.requests[0].resolve('Old 2000 calorie briefing'); await tick(); f.render();
  assert.match(f.subtitle(), /Old 2000/);
  f.render({ eatenCalories: 650, burnedCalories: 200, proteinLeft: 90 });
  assert.doesNotMatch(f.subtitle(), /Old 2000/); assert.match(f.subtitle(), /1550/);
  f.requests.at(-1).resolve('Updated 1550 calorie briefing'); await tick(); f.render();
  assert.match(f.subtitle(), /Updated 1550/); assert.ok(f.stops.includes('briefing'));
});

test('an older delayed response cannot overwrite or play after a meal is logged', async () => {
  const f = cardFixture(); f.render();
  const play = f.pressPlay();
  f.render({ eatenCalories: 650, burnedCalories: 200 });
  f.requests[0].resolve('Old 2000 calorie briefing'); await tick(); f.render();
  assert.doesNotMatch(f.subtitle(), /Old 2000/); assert.equal(f.plays.length, 0);
  f.requests.at(-1).resolve('Current 1550 calorie briefing'); await play; f.render();
  assert.equal(f.plays.length, 1); assert.equal(f.plays[0].text, 'Current 1550 calorie briefing');
});

test('voice and language changes invalidate the displayed briefing', async () => {
  const f = cardFixture(); f.render();
  f.requests[0].resolve('English briefing'); await tick(); f.render();
  f.language('it'); assert.doesNotMatch(f.subtitle(), /English briefing/);
  assert.match(f.subtitle(), /cu 'o movimento/);
  f.voice({ ...voice, id: 'if_sara', name: 'Sara' });
  assert.equal(f.requests.at(-1).voice.id, 'if_sara'); assert.equal(f.requests.at(-1).language, 'it');
  assert.doesNotMatch(f.subtitle(), /cu 'o movimento/);
});
