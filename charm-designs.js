import {BOTS,sameDesign} from './visor-designs.js';

export const COLS=24, ROWS=10, CELLS=COLS*ROWS;
// 0 is an opaque unlit LED. RGB colours occupy 1 through 0x1000000.
export const CUTOUT=0x1000001;
export const CHARMS=Object.freeze({
 knife:'FILO',rifle:'K-09 · Rifle',shotgun:'S-07 · Escopeta',pistol:'P-12 · Pistola',
 sniper:'L-04 · Francotirador',grenade:'Granada',molotov:'Molotov',gas:'N-09 · Gas',
 antidote:'Antídoto',rocket:'R-12 · Lanzador'
});
export const WEAPON_KEYS=Object.keys(CHARMS);
export const MAX_JSON=1024*1024;
const KEY='kinetik-charms-v1', kinds=WEAPON_KEYS.length;
// Reserve room in a portable backup for every actor's loadout, even with full RGB designs.
const MAX_PRESETS=192;
const accents=[0x8cd9be,0x6fddca,0xf5b566,0x73cffa,0xbb9afa,0xb3e373,0xff895a,0xd9e769,0x5fe8db,0xe8a675];
function designKey(actor,weapon){
 const index=WEAPON_KEYS.indexOf(weapon);
 if(!Number.isInteger(actor)||actor<0||actor>BOTS||index<0)throw Error('Arma o personaje desconocido.');
 return actor*kinds+index;
}
function validatePixels(pixels){
 if(!(Array.isArray(pixels)||pixels instanceof Uint32Array)||pixels.length!==CELLS)throw Error('Cada diseño debe contener 240 LED.');
 for(const value of pixels)if(!Number.isInteger(value)||value<0||value>CUTOUT)throw Error('El diseño contiene un color LED inválido.');
 return Uint32Array.from(pixels);
}
const originals=accents.map((accent,index)=>{
 const pixels=new Uint32Array(CELLS);
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  const mid=Math.abs((x+index*2)%12-6);
  const line=Math.abs(y-(2+mid))<1.2;
  pixels[y*COLS+x]=1+(line?accent:(x+y+index)%9<2?0x233a42:0x152931);
 }
 return pixels;
});
export function defaultCharm(weapon){return originals[designKey(0,weapon)].slice();}
export class CharmLibrary{
 constructor(storage){
  this.designs=new Map();this.presets=new Map();this.listeners=new Set();this.lastSaved=true;
  try{this.storage=storage===undefined?globalThis.localStorage:storage;const data=this.storage?.getItem(KEY);if(data)Object.assign(this,this.decode(data));}catch{this.lastSaved=false;}
 }
 get(actor,weapon){const key=designKey(actor,weapon);return (this.designs.get(key)||originals[key%kinds]).slice();}
 subscribe(fn){this.listeners.add(fn);return ()=>this.listeners.delete(fn);}
 apply(actors,weapon,pixels){
  const keys=Array.from(new Set(actors),actor=>designKey(actor,weapon));
  if(!keys.length)throw Error('Selecciona al menos un personaje.');
  const design=validatePixels(pixels);
  for(const key of keys){
   if(sameDesign(design,originals[key%kinds]))this.designs.delete(key);else this.designs.set(key,design);
  }
  const saved=this.save();for(const fn of this.listeners)fn(keys);return saved;
 }
 savePreset(name,pixels){
  name=name.trim();
  if(!name||name.length>64)throw Error('Escribe un nombre de hasta 64 caracteres.');
  if(!this.presets.has(name)&&this.presets.size>=MAX_PRESETS)throw Error('La colección está llena. Puedes exportar un diseño y quitarlo para liberar espacio.');
  this.presets.set(name,validatePixels(pixels));
  return this.save();
 }
 getPreset(name){return this.presets.get(name)?.slice();}
 removePreset(name){this.presets.delete(name);return this.save();}
 save(){try{this.storage.setItem(KEY,this.export());return this.lastSaved=true;}catch{return this.lastSaved=false;}}
 export(){
  return JSON.stringify({format:'kinetik-llaveros',version:1,columns:COLS,rows:ROWS,
   designs:Array.from(this.designs,([key,pixels])=>({actor:Math.floor(key/kinds),weapon:WEAPON_KEYS[key%kinds],pixels:Array.from(pixels)})),
   presets:Array.from(this.presets,([name,pixels])=>({name,pixels:Array.from(pixels)}))});
 }
 decode(text){
  if(typeof text!=='string'||text.length>MAX_JSON)throw Error('El archivo de llaveros es demasiado grande.');
  const data=JSON.parse(text);
  if(data?.format!=='kinetik-llaveros'||data.version!==1||data.columns!==COLS||data.rows!==ROWS||
     !Array.isArray(data.designs)||data.designs.length>(BOTS+1)*kinds)throw Error('Se esperaba un archivo de llaveros KINEtiK de 24 × 10.');
  const result=new Map();
  for(const entry of data.designs){
   const key=designKey(entry?.actor,entry?.weapon);
   if(result.has(key))throw Error('Dos diseños usan la misma arma y personaje.');
   result.set(key,validatePixels(entry.pixels));
  }
  const presets=new Map();
  if(data.presets!==undefined&&(!Array.isArray(data.presets)||data.presets.length>MAX_PRESETS))throw Error('La colección de diseños es inválida.');
  for(const item of data.presets??[]){
   const name=item?.name;
   if(typeof name!=='string'||!name.trim()||name!==name.trim()||name.length>64||presets.has(name))throw Error('Nombre de diseño inválido o duplicado.');
   presets.set(name,validatePixels(item.pixels));
  }
  return {designs:result,presets};
 }
 import(text){Object.assign(this,this.decode(text));const saved=this.save();for(const fn of this.listeners)fn(null);return saved;}
}
export const charms=new CharmLibrary();

export function floodCharm(pixels,x,y,color,mirror=false){
 const visit=(sx,sy)=>{
  const start=sy*COLS+sx,old=pixels[start];if(old===color)return;
  const queue=[start];pixels[start]=color;
  const push=i=>{if(pixels[i]===old){pixels[i]=color;queue.push(i);}};
  while(queue.length){
   const i=queue.pop(),col=i%COLS;
   if(col)push(i-1);if(col<COLS-1)push(i+1);
   if(i>=COLS)push(i-COLS);if(i<CELLS-COLS)push(i+COLS);
  }
 };
 visit(x,y);if(mirror)visit(COLS-1-x,y);
}
export function encodeCharm(pixels){
 return JSON.stringify({format:'kinetik-llavero',version:1,columns:COLS,rows:ROWS,pixels:Array.from(validatePixels(pixels))});
}
export function decodeCharm(data){
 if(data?.format!=='kinetik-llavero'||data.version!==1||data.columns!==COLS||data.rows!==ROWS)throw Error('El diseño debe ser un llavero KINEtiK de 24 × 10.');
 return validatePixels(data.pixels);
}
