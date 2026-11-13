// Portable, versioned settings. Only recognized, correctly typed values are applied.
import {DEFAULTS,clamp} from './physics.js';
import {V2_DEFAULTS,loadPreferences} from './preferences.js';
import {HUD_ITEMS} from './hud.js';
import {MATCH_DEFAULTS,DIFFICULTY} from './match.js';
const copy=x=>JSON.parse(JSON.stringify(x));
export function configurationSnapshot(params,preferences,hud,match){return{application:'KINETIK',formatVersion:1,createdAt:new Date().toISOString(),settings:copy(params),preferences:copy(preferences),hud:copy(hud),match:copy(match)};}
export function parseConfiguration(raw,current,ranges){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.application!=='KINETIK')throw new Error('Este archivo no es una configuración de KINETIK.');
 if(!Number.isFinite(raw.formatVersion)||raw.formatVersion<1)throw new Error('Formato de configuración no compatible.');
 const result=copy(current),settings=raw.settings||raw.params||{},prefs=raw.preferences||{};
 for(const [key,,min,max]of ranges)if(Number.isFinite(settings[key]))result.settings[key]=clamp(settings[key],min,max);
 for(const key of Object.keys(DEFAULTS))if(typeof DEFAULTS[key]==='boolean'&&typeof settings[key]==='boolean')result.settings[key]=settings[key];
 for(const key of Object.keys(V2_DEFAULTS))if(typeof prefs[key]===typeof V2_DEFAULTS[key]&&(typeof prefs[key]!=='number'||Number.isFinite(prefs[key])))result.preferences[key]=prefs[key];
 result.preferences=loadPreferences({getItem:()=>JSON.stringify(result.preferences)});
 const allowed=new Set(HUD_ITEMS.map(i=>i[0]));for(const mode of ['landscape','portrait']){const incoming=raw.hud?.[mode]||raw.hud?.layouts?.[mode];if(!incoming||typeof incoming!=='object')continue;result.hud[mode]||={};for(const [id,v]of Object.entries(incoming)){if(!allowed.has(id)||!v||typeof v!=='object')continue;const base=result.hud[mode][id]||{x:.5,y:.5,scale:1,opacity:1},safe={...base};for(const [k,min,max]of [['x',0,1],['y',0,1],['scale',.55,1.6],['opacity',0,1]])if(Number.isFinite(v[k]))safe[k]=clamp(v[k],min,max);result.hud[mode][id]=safe;}}
 const source=raw.match||{},enums={map:['nodo09','airport'],mode:['training','ffa','tdm','ctf','domination'],team:['red','blue'],difficulty:Object.keys(DIFFICULTY),quality:['adaptive','low','high'],environment:['day','night']};
 for(const [key,list]of Object.entries(enums))if(list.includes(source[key]))result.match[key]=source[key];
 for(const [key,min,max]of [['bots',1,20],['minutes',0,120],['limit',1,500],['captureLimit',1,30],['dominationLimit',50,1000],['crateSeconds',15,60]])if(Number.isFinite(source[key]))result.match[key]=clamp(Math.round(source[key]),min,max);
 result.match={...MATCH_DEFAULTS,...result.match};return result;
}
export function downloadConfiguration(data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='KINETIK_AJUSTES_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
