import {clamp} from './physics.js';
import {angleDelta,obstruction} from './navigation.js';
const DEG=Math.PI/180;
export class AimSupport{
 constructor(match,preferences){this.match=match;this.preferences=preferences;this.reset();}
 reset(){this.target=null;this.scanAt=0;this.manualAt=-100;this.manualX=0;this.manualY=0;this.fireId=null;this.fireSince=0;}
 manual(dx,dy){if(Math.hypot(dx,dy)>1e-7){this.manualAt=this.match.time;this.manualX=dx;this.manualY=dy;}}
 targetInfo(actor,origin,yaw,pitch){const m=this.match,p=this.preferences;if(!actor?.alive||!m.enemy(m.player,actor)||m.time<actor.spawnUntil)return null;const b=actor.body,point={x:b.x,y:b.y+b.height*.70,z:b.z},x=point.x-origin.x,y=point.y-origin.y,z=point.z-origin.z,d=Math.hypot(x,y,z);if(d>p.assistRange)return null;
  const ty=Math.atan2(-x,-z),horizontal=Math.hypot(x,z);
  let tp=Math.atan2(y,horizontal);
  // A narrow optic must not pull an aimed headshot down to the chest.
  // Keep the current elevation anywhere between the waist and helmet.
  const scoped=m.player.arsenal.weapon.id==='sniper';
  if(scoped)tp=clamp(pitch,Math.atan2(b.y+b.height*.48-origin.y,horizontal),Math.atan2(b.y+b.height-origin.y,horizontal));
  const error=Math.hypot(angleDelta(yaw,ty),tp-pitch);
  const bodyRadius=Math.atan2(.48,d);
  const radius=scoped?Math.min(p.assistRadius*DEG,bodyRadius):Math.max(p.assistRadius*DEG,Math.min(18*DEG,bodyRadius));
  if(error>radius||obstruction(m.world.colliders,origin,point)<.999)return null;
  return{id:actor.id,yaw:ty,pitch:tp,distance:d,visible:true,error,radius};
 }
 track(dt,origin,yaw,pitch,ads,allowed){const m=this.match,p=this.preferences;if(!ads||!allowed||!p.assist||p.assistStrength<=0||!m.player.alive||m.player.consuming||m.player.opening||(p.assistTracking===false&&m.time-this.manualAt>.28)){this.target=null;this.scanAt=0;return[yaw,pitch];}
  let info=this.targetInfo(this.target,origin,yaw,pitch);
  if(!info&&m.time>=this.scanAt){this.scanAt=m.time+.025;this.target=null;let best=null;for(const b of m.bots){const t=this.targetInfo(b,origin,yaw,pitch);if(t&&(!best||t.error<best.error)){best=t;this.target=b;}}info=best;}
  if(!info)return[yaw,pitch];const ex=angleDelta(yaw,info.yaw),ey=info.pitch-pitch,weight=.45+.55*Math.pow(Math.max(0,1-info.error/Math.max(1e-6,info.radius)),.6),strength=p.assistStrength;
  const gain=1-Math.exp(-30*strength*weight*dt),limit=(50+85*strength)*DEG*dt;
  // Continuous ADS follow is optional. A recent deliberate pull away still wins.
  const manual=m.time-this.manualAt<.10;
  const x=manual&&ex*this.manualX<0&&Math.abs(this.manualX)>.003?0:clamp(ex*gain,-limit,limit);
  const y=manual&&ey*this.manualY<0&&Math.abs(this.manualY)>.003?0:clamp(ey*gain,-limit,limit);
  return[yaw+x,clamp(pitch+y,-1.48,1.48)];
 }
 autoTarget(origin,direction,ads){const m=this.match,a=m.player;if(!this.preferences.autoFire||!ads||!a.alive||a.arsenal.selected===0||a.arsenal.reload||a.consuming||a.opening||a.arsenal.time<a.arsenal.switchUntil){this.fireId=null;return null;}
  const hit=m.lineTarget(a,origin,direction,a.arsenal.weapon.range??110),b=hit?.actor;
  if(!b||!m.enemy(a,b)||!b.alive||m.time<b.spawnUntil){this.fireId=null;return null;}
  if(this.fireId!==b.id){this.fireId=b.id;this.fireSince=m.time;}
  // No extra reaction timer: the actual ray and the weapon cadence are authoritative.
  return b;
 }
}
