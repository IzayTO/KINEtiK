import * as T from './three.module.min.js';
import {modelThumbnail} from './field-models.js';
import {clamp} from './physics.js';
export function carModel(){const root=new T.Group(),wheels=[],mat=new Map();const material=color=>{if(!mat.has(color))mat.set(color,new T.MeshLambertMaterial({color,flatShading:true}));return mat.get(color);};const box=(w,h,d,color,x,y,z)=>{const a=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));a.position.set(x,y,z);root.add(a);return a;};
 box(.43,.12,.60,0x324e4d,0,.17,0);box(.33,.12,.31,0xa7b5a5,0,.28,.07);box(.28,.07,.17,0xdb8756,0,.27,-.18);box(.28,.03,.025,0xa0f6d4,0,.20,-.315);box(.36,.03,.025,0xd97758,0,.22,.315);box(.04,.24,.035,0x213c3f,.12,.43,.12);box(.28,.015,.11,0x172d30,0,.36,.09);
 const geo=new T.CylinderGeometry(.115,.115,.09,10);geo.rotateZ(Math.PI/2);for(const x of [-.25,.25])for(const z of [-.21,.21]){const wheel=new T.Mesh(geo,material(0x18282b));wheel.position.set(x,.12,z);root.add(wheel);wheels.push(wheel);const hub=new T.Mesh(new T.CylinderGeometry(.052,.052,.094,8).rotateZ(Math.PI/2),material(0x9ea99d));hub.position.copy(wheel.position);root.add(hub);}
 root.userData.wheels=wheels;return root;
}
export class RCView{
 constructor(view){this.view=view;this.model=carModel();view.scene.add(this.model);this.model.visible=false;this.angle=0;this.position=new T.Vector3();this.cameraPosition=new T.Vector3();this.wasActive=false;this.timer=0;}
 thumbnail(){return modelThumbnail(this.model);}
 update(dt,alpha){const v=this.view,r=v.match?.remote;if(!r)return;this.model.visible=r.active;
  if(r.engaged&&v.match.player.alive){const p=r.body;this.position.set(p.previous.x+(p.x-p.previous.x)*alpha,p.previous.y+(p.y-p.previous.y)*alpha,p.previous.z+(p.z-p.previous.z)*alpha);this.model.position.copy(this.position);const goal=p.speed>.2?Math.atan2(-p.vx,-p.vz):r.yaw;this.angle+=Math.atan2(Math.sin(goal-this.angle),Math.cos(goal-this.angle))*(1-Math.exp(-12*dt));this.model.rotation.y=this.angle;for(const wheel of this.model.userData.wheels)wheel.rotation.x-=p.speed*dt/.115;
   v.camera.position.copy(this.position);v.camera.position.y+=.53;v.camera.rotation.set(r.pitch,r.yaw,0,'YXZ');v.camera.updateMatrixWorld(true);v.gunScene.visible=false;v.field.preview.visible=false;this.wasActive=true;
  }else if(this.wasActive){v.gunScene.visible=true;this.wasActive=false;}
 }
}
