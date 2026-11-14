// Local squad signals and one bounded three-bomb air-support operation.
import {clamp} from './physics.js';
import {floorAt,projectileTrace} from './ordnance.js';
import {obstruction} from './navigation.js';
export const AIRSTRIKE_KILLS=20;
export class Support{
 constructor(match){this.match=match;this.reset();}
 reset(){this.pings=[];this.serial=0;this.lastTap=-100;this.nextSquadPing=0;this.flight=null;this.bombs=Array.from({length:3},()=>({active:false}));}
 point(x,z){const l=this.match.level,b=l.bounds||{minX:-47,maxX:47,minZ:-47,maxZ:47};if(!Number.isFinite(x)||!Number.isFinite(z)||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return null;const p=floorAt(this.match.world,{x,y:80,z},120);return p?{x:p.x,y:p.y,z:p.z}:null;}
 ping(actor,point,danger=false){const m=this.match;if(!actor.alive||m.staging||!m.running||m.ended||(!actor.human&&m.enemy(m.player,actor)))return null;
  let p=this.pings.find(p=>p.actor===actor.id);if(!p){if(this.pings.length>=5){const index=this.pings.findIndex(p=>p.actor!==0);this.pings.splice(Math.max(0,index),1);}p={actor:actor.id};this.pings.push(p);}
  Object.assign(p,{id:++this.serial,name:actor.name,x:point.x,y:point.y,z:point.z,danger,start:m.time,end:m.time+(danger?7:10)});m.events.push({type:danger?'ping-danger':'ping',actor:actor.id,position:{...point}});return p;
 }
 playerPing(point,stamp=this.match.time){const danger=stamp-this.lastTap>=0&&stamp-this.lastTap<=.32;this.lastTap=stamp;return this.ping(this.match.player,point,danger);}
 botPing(b){const m=this.match;if(m.config.mode==='ffa'||m.enemy(m.player,b)||!b.target||m.time<b.recognizedAt||m.time<this.nextSquadPing||m.time<(b.nextReport||0))return;
  // Called only after this decision's real visual observation; this is a snapshot, never a tracker.
  if(!b.memory?.confirmed||m.time-b.lastSeen>.12)return;const t=b.target.body;this.ping(b,{x:t.x,y:t.y+t.height+.2,z:t.z},true);b.nextReport=m.time+14;this.nextSquadPing=m.time+5;
 }
 available(a=this.match.player){const m=this.match;return !!(!m.nuclear?.restricted&&a.alive&&a.airCharges>0&&m.running&&!m.ended&&!m.staging&&!m.remote.engaged&&!this.flight);}
 deploy(points){const m=this.match,a=m.player;if(!this.available(a)||points.length!==3)return false;const targets=points.map(p=>this.point(p.x,p.z));if(targets.some(p=>!p))return false;
  m.nuclear?.recordUse('airstrike',a);a.airCharges--;const cx=targets.reduce((s,p)=>s+p.x,0)/3,cz=targets.reduce((s,p)=>s+p.z,0)/3,sign=(++this.serial%2)?1:-1,span=Math.max(m.level.width||96,m.level.depth||96)+65;
  this.flight={born:m.time,cx,cz,sign,span,duration:12,next:0,targets,owner:a,x:cx-span*.707,y:68,z:cz-sign*span*.707,previousX:cx-span*.707,previousZ:cz-sign*span*.707,vx:span*1.414/12,vz:sign*span*1.414/12};
  a.spawnUntil=Math.min(a.spawnUntil,m.time);m.events.push({type:'airstrike-called',actor:a.id});return true;
 }
 impact(b){const m=this.match,o={x:b.x,y:b.y+.12,z:b.z},area=m.ordnance.areas.find(z=>!z.active)||m.ordnance.areas.filter(z=>['rocket','airstrike'].includes(z.kind)&&m.time-z.start>5).sort((a,b)=>a.start-b.start)[0];
  if(area){const f=floorAt(m.world,{x:b.x,y:b.y+.3,z:b.z},20);Object.assign(area,{active:true,id:++m.ordnance.serial,kind:'airstrike',owner:b.owner,x:b.x,y:f?.y??b.y,z:b.z,impact:{x:b.x,y:b.y,z:b.z},floor:f?.c,start:m.time,seed:b.id*2.399,nextDamage:Infinity,nextSound:Infinity});}
  for(const a of m.actors){if(!a.alive||!m.enemy(b.owner,a))continue;const p=a.body,q={x:p.x,y:p.y+Math.min(1.35,p.height*.75),z:p.z},d=Math.hypot(q.x-o.x,q.z-o.z,Math.max(0,Math.abs(p.y-o.y)-.3));if(d>25||obstruction(m.world.colliders,o,q)<.999)continue;m.damage(a,d<=20+1e-9?1000:180*(25-d)/5,b.owner,'airstrike',{position:o});}
  m.events.push({type:'airstrike-impact',actor:b.owner.id,position:o});b.active=false;
 }
 step(dt){const m=this.match;for(let i=this.pings.length-1;i>=0;i--)if(m.time>=this.pings[i].end)this.pings.splice(i,1);const f=this.flight;if(!f)return;const age=m.time-f.born,t=clamp(age/f.duration,0,1);f.previousX=f.x;f.previousZ=f.z;f.x=f.cx+(t*2-1)*f.span*.707;f.z=f.cz+f.sign*(t*2-1)*f.span*.707;
  while(f.next<3&&age>=4.6+f.next*.45){const i=f.next++,b=this.bombs[i],target=f.targets[i],duration=2.8+i*.12;Object.assign(b,{active:true,id:++this.serial,owner:f.owner,start:m.time,duration,target,origin:{x:f.x,y:f.y-1,z:f.z},x:f.x,y:f.y-1,z:f.z,previous:{x:f.x,y:f.y-1,z:f.z}});}
  for(const b of this.bombs){if(!b.active)continue;Object.assign(b.previous,{x:b.x,y:b.y,z:b.z});const u=clamp((m.time-b.start)/b.duration,0,1),end={x:b.origin.x+(b.target.x-b.origin.x)*u,y:b.origin.y+(b.target.y-b.origin.y)*u*u,z:b.origin.z+(b.target.z-b.origin.z)*u},hit=projectileTrace(m.world,b,end,.10);
   if(hit){const k=Math.max(0,hit.fraction-.001);b.x+=(end.x-b.x)*k;b.y+=(end.y-b.y)*k;b.z+=(end.z-b.z)*k;this.impact(b);}else{Object.assign(b,end);if(u>=1)this.impact(b);}
  }
  if(age>=f.duration&&!this.bombs.some(b=>b.active))this.flight=null;
 }
}
