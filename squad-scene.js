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
const cameraDistance=4.35;
const waistHeight=.97;
const rightHand=new T.Vector3(),leftHand=new T.Vector3(),palmOffset=new T.Vector3();

export function formation(map,count){
 const stage=stages[map]||stages.nodo09;
 const forward=new T.Vector3(stage.dx,0,stage.dz).normalize();
 const right=new T.Vector3(-forward.z,0,forward.x);
 const center=new T.Vector3(stage.x,.025,stage.z);
 const eye=center.clone().addScaledVector(forward,-cameraDistance);
 eye.y+=waistHeight;
 const facing=foot=>Math.atan2(foot.x-eye.x,foot.z-eye.z);
 const places=count>0?[{foot:center.clone(),yaw:facing(center),side:0,lane:0}]:[];
 let previousDepth=0,slope=0;
 for(let lane=1;places.length<count;lane++){
  const depth=.56+(lane-1)*.40;
  // Measure spacing at the two helmets' mean projected scale. Shoulders can
  // overlap while the visors keep their own columns, even at the far end.
  slope+=.295*.5*(1/(cameraDistance+previousDepth)+1/(cameraDistance+depth));
  const offset=slope*(cameraDistance+depth);
  for(const side of [-1,1]){
   const foot=center.clone().addScaledVector(forward,depth).addScaledVector(right,side*offset);
   places.push({foot,yaw:facing(foot),side,lane});
   if(places.length===count)break;
  }
  previousDepth=depth;
 }
 return {center,eye,right,forward,places};
}

// A level camera at waist height puts every soldier's abdomen on the same
// crop line, even though the wings are farther back. The name rail begins there.
export function frameSquad(camera,layout,width,height,frame){
 camera.position.copy(layout.eye);
 camera.lookAt(layout.center.x,layout.eye.y,layout.center.z);
 camera.updateMatrixWorld(true);
 const point=new T.Vector3();
 let top=0,helmets=0,hands=0;
 for(const {foot} of layout.places){
  point.copy(foot).applyMatrix4(camera.matrixWorldInverse);
  const depth=-point.z,x=Math.abs(point.x);
  top=Math.max(top,(1.89-waistHeight)/(depth-.21));
  helmets=Math.max(helmets,(x+.24)/(depth-.21));
  hands=Math.max(hands,(x+.49)/(depth-.35));
 }
 const opticalX=frame.x+frame.width/2,waistY=frame.y+frame.height;
 const focal=Math.min(frame.height/top,frame.width/(2*helmets),Math.min(opticalX,width-opticalX)/hands);
 camera.fov=T.MathUtils.radToDeg(2*Math.atan(height/(2*focal)));
 camera.setViewOffset(width,height,width/2-opticalX,height/2-waistY,width,height);
 return layout.places.map(({foot})=>{
  point.copy(foot);point.y=layout.eye.y;point.project(camera);
  return {x:(1+point.x)*width/2,y:waistY};
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
 const breath=Math.sin(time*(1.48+(id%4)*.08)+phase);
 const sway=Math.sin(time*(.79+(id%5)*.038)+phase+.7);
 const look=Math.sin(time*(.89+(id%3)*.08)+phase);
 // Linger briefly at the ends of a glance; each soldier has a different beat.
 const glance=look*(1.4-.4*look*look);
 const weight=Math.sin(phase+.9);
 const sideAngle=place.side*Math.min(.59,.38+place.lane*.047);
 const bodyTurn=sideAngle+.085*weight;
 const faceTurn=sideAngle*.66;
 const {root,pelvis,abdomen,chest,neck,head,gun}=rig;
 root.position.copy(place.foot);
 root.rotation.set(0,place.yaw+bodyTurn,0);
 // The legs keep a fixed stance. Breathing and glances start above the belt.
 pelvis.position.y=.867;
 for(const leg of rig.legs){
  const bend=.105+leg.side*weight*.057;
  leg.hip.rotation.set(bend,0,leg.side*(.10+.023*weight));
  leg.knee.rotation.x=-2*bend;
  leg.ankle.rotation.set(bend,0,-leg.hip.rotation.z);
 }
 abdomen.position.y=.19+breath*.010;
 abdomen.rotation.set(.015+.015*breath,.032*sway,.023*weight);
 chest.rotation.set(.035*breath,.069*sway,.027*sway-.028*weight);
 neck.rotation.y=faceTurn-bodyTurn+(place.side === 0 ? .22 : .14)*glance;
 head.rotation.set(-.025+.054*Math.sin(time*.92+phase),.027*Math.sin(time*.53+phase),.040*sway+.025*weight);

 const long=weapon==='rifle'||weapon==='shotgun'||weapon==='rocket';
 gun.rotation.order='YXZ';
 if(long){
  const scale=weapon==='rocket'?.71:.73;
  gun.scale.setScalar(scale);
  gun.position.set(.135,.012+breath*.018,-.245);
  gun.rotation.set(-.11-.12*(.5+.5*weight)+breath*.046,1.04+.13*weight+.054*sway,-.09+.08*weight+.051*sway);
  rightHand.set(0,weapon==='rocket'?-.18:-.10,weapon==='rocket'?-.076:.055).multiplyScalar(scale).applyQuaternion(gun.quaternion).add(gun.position);
  leftHand.set(0,weapon==='rocket'?-.115:-.048,weapon==='shotgun'?-.43:-.38).multiplyScalar(scale).applyQuaternion(gun.quaternion).add(gun.position);
 }else{
  const knife=weapon==='knife';
  gun.position.set(.29,-.085+breath*.021,-.19);
  gun.rotation.set((knife?.16:.06)+breath*.068,-1.16+.12*weight+.062*sway,weight*.10+.058*sway);
  gun.scale.setScalar(1);
  rightHand.copy(gun.position);
  leftHand.set(-.22,-.15+breath*.014,-.18);
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
