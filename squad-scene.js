import * as T from './three.module.min.js';
import {SoldierBatch} from './soldier.js';
import {itemGeometry} from './field-models.js';
import {PropParts} from './prop-geometry.js';

// The presentation camera sees the map, its ordinary lighting and the posing squad.
const PHOTO_LAYER=1;
const stages={
 nodo09:{x:0,z:35.8,dx:0,dz:1},
 airport:{x:17,z:19.5,dx:-.70,dz:-.714}
};
const cameraDistance=9.6;
const rightHand=new T.Vector3(),leftHand=new T.Vector3(),palmOffset=new T.Vector3();

export function formation(map,count){
 const stage=stages[map]||stages.nodo09;
 const forward=new T.Vector3(stage.dx,0,stage.dz).normalize();
 const right=new T.Vector3(-forward.z,0,forward.x);
 const center=new T.Vector3(stage.x,.025,stage.z);
 const eye=center.clone().addScaledVector(forward,-cameraDistance);
 eye.y=1.27;
 const leftCount=Math.ceil((count-1)/2),rightCount=count-1-leftCount;
 const places=Array.from({length:count},(_,i)=>{
  const lane=Math.ceil(i/2),side=i%2?-1:1;
  const depth=i===0?0:.56+lane*.28;
  // Space the columns in projection as the wings recede from the camera.
  const columns=side<0?leftCount:rightCount;
  const offset=i===0?0:side*1.15*lane*(leftCount/columns)*(1+depth/cameraDistance);
  const foot=center.clone().addScaledVector(right,offset).addScaledVector(forward,depth);
  const yaw=Math.atan2(foot.x-eye.x,foot.z-eye.z);
  return {foot,yaw};
 });
 return {center,eye,right,forward,places};
}

// Fit standing silhouettes inside the space left by the real header, labels and button.
// The perspective remains isotropic. The optical center can move for asymmetric safe areas.
export function frameSquad(camera,layout,width,height,frame){
 camera.position.copy(layout.eye);
 camera.up.set(0,1,0);
 camera.lookAt(layout.center.x,1.01,layout.center.z);
 camera.updateMatrixWorld(true);
 let extent=0,top=-Infinity,bottom=Infinity;
 const point=new T.Vector3();
 for(const {foot} of layout.places)for(const side of [-1,1])for(const y of [0,1.91]){
  point.copy(foot).addScaledVector(layout.forward,-.23).addScaledVector(layout.right,side*.72);
  point.y+=y;
  point.applyMatrix4(camera.matrixWorldInverse);
  extent=Math.max(extent,Math.abs(point.x/-point.z));
  top=Math.max(top,point.y/-point.z);
  bottom=Math.min(bottom,point.y/-point.z);
 }
 const focal=Math.min(frame.width/(2*extent),frame.height/(top-bottom));
 const opticalX=frame.x+frame.width/2;
 const opticalY=frame.y+frame.height/2+focal*(top+bottom)/2;
 camera.fov=T.MathUtils.radToDeg(2*Math.atan(height/(2*focal)));
 camera.setViewOffset(width,height,width/2-opticalX,height/2-opticalY,width,height);
 camera.updateMatrixWorld(true);
 return layout.places.map(({foot})=>{
  point.copy(foot).project(camera);
  return {x:(1+point.x)*width/2,y:(1-point.y)*height/2};
 });
}

function firearmGeometry(model,rest){
 const parts=new PropParts();
 function visit(node,parent){
  if(!node.visible||node===model.flash||node===model.shell)return;
  node.updateMatrix();
  const matrix=new T.Matrix4().multiplyMatrices(parent,rest.get(node)||node.matrix);
  if(node.isMesh&&!node.material.transparent){
   parts.add(node.geometry.clone().applyMatrix4(matrix),node.material.color.getHex());
  }
  for(const child of node.children)visit(child,matrix);
 }
 const identity=new T.Matrix4();
 for(const child of model.root.children)visit(child,identity);
 return parts.finish();
}

function pose(soldiers,rig,place,weapon,time){
 const id=rig.bot.id,phase=id*2.399+.4;
 const breath=Math.sin(time*(1.46+(id%4)*.07)+phase);
 const glance=Math.sin(time*.72+phase)*.062+Math.sin(time*.31+phase)*.027;
 const turn=Math.sin(phase)*.18,weight=Math.sin(phase+.9);
 const {root,pelvis,abdomen,chest,neck,head,gun}=rig;
 root.position.copy(place.foot);
 root.rotation.set(0,place.yaw+turn,0);
 // The legs keep a fixed stance. Breathing and glances start above the belt.
 pelvis.position.y=.867;
 for(const leg of rig.legs){
  const bend=.105+leg.side*weight*.057;
  leg.hip.rotation.set(bend,0,leg.side*(.10+.023*weight));
  leg.knee.rotation.x=-2*bend;
  leg.ankle.rotation.set(bend,0,-leg.hip.rotation.z);
 }
 abdomen.position.y=.19+breath*.005;
 abdomen.rotation.set(.012,-turn*.25,weight*.025);
 chest.rotation.set(.013*breath,-turn*.26+glance*.32,-weight*.02);
 neck.rotation.y=-turn*.49+glance*.68;
 head.rotation.set(-.014+breath*.015,.018*Math.sin(phase),weight*.027);

 const long=weapon==='rifle'||weapon==='shotgun'||weapon==='rocket';
 gun.rotation.order='YXZ';
 if(long){
  const scale=weapon==='rocket'?.71:.73;
  gun.scale.setScalar(scale);
  gun.position.set(.135,-.058+breath*.007,-.235);
  gun.rotation.set(-.17-.20*(.5+.5*weight)+breath*.014,1.04+.12*weight,-.10+.07*weight);
  rightHand.set(0,weapon==='rocket'?-.18:-.10,weapon==='rocket'?-.076:.055).multiplyScalar(scale).applyQuaternion(gun.quaternion).add(gun.position);
  leftHand.set(0,weapon==='rocket'?-.115:-.048,weapon==='shotgun'?-.43:-.38).multiplyScalar(scale).applyQuaternion(gun.quaternion).add(gun.position);
 }else{
  const knife=weapon==='knife';
  gun.position.set(.29,-.19+breath*.008,-.19);
  gun.rotation.set(knife?.16:.06,-1.16+.12*weight,weight*.10);
  gun.scale.setScalar(1);
  rightHand.copy(gun.position);
  leftHand.set(-.22,-.27+breath*.005,-.17);
 }
 // armIK positions the wrist; the palm center lies just below that joint.
 palmOffset.set(0,.070,0).applyQuaternion(gun.quaternion);
 rightHand.add(palmOffset);leftHand.add(palmOffset);
 for(const arm of rig.arms){
  soldiers.armIK(arm,arm.side>0?rightHand:leftHand);
  arm.wrist.quaternion.copy(arm.shoulder.quaternion).multiply(arm.elbow.quaternion).invert().multiply(gun.quaternion);
 }
 root.updateMatrixWorld(true);
}

export class SquadScene{
 constructor(view,members){
  this.view=view;
  this.layout=formation(view.level.id,members.length);
  this.camera=new T.PerspectiveCamera(35,1,.06,200);
  this.camera.layers.set(PHOTO_LAYER);
  for(const root of view.mapBackdrop)root.traverse(node=>node.layers.enable(PHOTO_LAYER));
  view.environment.nightMesh?.layers.enable(PHOTO_LAYER);
  this.group=new T.Group();
  view.scene.add(this.group);
  // The native rig, materials and live LED atlas are shared with the match. Only
  // the posing skeletons and their compact instance buffers belong to this shot.
  const actors=members.map(member=>({...member,body:{y:0},alive:true,yaw:0,human:member.id===0}));
  this.soldiers=new SoldierBatch(this.group,actors,view.soldiers);
  this.weapons=[];
  this.weaponMaterial=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
  for(const kind of new Set(members.map(a=>a.weapon))){
   const model=view.models.find(m=>m.kind===kind);
   const merged=kind==='rifle'||kind==='shotgun';
   const geometry=merged?firearmGeometry(model,view.restingWeaponParts):
    kind==='knife'?model.item.geometry:itemGeometry(kind);
   const rigs=this.soldiers.rigs.filter(r=>r.bot.weapon===kind);
   const mesh=new T.InstancedMesh(geometry,kind==='knife'?model.item.material:this.weaponMaterial,rigs.length);
   mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
   mesh.frustumCulled=false;
   this.group.add(mesh);
   this.weapons.push({mesh,rigs,merged});
  }
  this.group.traverse(node=>node.layers.set(PHOTO_LAYER));
  this.skyPosition=view.sky.position.clone();
  view.sky.position.copy(this.layout.eye);
  view.atomicView.update(0,1);
  view.environment.timer=0;
 }
 render(time,dt){
  this.soldiers.rigs.forEach((rig,i)=>pose(this.soldiers,rig,this.layout.places[i],rig.bot.weapon,time));
  for(const {mesh,parts} of this.soldiers.batches){
   for(const part of parts)mesh.setMatrixAt(part.index,part.bone.matrixWorld);
   mesh.instanceMatrix.needsUpdate=true;
  }
  for(const {mesh,rigs} of this.weapons){
   rigs.forEach((rig,i)=>mesh.setMatrixAt(i,rig.gun.matrixWorld));
   mesh.instanceMatrix.needsUpdate=true;
  }
  this.view.environment.update(dt,this.layout.center);
  const renderer=this.view.renderer;
  if(renderer){renderer.clear();renderer.render(this.view.scene,this.camera);}
 }
 dispose(){
  this.soldiers.dispose();
  for(const {mesh,merged} of this.weapons){mesh.dispose();if(merged)mesh.geometry.dispose();}
  this.weaponMaterial.dispose();
  this.group.removeFromParent();
  this.view.sky.position.copy(this.skyPosition);
 }
}
