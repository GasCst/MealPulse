/** Product photos only: never substitute an ingredient list, label or another food. */
export function normalizeFoodImageUrl(value: unknown, allowLocal = false): string | undefined {
  if (typeof value !== 'string') return undefined;
  let uri = value.trim();
  if (allowLocal && (/^(file|content|blob):/i.test(uri) || /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(uri))) return uri;
  if (uri.startsWith('//')) uri = `https:${uri}`;
  if (!/^https?:\/\/[^/\s]+\//i.test(uri) || /[\u0000-\u001f]/.test(uri)) return undefined;
  // OFF has returned HTTP links in older records; Android releases require HTTPS.
  uri = uri.replace(/^http:\/\/((?:images|static|world|[a-z]{2})\.openfoodfacts\.org)(?=\/)/i, 'https://$1');
  return uri;
}

export function readOffProductImages(product: any, language: string): string[] {
  const urls: string[] = [];
  const add = (value: unknown) => {
    const uri = normalizeFoodImageUrl(value);
    if (uri && !urls.includes(uri)) urls.push(uri);
  };
  const lang = (language || 'en').toLowerCase().slice(0, 2);
  const front = product?.selected_images?.front;
  const addLanguage = (code: string) => {
    for (const size of ['small', 'display', 'thumb']) add(front?.[size]?.[code]);
  };
  addLanguage(lang);
  for (const field of ['image_front_small_url', 'image_front_url', 'image_front_thumb_url', 'image_small_url', 'image_url', 'image_thumb_url']) add(product?.[field]);
  for (const code of new Set([product?.lang, 'en', ...Object.keys(front?.small || {}), ...Object.keys(front?.display || {})])) {
    if (typeof code === 'string' && code !== lang) addLanguage(code);
  }

  // Some search records contain the selected image metadata without URL fields.
  // Build only revisions and sizes actually present in the record (OFF image API).
  const barcode = String(product?.code || '');
  if (/^\d{8,14}$/.test(barcode)) {
    const padded = barcode.padStart(13, '0');
    const folder = padded.replace(/^(...)(...)(...)(.*)$/, '$1/$2/$3/$4');
    const images = product?.images || {};
    const keys = [...new Set([`front_${lang}`, 'front', `front_${product?.lang}`, 'front_en', ...Object.keys(images).filter(key => /^front_[a-z]{2}$/.test(key))])];
    for (const key of keys) {
      const image = images[key];
      if (!image || !/^\d+$/.test(String(image.rev))) continue;
      for (const size of ['200', '400', '100']) {
        if (image.sizes?.[size]) add(`https://images.openfoodfacts.org/images/products/${folder}/${key}.${image.rev}.${size}.jpg`);
      }
    }
  }
  const localizedFront = new RegExp(`/front_${lang}\\.\\d+\\.(100|200|400)\\.jpg$`, 'i');
  return [...urls.filter(uri => localizedFront.test(uri)), ...urls.filter(uri => !localizedFront.test(uri))];
}

/** Older saved meals only retain one URL. Retry sizes of that same OFF photo. */
export function foodImageCandidates(uri?: string, alternatives: readonly string[] = []): string[] {
  const urls: string[] = [];
  for (const value of [uri, ...alternatives]) {
    const clean = normalizeFoodImageUrl(value, true);
    if (clean && !urls.includes(clean)) urls.push(clean);
  }
  const primary = urls[0];
  if (primary && /^https:\/\/images\.openfoodfacts\.org\/images\/products\/.*\/front(?:_[a-z]{2})?\.\d+\.(100|200|400)\.jpg$/i.test(primary)) {
    for (const size of ['400', '100', '200']) {
      const fallback = primary.replace(/\.(100|200|400)\.jpg$/i, `.${size}.jpg`);
      if (!urls.includes(fallback)) urls.push(fallback);
    }
  }
  return urls.slice(0, 4);
}
