// A local kill-streak vehicle. Reuses the existing swept cylinder collision resolver.
// Player movement parameters and the player controller are not changed.
import {Player,clamp} from './physics.js';
import {obstruction,distance} from './navigation.js';
export const RC_LIFETIME=20,RC_KILL_RADIUS=2.5,RC_DAMAGE_RADIUS=4;
export class RemoteCar{
 constructor(match){this.match=match;this.body=new Player(match.world,match.params);this.reset();}
 reset(){this.state='idle';this.born=0;this.until=0;this.command={};this.reason='';this.savedYaw=0;this.savedPitch=0;this.yaw=0;this.pitch=0;}
 get engaged(){return this.state!=='idle';}
 get active(){return this.state==='drive';}
 deploy(yaw,pitch){const m=this.match,a=m.player,p=a.body;if(this.engaged||!a.alive||!a.rcCharges||a.throwAction||!p.grounded||!m.running||m.ended)return false;
  let spot=null;for(const angle of [0,.65,-.65,1.25,-1.25,Math.PI]){const x=p.x-Math.sin(yaw+angle)*.9,z=p.z-Math.cos(yaw+angle)*.9,f=m.world.support(x,p.y,z,.25,.6);if(f&&m.world.clear(x,f.y,z,.36)&&obstruction(m.world.colliders,{x:p.x,y:p.y+.25,z:p.z},{x,y:f.y+.25,z})>.999){spot={x,y:f.y,z};break;}}
  if(!spot)return false;a.rcCharges--;m.supplies.cancel(a);a.arsenal.reload=null;a.held=null;a.spawnUntil=Math.min(a.spawnUntil,m.time);this.body.reset(spot);this.body.height=.36;this.savedYaw=a.yaw;this.savedPitch=a.pitch;p.vx=p.vz=0;p.sliding=false;this.yaw=yaw;this.pitch=-.06;this.born=m.time;this.state='drive';this.command={};this.nextMotor=m.time;this.reason='ENLACE ESTABLE';m.events.push({type:'rc-start',actor:0,position:spot});return true;
 }
 control(input){const c=this.command;c.x=input.x;c.z=input.z;c.sprint=input.sprint;c.jump=input.jump;c.fireStart=input.fireStart;this.yaw=input.yaw;this.pitch=clamp(input.pitch,-.85,.8);}
 stop(reason='SEÑAL PERDIDA'){if(!this.active)return;this.state='lost';this.until=this.match.time+1.1;this.reason=reason;this.body.vx=this.body.vy=this.body.vz=0;this.command={};Object.assign(this.body.previous,{x:this.body.x,y:this.body.y,z:this.body.z});this.match.events.push({type:'rc-lost',actor:0});}
 explode(){if(!this.active)return;const m=this.match,p=this.body,o={x:p.x,y:p.y+.24,z:p.z};
  // Reserve an existing short-lived explosion slot; no unbounded FX allocation.
  let z=m.ordnance.areas.find(a=>!a.active)||m.ordnance.areas.find(a=>a.kind==='rc'||a.kind==='grenade');if(z)Object.assign(z,{active:true,id:++m.ordnance.serial,kind:'rc',owner:m.player,...o,start:m.time,seed:m.time*2.399});
  for(const a of m.actors){if(!a.alive||!m.enemy(m.player,a))continue;const target={x:a.body.x,y:a.body.y+Math.min(1,a.body.height*.6),z:a.body.z},d=Math.hypot(p.x-a.body.x,p.z-a.body.z,Math.max(0,Math.abs(p.y-a.body.y)-.3));if(d>RC_DAMAGE_RADIUS||obstruction(m.world.colliders,o,target)<.999)continue;const amount=d<=RC_KILL_RADIUS?1000:160*(RC_DAMAGE_RADIUS-d)/(RC_DAMAGE_RADIUS-RC_KILL_RADIUS);m.damage(a,amount,m.player,'rc',{position:o});}
  m.events.push({type:'explosion',actor:0,position:o});m.sounds.push({id:0,team:m.player.team,...o,radius:36,kind:'explosion',expires:m.time+.7,stamp:m.time});this.stop();
 }
 step(dt){const m=this.match;if(this.state==='lost'){if(m.time>=this.until){this.state='idle';m.events.push({type:'rc-end',actor:0});}return;}if(!this.active)return;
  if(!m.player.alive){this.stop('OPERADOR DESCONECTADO');return;}const age=m.time-this.born;if(age>=RC_LIFETIME){this.explode();return;}
  const p=this.body,c=this.command;p.previous.x=p.x;p.previous.y=p.y;p.previous.z=p.z;
  if(age>.42&&c.fireStart){this.explode();return;}
  let x=age>.42?(c.x||0):0,z=age>.42?(c.z||0):0;const mag=Math.hypot(x,z);if(mag>1){x/=mag;z/=mag;}const speed=c.sprint?11.5:6.8,wx=x*Math.cos(this.yaw)+z*Math.sin(this.yaw),wz=-x*Math.sin(this.yaw)+z*Math.cos(this.yaw),response=p.grounded?34:11;
  p.vx+=clamp(wx*speed-p.vx,-response*dt,response*dt);p.vz+=clamp(wz*speed-p.vz,-response*dt,response*dt);
  if(age>.42&&c.jump&&p.grounded&&m.world.clear(p.x,p.y+.05,p.z,p.height)){p.vy=5.4;p.grounded=false;}p.vy-=24*dt;
  const n=Math.max(1,Math.ceil(Math.max(p.speed,Math.abs(p.vy))*dt/.10));for(let i=0;i<n;i++)p.move(dt/n);
  if(p.y< -5||!Number.isFinite(p.x+p.y+p.z)){this.stop();return;}
  if(age>.42)for(const a of m.actors){if(!a.alive||!m.enemy(m.player,a)||m.time<a.spawnUntil||distance(p,a.body)>.76||Math.abs(p.y-a.body.y)>1.05)continue;const o={x:p.x,y:p.y+.24,z:p.z},t={x:a.body.x,y:a.body.y+.5,z:a.body.z};if(obstruction(m.world.colliders,o,t)>.999){this.explode();break;}}
  if(p.speed>.4&&m.time>=this.nextMotor){this.nextMotor=m.time+.30;m.events.push({type:'rc-engine',actor:0,position:{x:p.x,y:p.y,z:p.z}});}
  // Edge inputs are consumed once even if a simulation step runs without fresh input.
  c.fireStart=false;c.jump=false;
 }
}
