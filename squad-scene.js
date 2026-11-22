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
const HOLD_SECONDS=.5;
export const REVEAL_SECONDS=2.5;
const {lerp,smoothstep,smootherstep,radToDeg,degToRad}=T.MathUtils;
const longPoses=['relaxed','raised','shoulder'];
const shortPoses=['low','chest','forward'];
const isLong=weapon=>weapon==='rifle'||weapon==='shotgun'||weapon==='rocket';
const rightHand=new T.Vector3(),leftHand=new T.Vector3(),palmOffset=new T.Vector3();

export function formation(map,count){
 const stage=stages[map]||stages.nodo09;
 const forward=new T.Vector3(stage.dx,0,stage.dz).normalize();
 const right=new T.Vector3(-forward.z,0,forward.x);
 const center=new T.Vector3(stage.x,.025,stage.z);
 // Pairs show below the knees. A full team closes the gaps and fills the frame to the waist.
 const density=smoothstep(count,2,10);
 const cropHeight=lerp(.30,.97,density),eyeHeight=lerp(1.25,.97,density);
 const spacing=lerp(.66,.325,density);
 const eye=center.clone().addScaledVector(forward,-cameraDistance);
 eye.y+=eyeHeight;
 const facing=foot=>Math.atan2(foot.x-eye.x,foot.z-eye.z);
 const places=count>0?[{foot:center.clone(),yaw:facing(center),side:0,lane:0}]:[];
 let previousDepth=0,slope=0;
 for(let lane=1;places.length<count;lane++){
  const depth=lerp(.38,.58,density)+(lane-1)*lerp(.34,.46,density);
  // Measure spacing at the two helmets' mean projected scale. Shoulders can
  // overlap while the visors keep their own columns, even at the far end.
  slope+=spacing*.5*(1/(cameraDistance+previousDepth)+1/(cameraDistance+depth));
  const offset=slope*(cameraDistance+depth);
  for(const side of [-1,1]){
   const foot=center.clone().addScaledVector(forward,depth).addScaledVector(right,side*offset);
   places.push({foot,yaw:facing(foot),side,lane});
   if(places.length===count)break;
  }
  previousDepth=depth;
 }
 return {center,eye,right,forward,places,cropHeight,density};
}

// Fit the same physical stage to the actual space between the header and the name rail.
export function frameSquad(camera,layout,width,height,frame){
 camera.position.copy(layout.eye);
 camera.lookAt(layout.center.x,layout.eye.y,layout.center.z);
 camera.updateMatrixWorld(true);
 const point=new T.Vector3();
 const eyeHeight=layout.eye.y-layout.center.y;
 const bottom=(layout.cropHeight-eyeHeight)/cameraDistance;
 let top=0,left=0,right=0,leftHelmet=0,rightHelmet=0,leftGear=0,rightGear=0;
 for(const {foot} of layout.places){
  point.copy(foot).applyMatrix4(camera.matrixWorldInverse);
  const depth=-point.z,x=point.x;
  top=Math.max(top,(1.98-eyeHeight)/(depth-.26));
  left=Math.min(left,x/depth);right=Math.max(right,x/depth);
  leftHelmet=Math.min(leftHelmet,(x-.22)/(depth-.22));rightHelmet=Math.max(rightHelmet,(x+.22)/(depth-.22));
  leftGear=Math.min(leftGear,(x-.67)/(depth-.36));rightGear=Math.max(rightGear,(x+.67)/(depth-.36));
 }
 // In a duo the midpoint falls between the two faces. With more ranks the focus
 // progressively returns to the MVP, including when one wing has an extra person.
 const middle=(left+right)*.5*(1-layout.density);
 const centerX=frame.x+frame.width/2,railY=frame.y+frame.height;
 const focal=Math.min(frame.height/(top-bottom),
  frame.width*.5/Math.max(rightHelmet-middle,middle-leftHelmet),
  centerX/(middle-leftGear),(width-centerX)/(rightGear-middle));
 camera.fov=radToDeg(2*Math.atan(height/(2*focal)));
 camera.setViewOffset(width,height,width/2-centerX+focal*middle,height/2-railY-focal*bottom,width,height);
 return layout.places.map(({foot})=>{
  point.copy(foot).project(camera);
  return {x:(1+point.x)*width/2,y:railY};
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

function poseWeapon(rig,breath,sway,weight,density){
 const {gun,portraitPose}=rig,weapon=rig.bot.weapon;
 gun.rotation.order='YXZ';
 if(isLong(weapon)){
  const rocket=weapon==='rocket',scale=rocket ? .71 : .73;
  gun.scale.setScalar(scale);
  switch(portraitPose){
   case 'raised':
    // In a dense wing keep the lifted muzzle below the next soldier's LEDs.
    gun.position.set(.135,lerp(-.034,-.09,density)+breath*.012,-.255);
    gun.rotation.set(lerp(.69,.43,density)+weight*.045+breath*.027,1.30+sway*.06,-.10+weight*.06);
    break;
   case 'shoulder':
    // The fore-end crosses the outer shoulder behind the hand, outside the helmet.
    gun.position.set(rocket ? .285 : .255,(rocket ? .153 : .115)+breath*.008,-.235);
    gun.rotation.set(.32+breath*.018,Math.PI+.50+.07*weight+.035*sway,-.11+weight*.04);
    break;
   default:
    gun.position.set(.135,.012+breath*.018,-.245);
    gun.rotation.set(-.17-.06*weight+breath*.046,1.04+.13*weight+.054*sway,-.09+.08*weight+.051*sway);
  }
  rightHand.set(0,rocket?-.18:-.10,rocket?-.076:.055).multiplyScalar(scale).applyQuaternion(gun.quaternion).add(gun.position);
  if(portraitPose==='shoulder'){
   leftHand.set(-.32,-.31+breath*.009,-.095);
  }else{
   leftHand.set(0,rocket?-.115:-.048,weapon==='shotgun'?-.43:-.38).multiplyScalar(scale).applyQuaternion(gun.quaternion).add(gun.position);
  }
 }else{
  gun.scale.setScalar(1);
  const knife=weapon==='knife';
  switch(portraitPose){
   case 'chest': gun.position.set(.225,.036+breath*.013,-.265);break;
   case 'forward': gun.position.set(.315,-.082+breath*.016,-.30);break;
   default: gun.position.set(.29,-.145+breath*.017,-.16);
  }
  gun.rotation.set((knife?.16:.06)+breath*.068,-1.16+.12*weight+.062*sway,(portraitPose==='chest'?-.24:.03)+weight*.10+.058*sway);
  rightHand.copy(gun.position);
  leftHand.set(-.25,-.23+breath*.012,-.15);
 }
 // armIK takes wrist positions. Offset from each grip to its wrist in the
 // actual palm orientation, including the free hand when the rifle is shouldered.
 palmOffset.set(0,.070,0).applyQuaternion(gun.quaternion);
 rightHand.add(palmOffset);
 if(rig.twoHanded)leftHand.add(palmOffset);
 else leftHand.y+=.070;
}

function pose(soldiers,rig,place,time,density){
 const id=rig.bot.id,phase=id*2.399+.4;
 const motion=place.lane===0?smootherstep(time,HOLD_SECONDS,REVEAL_SECONDS):1;
 const breath=motion*Math.sin(time*(1.48+(id%4)*.08)+phase);
 const sway=motion*Math.sin(time*(.79+(id%5)*.038)+phase+.7);
 const look=Math.sin(time*(.89+(id%3)*.08)+phase);
 // Linger briefly at the ends of a glance; each soldier has a different beat.
 const glance=motion*look*(1.4-.4*look*look);
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
 abdomen.rotation.set(.015*motion+.015*breath,.032*sway,.023*weight*motion);
 chest.rotation.set(.035*breath,.069*sway,.027*sway-.028*weight*motion);
 neck.rotation.y=faceTurn-bodyTurn+(place.side === 0 ? .22 : .14)*glance;
 head.rotation.set(motion*(-.025+.054*Math.sin(time*.92+phase)),motion*.027*Math.sin(time*.53+phase),.040*sway+motion*.025*weight);
 poseWeapon(rig,breath,sway,weight,density);
 for(const arm of rig.arms){
  soldiers.armIK(arm,arm.side>0?rightHand:leftHand);
  arm.wrist.quaternion.copy(arm.shoulder.quaternion).multiply(arm.elbow.quaternion).invert();
  if(arm.side>0||rig.twoHanded)arm.wrist.quaternion.multiply(gun.quaternion);
 }
 root.updateMatrixWorld(true);
}

export class SquadScene{
 constructor(view,members){
  this.view=view;
  this.layout=formation(view.level.id,members.length);
  this.camera=new T.PerspectiveCamera(35,1,.03,200);
  this.camera.layers.set(PHOTO_LAYER);
  this.teamCamera=this.camera.clone();
  this.focus=new T.Vector3();
  this.projected=new T.Vector3();
  for(const root of view.mapBackdrop)root.traverse(node=>node.layers.enable(PHOTO_LAYER));
  view.environment.nightMesh?.layers.enable(PHOTO_LAYER);
  this.group=new T.Group();
  // At night draw the squad into the same depth buffer after the map. Its two
  // portrait lights belong to this private scene and cannot reach the backdrop.
  this.portraitScene=null;
  if(view.environment.night){
   this.portraitScene=new T.Scene();
   this.portraitScene.fog=view.scene.fog;
   const fill=new T.HemisphereLight(0xcad9e4,0x787b76,1.18);
   const key=new T.DirectionalLight(0xfff1df,2.05);
   key.target.position.copy(this.layout.center);key.target.position.y+=1.32;
   key.position.copy(key.target.position).addScaledVector(this.layout.forward,-3.5).addScaledVector(this.layout.right,-1.05);
   key.position.y+=2.35;
   key.layers.set(PHOTO_LAYER);fill.layers.set(PHOTO_LAYER);
   this.portraitScene.add(this.group,fill,key,key.target);
  }else{
   view.scene.add(this.group);
  }
  // The native rig, materials and live LED atlas are shared with the match. Only
  // the posing skeletons and their compact instance buffers belong to this shot.
  const actors=members.map(member=>({...member,body:{y:0},alive:true,yaw:0,human:member.id===0}));
  this.soldiers=new SoldierBatch(this.group,actors,view.soldiers);
  const mvp=this.soldiers.rigs[0];
  this.visor=mvp.parts.find(part=>part.visorSlot===mvp.bot.id).bone;
  let nextLong=mvp.bot.id+(mvp.bot.kills||0)+members.length,nextShort=nextLong;
  for(const rig of this.soldiers.rigs){
   const long=isLong(rig.bot.weapon);
   rig.portraitPose=long?longPoses[(nextLong++)%longPoses.length]:shortPoses[(nextShort++)%shortPoses.length];
   rig.twoHanded=long&&rig.portraitPose!=='shoulder';
  }
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
 fit(width,height,frame){
  const points=frameSquad(this.teamCamera,this.layout,width,height,frame);
  this.camera.copy(this.teamCamera);
  this.settled=false;
  const visorAspect=this.visor.scale.x/this.visor.scale.y;
  this.framing={
   width,height,centerX:frame.x+frame.width*.5,centerY:frame.y+frame.height*.5,
   visorWidth:Math.min(frame.width*.86,height*visorAspect*.70),
   focal:height/(2*Math.tan(degToRad(this.teamCamera.fov)*.5))
  };
  return points;
 }
 updateCamera(time){
  if(!this.framing||this.settled)return;
  const camera=this.camera,wide=this.teamCamera;
  if(time>=REVEAL_SECONDS){
   camera.copy(wide);
   this.settled=true;
   return;
  }
  const {width,height,centerX,centerY,visorWidth,focal}=this.framing;
  const {forward,right}=this.layout;
  const progress=smootherstep(time,HOLD_SECONDS,REVEAL_SECONDS);
  const face=this.focus.set(0,0,-.5).applyMatrix4(this.visor.matrixWorld);
  const startDistance=focal*this.visor.scale.x/visorWidth;
  const endDistance=-this.projected.copy(face).applyMatrix4(wide.matrixWorldInverse).z;
  // A physical pullback with a gentle side arc. Exponential distance keeps the
  // visor from suddenly shrinking in the first few frames of the move.
  const distance=startDistance*Math.pow(endDistance/startDistance,progress);
  const travel=(distance-startDistance)/(endDistance-startDistance);
  const arc=Math.sin(Math.PI*progress)**2;
  camera.position.copy(face).addScaledVector(forward,-startDistance).lerp(wide.position,travel);
  camera.position.addScaledVector(right,.085*arc);camera.position.y+=.035*arc;
  camera.updateMatrixWorld(true);
  // Guide the real LED face between its two compositions while the camera moves.
  // At the end both the pose and projection match the final camera exactly.
  const point=this.projected.copy(face).project(wide);
  const faceX=lerp(centerX,(1+point.x)*width*.5,progress);
  const faceY=lerp(centerY,(1-point.y)*height*.5,progress);
  point.copy(face).applyMatrix4(camera.matrixWorldInverse);
  const scale=focal/-point.z;
  camera.setViewOffset(width,height,width*.5-faceX+scale*point.x,height*.5-faceY-scale*point.y,width,height);
 }
 render(time,dt){
  this.soldiers.rigs.forEach((rig,i)=>pose(this.soldiers,rig,this.layout.places[i],time,this.layout.density));
  this.updateCamera(time);
  this.view.sky.position.copy(this.camera.position);
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
  if(renderer){
   renderer.clear();renderer.render(this.view.scene,this.camera);
   if(this.portraitScene)renderer.render(this.portraitScene,this.camera);
  }
 }
 dispose(){
  this.soldiers.dispose();
  for(const {mesh,merged} of this.weapons){mesh.dispose();if(merged)mesh.geometry.dispose();}
  this.weaponMaterial.dispose();
  this.group.removeFromParent();
  this.portraitScene?.clear();
  this.view.sky.position.copy(this.skyPosition);
 }
}
