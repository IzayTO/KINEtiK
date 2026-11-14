// Match-local rewards. Events describe real hits, kills and objective actions.
export const CHAIN_SECONDS=6;
export class Accolades{
 constructor(match){this.match=match;this.reset();}
 reset(){this.chain=0;this.lastKill=-100;this.streak=0;this.lastKiller=null;this.multi=0;this.multiAt=-100;this.cooldowns=new Map();this.earned=[];}
 medal(id,title,detail,icon='cross',cooldown=0,priority=0){const time=this.match.time;if(time<(this.cooldowns.get(id)??-100))return;this.cooldowns.set(id,time+cooldown);const e={type:'medal',actor:0,id,title,detail,icon,priority};this.match.events.push(e);if(!this.earned.some(m=>m.id===id))this.earned.push({id,title,detail,icon});}
 hit(a,source,zone){if(source.human&&zone==='head')this.medal('headshot','HEADSHOT','Impacto en la cabeza','cross',.4);}
 death(a,source){if(a.human){this.chain=this.streak=this.multi=0;this.lastKill=-100;this.lastKiller=source.id;this.match.events.push({type:'chain-reset',actor:0});}}
 kill(a,source,weapon,options={}){if(!source.human||source===a||weapon==='atomic')return;const m=this.match,t=m.time;
  this.chain=t-this.lastKill<=CHAIN_SECONDS?this.chain+1:1;this.lastKill=t;this.streak++;if(this.chain>=3)m.events.push({type:'chain',actor:0,count:this.chain});
  if([5,10,15,20,30,40].includes(this.streak))this.medal('streak-'+this.streak,({5:'IMPARABLE',10:'SIN FRENO',15:'ARRASADOR',20:'¡POR VEINTE!',30:'FUERA DE SERIE',40:'MASA CRÍTICA'})[this.streak],this.streak+' bajas sin caer','rank',0,1);
  if(t-this.multiAt>1.2){this.multi=1;this.multiAt=t;}else this.multi++;
  if(this.multi>=2)this.medal('multi',this.multi===2?'DOBLE BAJA':this.multi===3?'TRIPLE BAJA':'BAJA MÚLTIPLE',this.multi+' en una ráfaga','burst',0,1);
  if(a.id===this.lastKiller){this.medal('revenge','REVANCHA','Cuenta saldada','cross',4);this.lastKiller=null;}
  if(weapon==='knife')this.medal('knife','A FILO','Sin gastar una bala','blade',2);
  if(source.body.sliding)this.medal('slide','RASANTE','Baja en deslizamiento','wing',2);
  else if(!source.body.grounded)this.medal('air','EN EL AIRE','Baja sin tocar suelo','wing',2);
  if(options.distance>=35&&['rifle','shotgun'].includes(weapon))this.medal('distance','LARGA DISTANCIA',Math.round(options.distance)+' metros','cross',3);
  if(source.health<=20)this.medal('survivor','AL LÍMITE','Con la vida justa','shield',6);
  if(['grenade','rocket','rc','airstrike'].includes(weapon))this.medal('blast','DEMOLICIÓN','Baja explosiva','burst',3);
 }
 objective(e){if(e.actor!==0)return;const def={capture:['ABANDERADO','Bandera asegurada','flag'],'zone-captured':['TERRITORIO','Zona bajo control','flag'],'zone-defended':['MURALLA','Posición defendida','shield'],'kill-confirmed':['SIN CABOS SUELTOS','Baja confirmada','star'],'kill-denied':['RESCATE','Estrella recuperada','star']};if(def[e.type])this.medal(e.type,...def[e.type],3);}
}
