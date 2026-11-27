// Display names never expose the internal personality. Stable within a match.
export const BOT_TAGS=Object.freeze([
 'ZeroRush','Nox.exe','RastroNegro','VOID_7','BalaPerdida','LowPing','Karma404',
 'DobleFilo','SinRetorno','NieblaX','RushGris','UltimoTick','MalaRacha','GhostMode',
 'FueraDeRango','CeroTestigos','Backfire','NightShift','TiltControl','RecoilKid',
 'PixelMuerto','NoScopeMX','Ruptura','BlackEcho','Clutch_9','LagMental',
 'Ceniza','FaseCero','SinCheckpoint','AfterKill','Muteado','HardReset',
 'Sombra21','Vanta','Overpeek','R3LOAD','RayoSeco','OffAngle','MalTiming','PuntoCiego',
 'Nico.wav','DaniR_7','AlexSinPing','ValeFPS','Leo.MX'
]);
export function botNames(count,random=Math.random){
 const pool=[...BOT_TAGS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,count);
}

// A callsign stays with its numbered visor across rematches and map changes.
function loadCallsigns(){
 const key='kinetik-bot-callsigns-v1';
 let storage;
 try{
  storage=globalThis.localStorage;
  const list=JSON.parse(storage?.getItem(key)||'null');
  if(Array.isArray(list)&&list.length===20&&new Set(list).size===20&&list.every(name=>BOT_TAGS.includes(name)))return list;
 }catch{}
 const list=botNames(20);
 try{storage?.setItem(key,JSON.stringify(list));}catch{}
 return list;
}
const callsigns=loadCallsigns();
export const botName=id=>callsigns[id-1];
let previousAllies=new Set();

export function drawAllies(botCount,random=Math.random){
 const slots=Array.from({length:botCount},(_,i)=>i+1);
 // The slider counts bots. The local player takes one of the ten team places.
 const count=Math.min(9,Math.floor(botCount/2));
 for(let i=0;i<count;i++){
  const j=i+Math.floor(random()*(slots.length-i));
  [slots[i],slots[j]]=[slots[j],slots[i]];
 }
 if(count&&previousAllies.size===count&&slots.slice(0,count).every(id=>previousAllies.has(id))){
  const ally=Math.floor(random()*count);
  const opponent=count+Math.floor(random()*(slots.length-count));
  [slots[ally],slots[opponent]]=[slots[opponent],slots[ally]];
 }
 previousAllies=new Set(slots.slice(0,count));
 return previousAllies;
}
