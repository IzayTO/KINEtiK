// Fictional match-ending operation; fixed-step state machine, independent of rendering.
import {clamp,BODY} from './physics.js';
import {floorAt,projectileTrace} from './ordnance.js';
export const ATOMIC_KILLS=41,ALARM_SECONDS=20,FADE_SECONDS=2,ATOMIC_PULSES=5;
export const ATOMIC_DEATHS=['DEMASIADO URANIO-235','SE ROMPIÓ TU ENLACE','FISIÓN: FIN DE SESIÓN','TU DOSIS SUPERÓ EL LÍMITE','QUEDASTE FUERA DEL ESPECTRO','LA REACCIÓN FUE EN CADENA','TU SEÑAL SE DESINTEGRÓ','NÚCLEO INESTABLE'];
export class Nuclear{
 constructor(match){this.match=match;this.reset();}
 reset(){this.used=new Set();this.unlocked=false;this.state='idle';this.started=0;this.impactAt=null;this.pulses=0;this.roared=false;this.origin={x:0,y:0,z:0};this.bomb=null;this.roster=[];this.deathLine=ATOMIC_DEATHS[Math.floor(Math.random()*ATOMIC_DEATHS.length)];}
 get active(){return this.state!=='idle'&&this.state!=='done';}
 get age(){return this.match.time-this.started;}
 get restricted(){return this.active&&this.age>=ALARM_SECONDS;}
 get impacted(){return this.impactAt!==null&&this.state!=='done';}
 get impactAge(){return this.impactAt===null?-1:this.match.time-this.impactAt;}
 get available(){const m=this.match;return this.unlocked&&!this.active&&this.state==='idle'&&m.running&&!m.ended&&!m.staging&&m.player.alive&&!m.remote.engaged;}
 recordUse(kind,actor){if(actor?.human){this.used.add(kind);this.checkUnlock();}}
 checkUnlock(){if(this.unlocked||this.match.player.kills<ATOMIC_KILLS||!['rc','airstrike','rocket'].every(k=>this.used.has(k)))return;this.unlocked=true;this.match.events.push({type:'atomic-earned',actor:0});this.match.awards?.medal('atomic-ready','REACCIÓN LISTA','Operación atómica disponible','atom',0,3);}
 activate(){if(!this.available)return false;const m=this.match;this.state='alarm';this.started=m.time;const b=m.level.bounds||{minX:-48,maxX:48,minZ:-48,maxZ:48},x=(b.minX+b.maxX)/2,z=(b.minZ+b.maxZ)/2,f=floorAt(m.world,{x,y:100,z},150);this.origin={x,y:f?.y??0,z};m.events.push({type:'atomic-alarm',actor:0});m.awards.medal('village','MATASTE A UN PUEBLO','Arrojaste una bomba atómica','atom',0,4);return true;}
 filterInput(sample){if(!this.restricted)return sample;sample.actions=[];sample.fire=sample.fireStart=sample.aim=sample.jump=sample.slide=sample.crouch=false;sample.fireRelease=null;if(this.impacted)sample.x=sample.z=0;return sample;}
 disarm(a){a.throwAction=null;a.held=null;a.poison=null;a.burnUntil=0;a.arsenal.reload=null;a.arsenal.attack=null;a.body.sliding=false;this.match.supplies.cancel(a);}
 blackout(){const m=this.match;this.state='fade';for(const a of m.actors){if(!a.alive)m.spawn(a);this.disarm(a);}m.remote.reset();m.support.flight=null;for(const b of m.support.bombs)b.active=false;for(const p of m.ordnance.projectiles)p.active=false;m.events.push({type:'atomic-blackout',actor:0});}
 impact(point){const m=this.match;this.origin={...point};this.impactAt=m.time;this.state='fallout';this.bomb.active=false;
  this.roster=m.actors.map(a=>{if(!a.alive)m.spawn(a);this.disarm(a);a.shield=0;a.atomicDown=true;a.body.vx=a.body.vz=0;a.body.height=BODY.slide;a.spawnUntil=0;return{actor:a,health:a.health};});
  m.events.push({type:'atomic-impact',actor:0,position:{...point}});
 }
 pulse(){const m=this.match,index=++this.pulses;for(const {actor:a,health}of this.roster){a.health=index===ATOMIC_PULSES?0:health<10?health:health*(ATOMIC_PULSES-index)/ATOMIC_PULSES;a.lastDamage=m.time;a.hit=.25;
   if(index===ATOMIC_PULSES){a.alive=false;a.deaths++;a.deathTime=m.time;a.deadUntil=Infinity;a.carrying=null;if(a!==m.player&&m.enemy(m.player,a))m.player.kills++;}}
  m.events.push({type:'atomic-pulse',actor:0,index});if(index===ATOMIC_PULSES){this.state='aftermath';m.events.push({type:'atomic-death',actor:0,line:this.deathLine});}
 }
 settle(dt){for(const {actor:a}of this.roster){const p=a.body;p.previous.x=p.x;p.previous.y=p.y;p.previous.z=p.z;p.vx=p.vz=0;p.vy-=this.match.params.gravity*dt;p.move(dt);}}
 step(dt){if(!this.active)return;const m=this.match,age=this.age;
  if(this.state==='alarm'&&age>=ALARM_SECONDS)this.blackout();
  if(this.state==='fade'&&age>=ALARM_SECONDS+FADE_SECONDS)this.state='flight';
  if(this.state==='flight'&&age>=24){if(!this.bomb)this.bomb={active:true,x:this.origin.x,y:this.origin.y+65,z:this.origin.z,previous:{x:this.origin.x,y:this.origin.y+65,z:this.origin.z}};
   const p=this.bomb;Object.assign(p.previous,{x:p.x,y:p.y,z:p.z});const end={x:this.origin.x,y:this.origin.y+65-9*(age-24)**2,z:this.origin.z},hit=projectileTrace(m.world,p,end,.25);
   if(hit||end.y<=this.origin.y+.08){const t=hit?clamp(hit.fraction,0,1):1;this.impact({x:p.x+(end.x-p.x)*t,y:p.y+(end.y-p.y)*t,z:p.z+(end.z-p.z)*t});}else Object.assign(p,end);
  }
  if(this.impacted){this.settle(dt);const t=this.impactAge;if(t>=.35&&!this.roared){this.roared=true;m.events.push({type:'atomic-roar',actor:0});}
   // The main report lasts 2 s. Shield is already gone; health starts afterwards.
   while(this.pulses<ATOMIC_PULSES&&t+1e-8>=2+this.pulses)this.pulse();
   if(t>=9.2){this.state='done';m.finish({reason:'atomic',winner:m.config.mode==='ffa'||m.config.mode==='training'?m.player.name:m.player.team==='blue'?'AZUL':'ROJO'});}
  }
 }
}
