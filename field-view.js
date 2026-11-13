import {FieldEffects} from './field-effects.js';
import * as T from './three.module.min.js';
import {itemGeometry,itemModel} from './field-models.js';
import {trajectory,PROJECTILE_LIMIT} from './ordnance.js';
import {clamp} from './physics.js';
import {segment} from './weapon-models.js';
const kinds=['grenade','molotov','gas','antidote','rocket'];
export class FieldView{
 constructor(view){this.view=view;this.matrix=new T.Matrix4();this.temp=new T.Object3D();this.color=new T.Color();this.right=new T.Vector3();this.up=new T.Vector3();this.itemMaterial=new T.MeshLambertMaterial({vertexColors:true});this.projectileBatches=kinds.map(kind=>{const mesh=new T.InstancedMesh(itemGeometry(kind==='rocket'?'rocket-projectile':kind),this.itemMaterial,PROJECTILE_LIMIT+20);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);view.scene.add(mesh);return mesh;});
  this.effects=new FieldEffects(view);
  this.previewGeometry=new T.BufferGeometry();this.previewGeometry.setAttribute('position',new T.BufferAttribute(new Float32Array(72*3),3).setUsage(T.DynamicDrawUsage));this.preview=new T.Points(this.previewGeometry,new T.PointsMaterial({color:0xb7f7da,size:.07,depthWrite:false}));this.preview.frustumCulled=false;view.scene.add(this.preview);
  this.landingMarker=new T.Mesh(new T.RingGeometry(.19,.22,24),new T.MeshBasicMaterial({color:0xb7f7da,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}));view.scene.add(this.landingMarker);this.landingMarker.visible=false;
  this.hand=new T.Group();view.gunScene.add(this.hand);this.wrist=new T.Group();this.hand.add(this.wrist);this.handItems=Object.fromEntries(kinds.map(k=>{const mesh=itemModel(k);this.wrist.add(mesh);return[k,mesh];}));const mat=new T.MeshLambertMaterial({color:0x897f61});this.fore=new T.Mesh(new T.BoxGeometry(.085,1,.10),mat);this.upper=new T.Mesh(new T.BoxGeometry(.12,1,.13),mat);this.glove=new T.Mesh(new T.BoxGeometry(.10,.09,.11),new T.MeshLambertMaterial({color:0x304c50}));this.wrist.add(this.glove);this.glove.position.y=-.065;this.hand.add(this.fore,this.upper);
  this.rings=[];this.flags=[];this.match=null;this.elbowPoint=new T.Vector3(.13,-.15,.2);this.shoulderPoint=new T.Vector3(.25,-.30,.42);this.preview.visible=false;this.hand.visible=false;
 }
 attach(match){this.match=match;this.effects.reset();this.hand.visible=false;this.landingMarker.visible=false;for(const mesh of [...this.rings,...this.flags]){mesh.removeFromParent();mesh.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});}this.rings=[];this.flags=[];
  if(match.config.mode==='domination')for(const z of match.objectives.zones){const mesh=new T.Mesh(new T.RingGeometry(z.radius-.06,z.radius,48),new T.MeshBasicMaterial({color:0x9ba8a6,transparent:true,opacity:.75,side:T.DoubleSide,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(z.x,z.y+.035,z.z);this.view.scene.add(mesh);this.rings.push(mesh);}
  if(match.config.mode==='ctf')for(const f of match.objectives.flags){const root=new T.Group(),pole=new T.Mesh(new T.CylinderGeometry(.025,.025,1.65,6),new T.MeshLambertMaterial({color:0xc4ccc3}));pole.position.y=.825;root.add(pole);const cloth=new T.Mesh(new T.BoxGeometry(.78,.48,.018),new T.MeshBasicMaterial({color:f.team==='blue'?0x55b6ff:0xff665b}));cloth.position.set(.39,1.35,0);root.add(cloth);this.view.scene.add(root);this.flags.push(root);}
 }
 update(dt,p,input,alpha){const m=this.match;if(!m)return;const time=m.time,o=m.ordnance;this.right.setFromMatrixColumn(this.view.camera.matrixWorld,0);this.up.setFromMatrixColumn(this.view.camera.matrixWorld,1);
  for(let k=0;k<kinds.length;k++){const mesh=this.projectileBatches[k];let count=0;for(const q of o.projectiles)if(q.active&&q.kind===kinds[k]){this.temp.position.set(q.previous.x+(q.x-q.previous.x)*alpha,q.previous.y+(q.y-q.previous.y)*alpha,q.previous.z+(q.z-q.previous.z)*alpha);this.temp.rotation.set(q.rest?0:(time-q.born)*5,q.spin,0);if(q.kind==='rocket')this.temp.rotation.set(Math.asin(clamp(q.vy/52,-1,1)),Math.atan2(-q.vx,-q.vz),0,'YXZ');this.temp.scale.setScalar(1);this.temp.updateMatrix();mesh.setMatrixAt(count++,this.temp.matrix);}for(const r of this.view.soldiers?.rigs||[]){const b=r.bot,kind=time-b.antidoteAt<.6?'antidote':b.throwAction?.kind||b.held;if(!b.alive||kind!==kinds[k]||(b.throwAction?.released&&kind!=='antidote'))continue;this.matrix.copy(r.arms[1].wrist.matrixWorld);this.temp.position.set(0,-.015,0);this.temp.rotation.set(.3,0,0);this.temp.scale.setScalar(1);this.temp.updateMatrix();this.matrix.multiply(this.temp.matrix);mesh.setMatrixAt(count++,this.matrix);}mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;}
  this.effects.update(time);
  this.rings.forEach((mesh,i)=>{const z=m.objectives.zones[i],team=z.contested?null:z.occupant||z.owner;mesh.material.color.set(team==='blue'?0x56baff:team==='red'?0xff7565:0xa8b1af);});
  this.flags.forEach((root,i)=>{const f=m.objectives.flags[i];root.position.set(f.x,f.y+(f.state==='carried'?.5:0),f.z);root.children[1].rotation.y=Math.sin(time*2+i)*.09;});
  const a=m.player,action=a.throwAction,syringe=time-a.antidoteAt<.6,kind=syringe?'antidote':action?.kind||a.held;this.hand.visible=!!kind&&a.alive;this.view.weapon.visible=!this.hand.visible;
  if(this.hand.visible){this.view.weapon.visible=false;for(const arm of this.view.arms)arm.visible=false;this.hand.position.set(.22,-.24+Math.sin(this.view.phase)*.008,-.65);this.hand.rotation.set(0,0,0);const injection=syringe?Math.sin(clamp((time-a.antidoteAt)/.6,0,1)*Math.PI):0,t=action?clamp((time-action.start)/.68,0,1):0,wind=Math.sin(Math.min(1,t/.35)*Math.PI*.5),follow=t>.35?Math.sin((t-.35)/.65*Math.PI):0;
   this.wrist.position.set(-follow*.18-injection*.16,syringe?.02+injection*.07:wind*.10-follow*.08,syringe?-.02-injection*.10:wind*.10-follow*.28);this.wrist.rotation.set(syringe?-Math.PI/3+injection*.22:-wind*.55+follow*1.2,0,-injection*.25);for(const [k,obj]of Object.entries(this.handItems))obj.visible=k===kind&&!(action?.released&&!syringe);this.glove.visible=true;
   if(kind==='rocket'){const ads=this.view.aim;this.hand.position.set(.24*(1-ads),-.25,-.60);this.wrist.position.set(0,0,action?.released?Math.sin(t*Math.PI)*.09:0);this.wrist.rotation.set(0,0,0);this.handItems.rocket.visible=true;}
   segment(this.fore,this.wrist.position,this.elbowPoint);segment(this.upper,this.elbowPoint,this.shoulderPoint);
  }
  this.preview.visible=!!a.held&&a.held!=='rocket'&&(a.equipment[a.held]>0||action&&!action.released)&&a.alive&&(input.aim||input.fire||action&&!action.released)&&!m.remote.engaged;
  this.landingMarker.visible=false;
  if(this.preview.visible){
   // Recompute every rendered frame from the interpolated body and current finger angles.
   const b=a.body,prev=b.previous,body={x:prev.x+(b.x-prev.x)*alpha,y:prev.y+(b.y-prev.y)*alpha,z:prev.z+(b.z-prev.z)*alpha,height:b.height};
   const path=trajectory(m.world,{body},action&&!action.released?action.yaw:input.yaw,action&&!action.released?action.pitch:input.pitch,m.params.gravity,40),pos=this.previewGeometry.attributes.position;
   path.points.forEach((v,i)=>pos.setXYZ(i,v.x,v.y,v.z));this.previewGeometry.setDrawRange(0,path.points.length);pos.needsUpdate=true;if(path.hit){this.landingMarker.visible=true;this.landingMarker.position.set(path.landing.x,path.landing.y+.018,path.landing.z);this.landingMarker.quaternion.copy(this.view.camera.quaternion);}
  }
 }
}
