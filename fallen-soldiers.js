import * as T from './three.module.min.js';
import {SoldierBatch} from './soldier.js';
import {visorMaterial} from './visor-mesh.js';

const unit=t=>Math.max(0,Math.min(1,t));
const ease=t=>{t=unit(t);return t*t*(3-2*t);};
const bones=r=>[r.pelvis,r.abdomen,r.chest,r.neck,r.head,...r.arms.flatMap(a=>[a.shoulder,a.elbow,a.wrist]),...r.legs.flatMap(l=>[l.hip,l.knee,l.ankle])];
const rotation=new T.Quaternion(),euler=new T.Euler();
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
  s.material.opacity=s.led.opacity=1;
  this.pose(s,0);
 }
 pose(s,age){
  const e=s.event,r=s.rig,t=unit(age/1.12),fall=ease(t/.72),land=unit((t-.68)/.32);
  const impact=Math.sin(land*Math.PI*2)*.085*(1-land),lift=Math.sin(Math.PI*fall);
  const back=e.variant===0,sideways=e.variant===1,sign=e.side;
  const pitch=back?1.56:sideways?.23:-1.51,roll=sideways?-sign*1.52:sign*.10;
  const k=fall;
  r.root.rotation.order='YXZ';r.root.rotation.set(pitch*k-impact,e.yaw,roll*k);
  const dx=sideways?sign*.10*k:0,dz=back?.10*k:sideways?0:.1*k;
  r.root.position.set(e.x+Math.cos(e.yaw)*dx+Math.sin(e.yaw)*dz,
   e.ground+(e.y-e.ground)*(1-ease(t/.76))+.21*k+(back?.35*lift:sideways?.12*lift:0)+impact*.4,
   e.z-Math.sin(e.yaw)*dx+Math.cos(e.yaw)*dz);
  r.pelvis.position.y=s.pelvisY+(.87-s.pelvisY)*k-(back?0:sideways?.09:.27)*lift;
  const blend=ease(t/.42);
  const set=(i,x,y,z)=>{const bone=s.joints[i];rotation.setFromEuler(euler.set(x,y,z,bone.rotation.order));bone.quaternion.copy(s.start[i]).slerp(rotation,blend);};
  set(0,0,0,0);set(1,back?-.22*lift:sideways?.03:.54*lift,0,roll*.08);set(2,0,0,0);set(3,0,0,0);set(4,back?.23*lift:-.12,0,sign*.09);
  for(let i=0;i<2;i++){
   const hand=5+i*3,leg=11+i*3,side=i?1:-1;
   const armLift=back?(i?1.5:.66)*lift:sideways?.58*lift:1.23*lift;
   set(hand,armLift+(back?.03:sideways?.15:.90),0,side*(.12+.37*lift));
   set(hand+1,.18+.56*lift,0,0);set(hand+2,0,0,0);
   set(leg,(back?.75:sideways?.27:1.25)*lift+(sideways&&i?.29:0),0,side*.07);
   set(leg+1,-(back?.68:sideways?.82:1.65)*lift-(sideways&&i?.49:.03),0,0);
   set(leg+2,.08,0,0);
  }
  r.root.updateMatrixWorld(true);
  if(land>0){
   let low=Infinity;
   for(const p of r.parts){const a=p.bone.matrixWorld.elements;low=Math.min(low,a[13]-.5*(Math.abs(a[1])+Math.abs(a[5])+Math.abs(a[9])));}
   r.root.position.y+=(e.ground+.012-low)*ease(land);
   r.root.updateMatrixWorld(true);
  }
  const glow=.6*(1-unit(age/.22));s.material.emissive.setRGB(glow,.005*glow,0);s.led.emissive.copy(s.material.emissive);
  for(const b of s.batch.batches){for(const p of b.parts)b.mesh.setMatrixAt(p.index,p.bone.matrixWorld);b.mesh.instanceMatrix.needsUpdate=true;}
 }
 update(time){
  for(const s of this.slots){if(!s.event)continue;const age=time-s.event.at;
   if(age>=8){s.event=null;s.group.visible=false;continue;}
   if(!s.finished){this.pose(s,age);s.finished=age>=1.12;}
   s.material.opacity=s.led.opacity=bodyOpacity(age);
  }
 }
}
