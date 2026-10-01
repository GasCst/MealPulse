const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function load(file, imports = {}, globals = {}) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { exports, setTimeout, clearTimeout, require(name) {
    if (name in imports) return imports[name];
    throw new Error(`Unexpected import ${name}`);
  }, ...globals });
  return exports;
}
const images = load('services/foodImageSources.ts');
const base = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/';
const photo = (lang, size = 200) => `${base}front_${lang}.467.${size}.jpg`;

test('selected front photo follows the app language; flat URLs remain fallbacks', () => {
  const urls = images.readOffProductImages({ selected_images: { front: { small: { it: photo('it'), en: photo('en') }, display: { it: photo('it', 400) } }, nutrition: { small: { it: `${base}nutrition_it.1.200.jpg` } } }, image_front_small_url: photo('en') }, 'it-IT');
  assert.equal(urls[0], photo('it'));
  assert.equal(urls[1], photo('it', 400));
  assert.ok(urls.includes(photo('en')));
  assert.ok(urls.every(url => !url.includes('nutrition')));
});
test('invalid preferred URLs do not hide valid alternatives; legacy HTTP links use HTTPS', () => {
  const urls = images.readOffProductImages({ image_front_small_url: { invalid: true }, image_front_url: '   ', image_small_url: `http:${photo('it').slice(6)}`, image_url: photo('it') }, 'it');
  assert.deepEqual(Array.from(urls), [photo('it')]);
  assert.equal(images.normalizeFoodImageUrl('//images.openfoodfacts.org/images/products/photo.jpg'), 'https://images.openfoodfacts.org/images/products/photo.jpg');
  for (const value of [null, '', {}, 'javascript:alert(1)', '/relative.jpg']) assert.equal(images.normalizeFoodImageUrl(value), undefined);
});
test('URL-less search records use declared front revision and available sizes only', () => {
  const urls = images.readOffProductImages({ code: '3017620422003', images: { front_it: { rev: '467', sizes: { 200: {}, 400: {} } }, nutrition_it: { rev: 999, sizes: { 200: {} } }, '1': { sizes: { 200: {} } } } }, 'it');
  assert.deepEqual(Array.from(urls), [photo('it'), photo('it', 400)]);
  assert.deepEqual(Array.from(images.readOffProductImages({ code: '3017620422003', images: { front_it: { sizes: { 200: {} } } } }, 'it')), []);
  assert.ok(images.readOffProductImages({ code: '12345678', images: { front_en: { rev: '3', sizes: { 200: {} } } } }, 'en')[0].includes('/000/001/234/5678/front_en.3.200.jpg'));
});
test('localized front metadata takes priority over the default-language flat URL', () => {
  const urls = images.readOffProductImages({ code: '3017620422003', image_front_small_url: photo('en'), images: { front_it: { rev: '467', sizes: { 200: {}, 400: {} } } } }, 'it');
  assert.equal(urls[0], photo('it'));
  assert.ok(urls.includes(photo('en')));
});
test('saved-meal fallbacks retain the same photo, are deduplicated and bounded', () => {
  assert.deepEqual(Array.from(images.foodImageCandidates(photo('it'))), [photo('it'), photo('it', 400), photo('it', 100)]);
  assert.equal(images.foodImageCandidates(photo('it'), [photo('it'), photo('en'), photo('fr'), photo('es'), photo('de')]).length, 4);
  assert.deepEqual(Array.from(images.foodImageCandidates('file:///private/meal.jpg')), ['file:///private/meal.jpg']);
  assert.deepEqual(Array.from(images.foodImageCandidates('blob:http://localhost/meal')), ['blob:http://localhost/meal']);
  assert.deepEqual(Array.from(images.foodImageCandidates('data:image/jpeg;base64,ABC')), ['data:image/jpeg;base64,ABC']);
  assert.equal(images.readOffProductImages({ image_url: 'file:///private/meal.jpg' }, 'en').length, 0);
});

// Exercise the actual component handlers with independent hook state for each child.
function renderer() {
  let host;
  const timers = new Map(); let nextTimer = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: 'Fragment',
    useState(initial) { const h = host, i = h.cursor++; if (!(i in h.slots)) h.slots[i] = initial; return [h.slots[i], value => { h.slots[i] = typeof value === 'function' ? value(h.slots[i]) : value; }]; },
    useRef(value) { const h = host, i = h.cursor++; if (!(i in h.slots)) h.slots[i] = { current: value }; return h.slots[i]; },
    useEffect(fn, deps) { const h = host, i = h.cursor++; if (!(i in h.slots) || deps.some((dep, j) => dep !== h.slots[i].deps[j])) { h.slots[i]?.cleanup?.(); h.slots[i] = { deps, cleanup: fn() }; } },
  };
  const component = load('components/FoodThumbnail.tsx', {
    react, 'react-native': { View: 'View', Text: 'Text', ActivityIndicator: 'Loading', StyleSheet: { create: v => v, absoluteFillObject: {} } },
    'expo-image': { Image: 'Image' }, '@expo/vector-icons': { Ionicons: 'Icon' }, './ui/FeedbackPressable': { TouchableOpacity: 'Button' },
    '@/context/ThemeContext': { useTheme: () => ({ colors: { cardBg: '#fff', coral: '#f64', textSecondary: '#444' } }) },
    '@/context/LanguageContext': { useLanguage: () => ({ t: () => 'Retry' }) }, '@/services/foodImageSources': images,
  }, { setTimeout: fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id) });
  const createHost = (type, props) => ({ type, props, slots: [], cursor: 0 });
  const render = h => { host = h; h.cursor = 0; return h.type(h.props); };
  const unmount = h => { for (const slot of h.slots) slot?.cleanup?.(); };
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return;
    if (predicate(node)) return node;
    for (const child of node.props?.children?.flat(Infinity) || []) { const found = find(child, predicate); if (found) return found; }
  }
  const first = component.FoodThumbnail({ uri: photo('it'), alternatives: [photo('en')], name: 'Test food', emoji: '🍫', style: { width: 40, height: 40 } });
  const parent = createHost(first.type, first.props);
  const attemptNode = () => find(render(parent), node => typeof node.type === 'function');
  return { createHost, render, unmount, find, parent, attemptNode, timers, component };
}
test('failed image advances once; old child callbacks cannot corrupt the next photo', () => {
  const r = renderer(), n = r.attemptNode(), child = r.createHost(n.type, n.props);
  const image = r.find(r.render(child), node => node.type === 'Image');
  assert.ok(r.find(r.render(child), node => node.type === 'Loading'));
  image.props.onError(); image.props.onError();
  assert.equal(r.attemptNode().props.uri, photo('en'));
  r.unmount(child); image.props.onLoad(); image.props.onError();
  assert.equal(r.attemptNode().props.uri, photo('en'));
  const next = r.attemptNode(), loaded = r.createHost(next.type, next.props);
  r.find(r.render(loaded), node => node.type === 'Image').props.onLoad();
  assert.equal(r.find(r.render(loaded), node => node.type === 'Loading'), undefined);
  for (const fn of r.timers.values()) fn();
  assert.equal(r.attemptNode().props.uri, photo('en'));
});
test('hung image requests advance; exhaustion shows retry, and retry starts a fresh request', () => {
  const r = renderer();
  let firstKey;
  for (let i = 0; i < r.parent.props.urls.length; i++) {
    const n = r.attemptNode(); firstKey ??= n.props.key;
    const child = r.createHost(n.type, n.props); r.render(child);
    Array.from(r.timers.values()).at(-1)(); r.unmount(child);
  }
  const retry = r.find(r.render(r.parent), node => node.type === 'Button');
  assert.ok(retry); let stopped = false;
  retry.props.onPress({ stopPropagation() { stopped = true; } });
  assert.ok(stopped);
  assert.equal(r.attemptNode().props.uri, photo('it'));
  assert.notEqual(r.attemptNode().props.key, firstKey);
  const nextFood = r.component.FoodThumbnail({ uri: photo('fr'), name: 'Another food', style: {} });
  assert.notEqual(nextFood.props.key, JSON.stringify(r.parent.props.urls));
});
