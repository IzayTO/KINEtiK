import {clamp,circleContact,surfaceY} from './physics.js';
import {obstruction,distance,angleDelta} from './navigation.js';
export const THROWABLES=Object.freeze({grenade:{name:'GRANADA',count:3,radius:7},molotov:{name:'MOLOTOV',count:3,radius:11.5},gas:{name:'GAS N-09',count:2,radius:2.5},rocket:{name:'R-12 / LANZACOHETES',count:0,radius:20}});
export const PROJECTILE_LIMIT=48,AREA_LIMIT=64,GAS_ACTIVE=10,GAS_FADE=1;
// Shared by prediction, actual throws and the bots' ballistic aiming.
export const THROW_SPEED=36,THROW_LIFT=6.5,THROW_LIFETIME=10,TRAJECTORY_POINTS=256;
const pos=a=>({x:a.body.x,y:a.body.y+Math.min(1.35,a.body.height*.75),z:a.body.z});
export function floorAt(world,p,down=15){let best=null;for(const c of world.query(p.x,p.z,.02)){if(!circleContact(c,p.x,p.z,.001)?.inside)continue;const y=surfaceY(c,p.x,p.z);if(y<=p.y+.12&&y>=p.y-down&&(!best||y>best.y))best={x:p.x,y,z:p.z,c};}return best;}
// Swept radius against existing convex solids; no changes to character physics.
export function projectileTrace(world,a,b,r=.075){let fraction=1,solid=null,point=null;const list=world.query((a.x+b.x)*.5,(a.z+b.z)*.5,Math.hypot(b.x-a.x,b.z-a.z)*.5+r);
 for(const [x,y,z]of [[0,0,0],[r,0,0],[-r,0,0],[0,r,0],[0,-r,0],[0,0,r],[0,0,-r]]){const o={x:a.x+x,y:a.y+y,z:a.z+z},e={x:b.x+x,y:b.y+y,z:b.z+z};for(const c of list){const t=obstruction([c],o,e);if(t<fraction){fraction=t;solid=c;point={x:o.x+(e.x-o.x)*t,y:o.y+(e.y-o.y)*t,z:o.z+(e.z-o.z)*t};}}}
 if(!solid)return null;const c=solid,p=point;let gap=Math.abs(surfaceY(c,p.x,p.z)-p.y),normal={x:-c.slopeX,y:1,z:-c.slopeZ};const bottom=Math.abs(p.y-c.bottom);if(bottom<gap){gap=bottom;normal={x:0,y:-1,z:0};}
 for(let i=0;i<c.poly.length;i++){const u=c.poly[i],v=c.poly[(i+1)%c.poly.length],dx=v[0]-u[0],dz=v[1]-u[1],len=Math.hypot(dx,dz),d=Math.abs(dx*(p.z-u[1])-dz*(p.x-u[0]))/len;if(d<gap){gap=d;normal={x:dz/len,y:0,z:-dx/len};}}
 const length=Math.hypot(normal.x,normal.y,normal.z);normal.x/=length;normal.y/=length;normal.z/=length;return{fraction,normal,solid};
}
export function launchState(a,yaw,pitch){const o=pos(a),cp=Math.cos(pitch);return{x:o.x,y:o.y+.08,z:o.z,vx:-Math.sin(yaw)*cp*THROW_SPEED,vy:Math.sin(pitch)*THROW_SPEED+THROW_LIFT,vz:-Math.cos(yaw)*cp*THROW_SPEED};}
export function advanceProjectile(world,p,dt,gravity=24){const end={x:p.x+p.vx*dt,y:p.y+p.vy*dt-.5*gravity*dt*dt,z:p.z+p.vz*dt},hit=projectileTrace(world,p,end);p.vy-=gravity*dt;if(hit){const t=Math.max(0,hit.fraction-.002);p.x+=(end.x-p.x)*t;p.y+=(end.y-p.y)*t;p.z+=(end.z-p.z)*t;return hit;}Object.assign(p,end);return null;}
// Swept parabolic segments: the preview is refreshed every rendered frame. Dots
// are spaced in metres instead of time, so the arc does not thin out at high speed.
export function trajectory(world,a,yaw,pitch,gravity=24,frequency=30){
 const p=launchState(a,yaw,pitch),points=[{x:p.x,y:p.y,z:p.z}],dt=1/clamp(frequency,20,120),spacing=.85;let nextDot=spacing;
 for(let i=0;i<Math.ceil(THROW_LIFETIME/dt);i++){
  const x=p.x,y=p.y,z=p.z,hit=advanceProjectile(world,p,dt,gravity),dx=p.x-x,dy=p.y-y,dz=p.z-z,length=Math.hypot(dx,dy,dz);
  while(length>0&&nextDot<=length&&points.length<TRAJECTORY_POINTS-1){const t=nextDot/length;points.push({x:x+dx*t,y:y+dy*t,z:z+dz*t});nextDot+=spacing;}nextDot-=length;
  if(hit||p.y< -4||i===Math.ceil(THROW_LIFETIME/dt)-1){const landing={x:p.x,y:p.y,z:p.z};points.push(landing);return{points,landing,hit:!!hit,normal:hit?.normal};}
 }
}
// Solve low/high arcs without collision queries, then validate only those paths.
// This keeps bots accurate with the new launch strength, also for nearby targets.
export function throwAngles(a,target,gravity=24){const o=pos(a),d=Math.hypot(target.x-o.x,target.z-o.z),angles=[];if(d<.1)return angles;
 const error=pitch=>{const t=d/(Math.cos(pitch)*THROW_SPEED);return o.y+.08+(Math.sin(pitch)*THROW_SPEED+THROW_LIFT)*t-.5*gravity*t*t-(target.y+.08);};
 let previous=-1.4,value=error(previous);for(let i=1;i<=24;i++){const pitch=-1.4+i*2.8/24,current=error(pitch);if(value*current<=0){let low=previous,high=pitch,base=value;for(let n=0;n<13;n++){const mid=(low+high)/2,v=error(mid);if(base*v<=0)high=mid;else{low=mid;base=v;}}angles.push((low+high)/2);}previous=pitch;value=current;}return angles;
}
export function fireRadius(area,time,angle=0){return THROWABLES.molotov.radius*clamp((time-area.start),0,1)*(.87+.08*Math.sin(angle*3+area.seed)+.05*Math.sin(angle*7-area.seed));}
export class Ordnance{
 constructor(match){this.match=match;this.projectiles=Array.from({length:PROJECTILE_LIMIT},()=>({active:false}));this.areas=Array.from({length:AREA_LIMIT},()=>({active:false}));this.serial=0;this.reset();}
 reset(){for(const p of this.projectiles)p.active=false;for(const z of this.areas)z.active=false;this.serial=0;for(const a of this.match.actors)this.resetActor(a);}
 resetActor(a){a.equipment={grenade:3,molotov:3,gas:2,antidote:2,rocket:0};a.held=null;a.throwAction=null;a.throwReady=0;a.throwPrevious=false;a.poison=null;a.exposure=0;a.gasImmuneUntil=0;a.antidoteAt=-100;a.burnUntil=-100;a.hazardMemory=new Map();a.knownAt=-100;a.knownHazards=[];a.nextThrow=this.match.time+3+a.id*.3;a.evadeUntil=0;}
 select(a,kind){if(!THROWABLES[kind]||!a.alive||!a.equipment[kind]||a.throwAction)return false;this.match.supplies.cancel(a);a.arsenal.reload=null;a.arsenal.attack=null;if(kind==='rocket')a.arsenal.select(1);a.held=kind;return true;}
 antidote(a){if(!a.alive||!a.poison||!a.equipment.antidote)return false;a.equipment.antidote--;a.poison=null;a.exposure=0;a.gasImmuneUntil=this.match.time+3.5;a.antidoteAt=this.match.time;this.match.events.push({type:'antidote',actor:a.id,position:pos(a)});return true;}
 trigger(a,yaw,pitch){const m=this.match;if(m.staging||!a.alive||!m.running||m.ended||!a.held||!a.equipment[a.held]||a.throwAction||m.time<a.throwReady||a.consuming)return false;
 if(!this.projectiles.some(p=>!p.active)||this.areas.filter(z=>z.active).length+this.projectiles.filter(p=>p.active).length>=AREA_LIMIT)return false;
 a.throwAction={kind:a.held,start:m.time,release:m.time+(a.held==='rocket'?.035:.24),end:m.time+.68,yaw,pitch,released:false};a.throwReady=m.time+.9;this.match.supplies.cancel(a);a.spawnUntil=Math.min(a.spawnUntil,m.time);return true;}
 release(a,action){const p=this.projectiles.find(p=>!p.active);if(!p)return;const state=launchState(a,action.yaw,action.pitch);if(action.kind==='rocket'){const cp=Math.cos(action.pitch);state.vx=-Math.sin(action.yaw)*cp*52;state.vy=Math.sin(action.pitch)*52;state.vz=-Math.cos(action.yaw)*cp*52;}Object.assign(p,state,{previous:{x:state.x,y:state.y,z:state.z},active:true,id:++this.serial,kind:action.kind,owner:a,born:this.match.time,spin:a.id*.7});a.equipment[action.kind]--;action.released=true;this.match.events.push({type:action.kind==='rocket'?'rocket-shot':'throw',actor:a.id,kind:action.kind,position:pos(a)});this.match.hear(a,12,'throw');}
 createArea(p){const z=this.areas.find(z=>!z.active);if(!z)return;const f=floorAt(this.match.world,p),kind=p.kind;Object.assign(z,{active:true,id:++this.serial,kind,owner:p.owner,x:p.x,y:kind==='grenade'?p.y:(f?.y??p.y),z:p.z,floor:f?.c,start:this.match.time,seed:p.id*2.399,nextDamage:0,nextSound:0});
 if(kind==='rocket'){z.impact={x:p.x,y:p.y,z:p.z};this.rocketBlast(p);}
 this.match.events.push({type:kind==='rocket'?'rocket-explosion':kind==='grenade'?'explosion':kind==='molotov'?'glass':'gas',actor:p.owner.id,position:{x:z.x,y:z.y,z:z.z}});
 this.match.sounds.push({id:p.owner.id,team:p.owner.team,x:z.x,y:z.y,z:z.z,radius:kind==='grenade'?32:kind==='molotov'?16:8,kind,expires:this.match.time+.7,stamp:this.match.time});if(this.match.sounds.length>40)this.match.sounds.shift();
 if(kind==='grenade')for(const a of this.match.actors){if(!this.affects(p.owner,a))continue;const q=pos(a),d=Math.hypot(q.x-z.x,Math.max(0,Math.abs(a.body.y-z.y)-.3),q.z-z.z);if(d>7||obstruction(this.match.world.colliders,{x:z.x,y:z.y+.1,z:z.z},q)<.999)continue;this.match.damage(a,d<=4+1e-9?1000:140*(7-d)/3,p.owner,'grenade',{self:true,position:z});}
 }
 rocketBlast(p){const m=this.match,o={x:p.x,y:p.y,z:p.z};for(const a of m.actors){if(!this.affects(p.owner,a))continue;const q=pos(a),d=Math.hypot(q.x-o.x,q.z-o.z,Math.max(0,Math.abs(a.body.y-o.y)-.3));if(d>20||obstruction(m.world.colliders,o,q)<.999)continue;m.damage(a,d<=16+1e-9?1000:175*(20-d)/4,p.owner,'rocket',{self:true,nonlethal:d>16+1e-9,position:o});}}
 affects(source,a){return a.alive&&(source===a||this.match.enemy(source,a));}
 inside(z,a){if(!this.affects(z.owner,a))return false;const p=a.body,angle=Math.atan2(p.z-z.z,p.x-z.x),r=z.kind==='molotov'?fireRadius(z,this.match.time,angle):2.5;
 if(distance(p,z)>r||Math.abs(p.y-z.y)>(z.kind==='gas'?2.5:1.2))return false;
 return obstruction(this.match.world.colliders,{x:z.x,y:z.y+.18,z:z.z},{x:p.x,y:p.y+.3,z:p.z})>.999;
 }
 step(dt){const m=this.match,time=m.time;
 for(const a of m.actors){const action=a.throwAction;if(action){if(!a.alive){a.throwAction=null;a.held=null;}else{if(!action.released&&time>=action.release)this.release(a,action);if(time>=action.end){a.throwAction=null;if(!a.equipment[action.kind]||!a.human){a.held=null;a.arsenal.select(1);}}}}
 }
 for(const p of this.projectiles){if(!p.active)continue;p.previous.x=p.x;p.previous.y=p.y;p.previous.z=p.z;
  if(p.kind==='rocket'){const v=Math.hypot(p.vx,p.vy,p.vz),ray={x:p.vx/v,y:p.vy/v,z:p.vz/v},target=m.lineTarget(p.owner,p,ray,v*dt);if(target.actor){Object.assign(p,target.point);this.createArea(p);p.active=false;continue;}}
  const hit=advanceProjectile(m.world,p,dt,p.kind==='rocket'?0:m.params.gravity);if(hit){this.createArea(p);p.active=false;continue;}
  if(time-p.born>(p.kind==='rocket'?8:THROW_LIFETIME)||p.y< -4){p.active=false;}
 }
 for(const z of this.areas){if(!z.active)continue;const age=time-z.start;if(age>(z.kind==='airstrike'?30:z.kind==='rocket'?20:z.kind==='rc'?2.2:z.kind==='molotov'?26:z.kind==='gas'?GAS_ACTIVE+GAS_FADE:1.5)){z.active=false;continue;}
  if(z.kind==='molotov'&&age<11&&time>=z.nextDamage){z.nextDamage=time+.5;for(const a of m.actors)if(this.inside(z,a)){const amount=12*(age<=8?1:clamp((11-age)/3,0,1));if(amount>.1){if(m.damage(a,amount,z.owner,'molotov',{self:true,position:z}))a.burnUntil=time+.65;}}}
  if(z.kind==='molotov'&&age<10&&time>=z.nextSound){z.nextSound=time+.7;m.events.push({type:'fire-loop',actor:-1,position:z});}
 }
 for(const a of m.actors){if(!a.alive)continue;let gas=null;if(time>=a.gasImmuneUntil)for(const z of this.areas)if(z.active&&z.kind==='gas'&&time-z.start<GAS_ACTIVE&&this.inside(z,a)){gas=z;break;}
  a.exposure=gas?a.exposure+dt:0;if(gas&&a.exposure>=.5&&!a.poison){a.poison={start:time,end:time+8,next:time+2,owner:gas.owner,origin:{x:gas.x,y:gas.y,z:gas.z}};a.exposure=0;}
  if(a.poison){const poison=a.poison;if(time+1e-8>=poison.next&&poison.next<=poison.end+1e-7){m.damage(a,20,poison.owner,'gas',{self:true,healthOnly:true,nonlethal:true,position:poison.origin});poison.next+=2;}if(time>=poison.end+1e-6)a.poison=null;}
 }
 }
 dangers(){return [...this.projectiles.filter(p=>p.active&&p.kind==='grenade'),...this.areas.filter(z=>z.active&&((z.kind==='molotov'&&this.match.time-z.start<11)||(z.kind==='gas'&&this.match.time-z.start<GAS_ACTIVE)))];}
 known(b){const time=this.match.time;if(time-b.knownAt<.045)return b.knownHazards;b.knownAt=time;b.knownHazards=this.dangers().filter(z=>{const seen=b.hazardMemory.get(z.id);return seen!==undefined&&seen<=time;});return b.knownHazards;}
 risk(p,hazards){let cost=0;for(const z of hazards){const r=z.kind==='grenade'?8:z.kind==='gas'?3.3:THROWABLES.molotov.radius+1.2;if(Math.abs(p.y-z.y)<2.5&&distance(p,z)<r)cost+=30*(1-distance(p,z)/r)+5;}return cost;}
 safeSegment(b,a,c){const hazards=this.known(b);return !this.risk(c,hazards)&&!this.risk({x:(a.x+c.x)/2,y:(a.y+c.y)/2,z:(a.z+c.z)/2},hazards);}
 botDecision(b,diff){const m=this.match,time=m.time,p=b.body;
  const dangers=this.dangers();for(const z of dangers)if(!b.hazardMemory.has(z.id)&&distance(p,z)<18&&(distance(p,z)<2||Math.abs(angleDelta(b.yaw,Math.atan2(-(z.x-p.x),-(z.z-p.z))))<1.65)&&Math.abs(p.y-z.y)<5&&obstruction(m.world.colliders,pos(b),{x:z.x,y:z.y+.15,z:z.z})>.99)b.hazardMemory.set(z.id,time+diff.reaction*b.traits.reaction);
  for(const id of b.hazardMemory.keys())if(!dangers.some(z=>z.id===id))b.hazardMemory.delete(id);
  const known=this.known(b);if(this.risk(p,known)>0){let goal=null,best=Infinity;const component=m.nav.nearest(p).component;for(const n of m.nav.nodes){const d=distance(p,n);if(d<3||d>22||n.component!==component||n.low||n.edges.length<3||this.risk(n,known)>0)continue;const score=d+Math.abs(n.y-p.y)*3;if(score<best){best=score;goal=n;}}if(goal){b.state='RETIRARSE';b.evadeUntil=time+1;b.positionPlanUntil=0;m.setGoal(b,goal);b.routePending=true;return true;}}
  if(time<b.evadeUntil)return true;
  if(b.poison&&time-b.poison.start>diff.reaction+.35)this.antidote(b);
  if(time<b.nextThrow||b.throwAction)return false;
  const observed=b.target&&time>=b.recognizedAt&&m.visible(b,b.target,32,false),recent=!observed&&b.memory?.confirmed&&time-b.lastSeen<2.5&&time<b.memory.expires;
  if(!observed&&!recent)return false;const target=observed?b.target.body:b.memory;
  b.nextThrow=time+4;const d=distance(p,target);if(d<7||d>30)return false;
  let kinds=b.profile.name==='Defensivo'?['molotov','gas','grenade']:b.profile.name==='Táctico'?['gas','molotov','grenade']:['grenade','molotov','gas'];if(b.health<40)kinds=['gas','molotov','grenade'];const kind=kinds.find(k=>b.equipment[k]>0);if(!kind)return false;
  if(b.rng()>.30+.30*diff.tactics+.15*b.profile.advance)return false;
  const yaw=Math.atan2(-(target.x-p.x),-(target.z-p.z));let best=null;if(Math.abs(angleDelta(b.yaw,yaw))>.5)return false;
  for(const pitch of throwAngles(b,target,m.params.gravity)){const path=trajectory(m.world,b,yaw,pitch,m.params.gravity),landing=path.landing,score=distance(landing,target)+Math.abs(landing.y-target.y)*2;if(path.hit&&distance(p,landing)>(kind==='molotov'?THROWABLES.molotov.radius+1:8)&&score<(best?.score??5))best={pitch,score,landing};}
  if(!best||m.actors.some(a=>a!==b&&a.alive&&!m.enemy(b,a)&&distance(a.body,best.landing)<(kind==='molotov'?THROWABLES.molotov.radius+1:7.5)))return false;
  if(this.select(b,kind)){if(this.trigger(b,yaw,best.pitch)){b.nextThrow=time+7+b.rng()*8;return false;}b.held=null;}return false;
 }
}
