import * as T from './three.module.min.js';
import {SoldierBatch} from './soldier.js';
import {visorMaterial} from './visor-mesh.js';

const unit=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=unit(t);return t*t*(3-2*t);};
const bones=r=>[r.pelvis,r.abdomen,r.chest,r.neck,r.head,...r.arms.flatMap(a=>[a.shoulder,a.elbow,a.wrist]),...r.legs.flatMap(l=>[l.hip,l.knee,l.ankle])];
const rotation=new T.Quaternion(),euler=new T.Euler();
// Back, side, forward and a knee buckle that turns onto one shoulder.
const falls=[
 {delay:.03,turn:.72,pitch:1.56,roll:.09,twist:.05,hop:2.4,spine:-.22,arm:1.48,rest:.08,hip:.79,knee:.77},
 {delay:.04,turn:.68,pitch:.23,roll:-1.50,twist:.10,hop:0,spine:.10,arm:.73,rest:.21,hip:.42,knee:.92},
 {delay:.03,turn:.70,pitch:-1.51,roll:.12,twist:-.06,hop:0,spine:.43,arm:1.18,rest:.83,hip:1.12,knee:1.53},
 {delay:.23,turn:.65,pitch:-.82,roll:-1.30,twist:.48,hop:0,spine:.52,arm:1.10,rest:.48,hip:.57,knee:1.16}
];
const settleSeconds=.58;
function jointPose(slot,index,blend,x,y,z){
 const joint=slot.joints[index];
 rotation.setFromEuler(euler.set(x,y,z,joint.rotation.order));
 joint.quaternion.copy(slot.start[index]).slerp(rotation,blend);
}
// Signed clearance of the lowest corner, measured against the floor or ramp at the fall.
function groundLift(r,e){
 const sx=e.slopeX||0,sz=e.slopeZ||0;
 let lowest=Infinity;
 for(const part of r.parts){
  const a=part.bone.matrixWorld.elements;
  const extent=.5*(Math.abs(a[1]-sx*a[0]-sz*a[2])+Math.abs(a[5]-sx*a[4]-sz*a[6])+Math.abs(a[9]-sx*a[8]-sz*a[10]));
  const floor=e.ground+sx*(a[12]-e.x)+sz*(a[14]-e.z);
  lowest=Math.min(lowest,a[13]-floor-extent);
 }
 return Math.max(0,.008-lowest);
}
export function bodyOpacity(age){return 1-unit((age-5)/3);}

export class FallenSoldiers{
 constructor(view){this.view=view;this.slots=[];}
 clear(){
  for(const s of this.slots){s.batch.dispose();s.material.dispose();s.led.dispose();s.group.removeFromParent();}
  this.slots.length=0;
 }
 add(e){
  const source=this.view.soldiers,live=source.rigs.find(r=>r.bot.id===e.actor);if(!live)return;
  let s=this.slots.find(s=>!s.event&&s.id===e.actor);
  if(!s){
   const group=new T.Group();this.view.scene.add(group);
   const batch=new SoldierBatch(group,[live.bot],source);
   const material=new T.MeshLambertMaterial({flatShading:true});
   const led=visorMaterial(source.visorAtlas,true);
   for(const m of [material,led]){m.transparent=true;m.depthWrite=true;}
   batch.batches[0].mesh.material=material;batch.batches[1].mesh.material=led;
   const rig=batch.rigs[0],joints=bones(rig);
   s={id:e.actor,batch,group,material,led,rig,joints,start:joints.map(()=>new T.Quaternion())};this.slots.push(s);
  }
  s.event=e;s.finished=false;s.group.visible=true;
  const copy=bones(live);
  s.start.forEach((q,i)=>q.copy(copy[i].quaternion));
  s.pelvisY=live.bot.human ? .87 : live.pelvis.position.y;
  const f=falls[e.variant];
  s.gravity=Math.max(1,e.gravity||24);
  s.launch=e.grounded===false?(e.vy||0):f.hop;
  const height=Math.max(0,e.y-e.ground+s.pelvisY-.20);
  const flight=(s.launch+Math.sqrt(s.launch*s.launch+2*s.gravity*height))/s.gravity;
  s.contactAt=Math.max(f.delay+f.turn,flight);
  s.material.opacity=s.led.opacity=1;
  this.pose(s,0);
 }
 pose(s,age){
  const e=s.event,r=s.rig,f=falls[e.variant],sign=e.side;
  const t=unit((age-f.delay)/f.turn);
  // Accelerate into the fall. Shoulders and feet settle at different times.
  const turn=t*t*(1.58-.58*t);
  const curl=Math.sin(Math.PI*ease(t));
  const sinceContact=Math.max(0,age-s.contactAt);
  const settle=sinceContact<settleSeconds?Math.exp(-8*sinceContact)*(1-ease((sinceContact-.36)/.22)):0;
  const recoil=Math.sin(20*sinceContact)*settle;
  const buckle=e.variant===3?ease(age/.28)*(1-.68*ease((age-.37)/.48)):0;
  const blend=ease(age/.39);
  r.root.rotation.order='YXZ';
  r.root.rotation.set(f.pitch*turn-.12*f.pitch*recoil,
   e.yaw+sign*f.twist*ease((age-f.delay-.05)/f.turn),
   sign*(f.roll*turn-.11*f.roll*recoil));
  r.pelvis.position.y=s.pelvisY+(.87-s.pelvisY)*turn-.34*buckle;
  const drift=1-Math.exp(-5*age);
  const dx=(e.variant===1||e.variant===3)?sign*.10*turn:0;
  const dz=e.variant===0?.10*turn:e.variant===2?-.08*turn:0;
  const q=r.root.quaternion,upY=1-2*(q.x*q.x+q.z*q.z);
  const pelvisY=Math.max(e.ground,e.y+s.pelvisY+s.launch*age-.5*s.gravity*age*age);
  r.root.position.set(e.x+(e.driftX||0)*drift+Math.cos(e.yaw)*dx+Math.sin(e.yaw)*dz,
   pelvisY-upY*r.pelvis.position.y,e.z+(e.driftZ||0)*drift-Math.sin(e.yaw)*dx+Math.cos(e.yaw)*dz);
  jointPose(s,0,blend,.09*buckle,sign*.08*curl,0);
  jointPose(s,1,blend,f.spine*curl+.26*buckle,sign*.17*curl,sign*.07*turn);
  jointPose(s,2,blend,-.11*curl+.11*recoil,-sign*.14*curl,0);
  jointPose(s,3,blend,.08*curl,0,sign*.06*turn);
  jointPose(s,4,ease(age/.50),.21*curl-.17*recoil,sign*.22*turn,sign*(.13*turn+.09*recoil));
  for(let i=0;i<2;i++){
   const arm=5+3*i,leg=11+3*i,side=i?1:-1,leading=side===sign;
   const phase=unit((age-(leading?.02:.12))/(f.delay+f.turn+.14));
   const reach=Math.sin(Math.PI*phase);
   const follow=ease((age-(leading?0:.06))/.46);
   const armLift=f.arm*(leading?1:.64)*reach;
   jointPose(s,arm,follow,f.rest+armLift+recoil*(leading?.15:-.16),side*.12*turn,side*(.16+.42*reach));
   jointPose(s,arm+1,follow,.21+.62*reach+.24*buckle+(leading?.10:.32)*turn,0,0);
   jointPose(s,arm+2,follow,-.16*reach+.16*recoil,side*.12*turn,0);
   const tuck=(leading?1:.60)*buckle;
   jointPose(s,leg,follow,f.hip*reach+(leading?.17:.04)*turn+1.07*tuck,side*.10*turn,side*(.08+.14*reach));
   jointPose(s,leg+1,follow,-f.knee*reach-(leading?.32:.12)*turn-1.65*tuck,0,0);
   jointPose(s,leg+2,follow,.08+.15*reach-.11*recoil,0,side*.07*turn);
  }
  r.root.updateMatrixWorld(true);
  // The instances share one parent. Move that parent for contact instead of updating all bones twice.
  s.group.position.y=groundLift(r,e)+.035*Math.max(0,recoil);
  const glow=.6*(1-unit(age/.22));s.material.emissive.setRGB(glow,.005*glow,0);s.led.emissive.copy(s.material.emissive);
  for(const b of s.batch.batches){for(const p of b.parts)b.mesh.setMatrixAt(p.index,p.bone.matrixWorld);b.mesh.instanceMatrix.needsUpdate=true;}
 }
 update(time){
  for(const s of this.slots){if(!s.event)continue;const age=time-s.event.at;
   if(age>=8){s.event=null;s.group.visible=false;continue;}
   if(!s.finished){this.pose(s,age);s.finished=age>=s.contactAt+settleSeconds;}
   s.material.opacity=s.led.opacity=bodyOpacity(age);
  }
 }
}
