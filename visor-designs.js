// Zero is off. An active pixel is its 24-bit RGB value plus one, so black is editable too.
export const COLS = 22, ROWS = 8, CELLS = COLS * ROWS, BOTS = 20;
export const ORIGINAL_GREEN = 0x78f9d7 + 1;
const KEY = 'kinetik-led-visors-v1';
export const slotName = id => id === 0 ? 'Mi visor' : 'BOT ' + String(id).padStart(2, '0');
export const colorCode = value => '#' + (value - 1).toString(16).padStart(6, '0');
export const sameDesign = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export function template(name = 'original', ink = ORIGINAL_GREEN) {
  const pixels = new Uint32Array(CELLS);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const side = Math.min(x, COLS - 1 - x);
      const lit = name === 'eyes' ? (side >= 2 && side <= 7 && (y === 3 && side >= 4 || y === 4 && side < 4))
        : name === 'bars' ? side > 0 && side < 10 && side % 2 && y >= 1 + side % 3 && y <= 6
        : y >= 2 && y <= 5;
      if (lit) pixels[y * COLS + x] = name === 'original' ? ORIGINAL_GREEN : ink;
    }
  }
  return pixels;
}
const original = template();
const fresh = () => Array.from({length: BOTS + 1}, () => original.slice());
function checkSlot(id) {
  if (!Number.isInteger(id) || id < 0 || id > BOTS) throw new Error('Personaje desconocido.');
}
function checkDesign(pixels) {
  if (pixels.length !== CELLS || !pixels.every(v => Number.isInteger(v) && v >= 0 && v <= 0x1000000))
    throw new Error('Diseño de visor inválido.');
}

export function encodeVisors(slots) {
  const palette = [], lookup = new Map(), designs = {};
  slots.forEach((pixels, slot) => {
    if (sameDesign(pixels, original)) return;
    designs[slot] = Array.from(pixels, value => {
      if (!value) return 0;
      if (!lookup.has(value)) { palette.push(colorCode(value)); lookup.set(value, palette.length); }
      return lookup.get(value);
    });
  });
  return {format: 'kinetik-visores', version: 1, columns: COLS, rows: ROWS, palette, designs};
}

export function decodeVisors(text) {
  const invalid = () => { throw new Error('Archivo de visores incompatible o incompleto.'); };
  if (typeof text !== 'string' || text.length > 131072) invalid();
  const data = JSON.parse(text);
  if (!data || data.format !== 'kinetik-visores' || data.version !== 1 || data.columns !== COLS || data.rows !== ROWS ||
      !Array.isArray(data.palette) || data.palette.length > CELLS * (BOTS + 1) ||
      !data.designs || typeof data.designs !== 'object' || Array.isArray(data.designs)) invalid();
  const colors = [0];
  for (const hex of data.palette) {
    if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) invalid();
    colors.push(parseInt(hex.slice(1), 16) + 1);
  }
  const slots = fresh();
  for (const [key, design] of Object.entries(data.designs)) {
    const id = Number(key);
    if (String(id) !== key || !Number.isInteger(id) || id < 0 || id > BOTS ||
        !Array.isArray(design) || design.length !== CELLS ||
        !design.every(v => Number.isInteger(v) && v >= 0 && v < colors.length)) invalid();
    slots[id] = Uint32Array.from(design, i => colors[i]);
  }
  return slots;
}

export class VisorLibrary {
  constructor(storage) {
    this.slots = fresh();
    this.listeners = new Set();
    this.lastSaved = true;
    try {
      this.storage = storage === undefined ? globalThis.localStorage : storage;
      const cached = this.storage?.getItem(KEY);
      if (cached) this.slots = decodeVisors(cached);
    } catch { this.lastSaved = false; }
  }
  get(id) { checkSlot(id); return this.slots[id].slice(); }
  set(id, pixels) {
    checkSlot(id); checkDesign(pixels);
    if (sameDesign(this.slots[id], pixels)) return;
    this.slots[id] = Uint32Array.from(pixels);
    this.save();
    this.listeners.forEach(fn => fn(id, this.slots[id]));
  }
  save() {
    try { this.storage.setItem(KEY, this.export()); return this.lastSaved = true; }
    catch { return this.lastSaved = false; }
  }
  export() { return JSON.stringify(encodeVisors(this.slots)); }
  import(text) {
    const next = decodeVisors(text);
    const previous = this.slots;
    this.slots = next;
    this.save();
    next.forEach((p, i) => { if (!sameDesign(p, previous[i])) this.listeners.forEach(fn => fn(i, p)); });
  }
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

export class DesignHistory {
  constructor() { this.past = []; this.future = []; }
  remember(previous) {
    this.past.push(previous.slice());
    if (this.past.length > 32) this.past.shift();
    this.future.length = 0;
  }
  undo(current) {
    if (!this.past.length) return current;
    this.future.push(current.slice());
    return this.past.pop();
  }
  redo(current) {
    if (!this.future.length) return current;
    this.past.push(current.slice());
    return this.future.pop();
  }
}
export const visors = new VisorLibrary();
