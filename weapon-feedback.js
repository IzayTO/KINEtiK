import * as T from './three.module.min.js';
import {clamp} from './physics.js';
import {PropParts} from './prop-geometry.js';

const remoteBarrels={rifle:[-.49,.015,.019,.19],shotgun:[-.49,.015,.019,.19],pistol:[-.183,.015,.026,.042],sniper:[-.56,.014,.025,.24],rocket:[-.648,0,.128,.061]};
const pose=new T.Object3D(),matrix=new T.Matrix4(),mount=new T.Matrix4(),hotColor=new T.Color();
const launcherPose=new T.Matrix4().makeRotationX(.3).setPosition(0,-.015,0);
const forward=new T.Vector3(0,0,-1),axis=new T.Vector3(0,0,1),turn=new T.Quaternion();
const local=new T.Vector3(),world=new T.Vector3(),direction=new T.Vector3();
const specs={
 // Muzzle tip, visible barrel center, sleeve radius / length and heat per shot.
 rifle:[-.916,.025,-.759,.0244,.14,.16],shotgun:[-.925,.028,-.793,.0324,.14,.31],
 pistol:[-.271,.043,-.257,.0243,.024,.19],sniper:[-1.18,.028,-.94,.0254,.26,.43],
 rocket:[-.823,0,-.647,.128,.063,.57]
};
function flameShape(){
 const art=new PropParts();
 for(let i=0;i<9;i++){
  const a=i*2.39996,r=i===0?0:.105+(i%3)*.031;
  const x=Math.cos(a),y=Math.sin(a),w=.024;
  const tip=[x*r,y*r,-(i===0?.30:.07+(i%4)*.035)];
  art.facet([[x*w-y*w,y*w+x*w,0],[x*w+y*w,y*w-x*w,0],tip],i%2?0xffbc44:0xff8823);
 }
 art.add(new T.OctahedronGeometry(1),0xfff7d9,[0,0,-.062],[0,0,0],[.038,.039,.14]);return art.finish();
}
function patchTexture(){
 const n=32,px=new Uint8Array(n*n*4);for(let j=0;j<n*n;j++){
  const d=Math.hypot(j%n-15.5,Math.floor(j/n)-15.5)/16;
  px.set([255,190,100,Math.round(255*Math.max(0,1-d*d)**3)],j*4);}
 const tex=new T.DataTexture(px,n,n);tex.magFilter=T.LinearFilter;tex.needsUpdate=true;return tex;
}
export function cantPivot(rig,angle){
 turn.setFromAxisAngle(axis,angle);rig.position.applyQuaternion(turn);rig.quaternion.premultiply(turn);
}
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
export function inspectPose(t){
 if(t<0||t>=1.65)return 0;
 return ease(t/.48)-1.09*ease((t-.94)/.43)+.09*ease((t-1.37)/.28);
}
export class WeaponFeedback{
 constructor(view){
  this.view=view;this.shape=flameShape();this.mat=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,depthWrite:false});
  const burst=scene=>{const b=new T.Mesh(this.shape,this.mat);b.visible=false;scene.add(b);return b;};
  this.hand=burst(view.gunScene);this.others=Array.from({length:6},()=>({mesh:burst(view.scene),end:0}));
  this.light=new T.PointLight(0xffb660,0,3.35,1.25);view.scene.add(this.light);
  this.handLight=new T.PointLight(0xffb05a,0,2.4,1);view.gunScene.add(this.handLight);
  const tex=patchTexture();this.patch=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));
  this.patch.visible=false;view.scene.add(this.patch);
  this.sleeve=new T.Mesh(new T.CylinderGeometry(1,1,1,12,1,true),new T.MeshBasicMaterial({color:0xff5319,transparent:true,depthWrite:false}));this.sleeve.visible=false;view.gunScene.add(this.sleeve);
  this.hotBarrels=new T.InstancedMesh(this.sleeve.geometry,new T.MeshBasicMaterial(),21);
  this.hotBarrels.count=0;this.hotBarrels.frustumCulled=false;this.hotBarrels.instanceMatrix.setUsage(T.DynamicDrawUsage);view.scene.add(this.hotBarrels);
  this.reset();
 }
 reset(){
  this.hotActors=new Map();this.hotBarrels.count=0;
  this.heat={rifle:0,shotgun:0,pistol:0,sniper:0,rocket:0};this.inspectKind=null;this.shotKind=null;
  this.hand.visible=this.patch.visible=this.sleeve.visible=false;this.handLight.intensity=this.light.intensity=0;
  this.handEnd=this.lightEnd=this.patchEnd=-1;this.lightDistance=Infinity;this.next=0;this.cant=0;
  for(const o of this.others){o.mesh.visible=false;o.end=-1;}
 }
 item(){
  const a=this.view.match?.player;if(!a)return null;
  return a.held||a.arsenal.weapon.id;
 }
 inspect(){
  const a=this.view.match?.player;if(!a?.alive||a.arsenal.reload||a.consuming||a.throwAction||this.view.match.remote.engaged)return;
  this.inspectKind=this.item();this.inspectAt=this.view.time;
 }
 pose(dt,input){
  const v=this.view,m=v.match,a=m?.player;if(!a)return;
  const kind=this.item(),usingField=!!a.held||!!a.throwAction,rig=usingField?v.field.hand:v.rig;
  this.cant+=(Number(!!v.preferences?.cantedADS)-this.cant)*(1-Math.exp(-14*dt));
  v.cantedScope=v.scoped&&this.cant>.01;
  if(specs[kind]&&this.cant&&v.aim){
   cantPivot(rig,.68*this.cant*v.aim);
   if(v.cantedScope){rig.position.x+=.24*this.cant;rig.position.y-=.16*this.cant;}
  }
  if(!a.alive||a.arsenal.reload||a.arsenal.attack||a.consuming||a.opening||a.throwAction||m.remote.engaged||m.nuclear.restricted||input.fire||input.aim||this.inspectKind!==kind)this.inspectKind=null;
  if(this.inspectKind){
   const age=v.time-this.inspectAt,w=inspectPose(age);if(age>=1.65)this.inspectKind=null;
   rig.position.x+=w*.10;rig.position.y+=w*.095;rig.position.z-=w*.095;
   rig.rotation.x+=w*.11;rig.rotation.y+=w*.76;rig.rotation.z-=w*.32;
  }
  rig.updateMatrixWorld(true);
 }
 origin(kind){
  const v=this.view,field=kind==='rocket',root=field?v.field.handItems.rocket:v.models.find(m=>m.kind===kind)?.root;
  if(!root)return null;root.updateWorldMatrix(true,false);return root;
 }
 shot(e){
  const v=this.view,kind=e.weapon||e.kind,spec=specs[kind];if(!spec)return;
  const rig=v.soldiers.rigs.find(r=>r.bot.id===e.actor);if(!rig)return;
  const isLocal=rig.bot.human&&!v.match.remote.engaged;
  const strength=kind==='shotgun'||kind==='rocket'?1.34:kind==='pistol'?.79:1;
  if(isLocal){
   this.inspectKind=null;this.shotKind=kind;this.handEnd=v.time+.085;this.strength=strength;
   this.heat[kind]=Math.min(1,this.heat[kind]+spec[5]);
   const root=this.origin(kind);
   local.set(0,spec[1],spec[0]);root.localToWorld(local);
   world.copy(local).applyQuaternion(v.camera.quaternion).add(v.camera.position);
   this.handLight.position.copy(local);this.handLight.position.z+=.17;
   this.placeHand(root,local,1);
  }else{
   const o=this.others[this.next++%this.others.length],a=rig.bot;
   let temperatures=this.hotActors.get(a.id);if(!temperatures){temperatures={};this.hotActors.set(a.id,temperatures);}
   const prev=temperatures[kind],heat=prev?Math.max(0,prev.value-(v.time-prev.at)*.106):0;
   temperatures[kind]={value:Math.min(1,heat+spec[5]),at:v.time};
   direction.set(-Math.sin(a.gunYaw)*Math.cos(a.pitch),Math.sin(a.pitch),-Math.cos(a.gunYaw)*Math.cos(a.pitch));
   rig.gun.getWorldPosition(world);world.addScaledVector(direction,kind==='pistol'?.21:kind==='sniper'?.79:.63);
   if(kind==='rocket'){mount.multiplyMatrices(rig.arms[1].wrist.matrixWorld,launcherPose);world.set(0,0,spec[0]).applyMatrix4(mount);}
   o.mesh.position.copy(world);o.mesh.quaternion.setFromUnitVectors(forward,direction);o.mesh.rotateZ(Math.random()*6.28);
   o.mesh.scale.setScalar(strength);o.mesh.visible=true;o.end=v.time+.085;
  }
  const distance=world.distanceToSquared(v.camera.position);
  if(isLocal||v.time>=this.lightEnd||distance<this.lightDistance){
   this.light.position.copy(world);this.lightEnd=v.time+.09;this.lightDistance=distance;this.light.intensity=5.8*strength;
  }
  if(isLocal)this.handLight.intensity=1.5*strength;
 }
 placeHand(root,at,k){
  const b=this.hand;b.position.copy(at);root.getWorldQuaternion(b.quaternion);b.rotateZ(this.handEnd*37);
  b.scale.setScalar(this.strength*(.55+.45*k));b.visible=k>0;
 }
 trace(e){
  if(!e.impact||e.bodyHit||!this.view.environment.night)return;
  const v=this.view,dist=Math.hypot(e.to.x-e.from.x,e.to.y-e.from.y,e.to.z-e.from.z);
  if(dist>3.15||dist<.015||v.camera.position.distanceToSquared(e.to)>900)return;
  direction.subVectors(e.from,e.to).normalize();
  const p=e.to,normal=new T.Vector3();let nearest=.035;
  for(const c of v.match.world.query(p.x,p.z,.04)){
   if(p.y<c.bottom-.04||p.y>c.top+Math.abs(c.slopeX||c.slopeZ||0)*5+.04)continue;
   const top=c.top+c.slopeX*(p.x-c.originX)+c.slopeZ*(p.z-c.originZ);
   for(const [y,sign]of [[top,1],[c.bottom,-1]])if(Math.abs(p.y-y)<nearest){nearest=Math.abs(p.y-y);normal.set(-c.slopeX*sign,sign,-c.slopeZ*sign).normalize();}
   for(let i=0;i<c.poly.length;i++){
    const [x,z]=c.poly[i],[nx,nz]=c.poly[(i+1)%c.poly.length],dx=nx-x,dz=nz-z,k=clamp(((p.x-x)*dx+(p.z-z)*dz)/(dx*dx+dz*dz),0,1);
    const d=Math.hypot(p.x-x-k*dx,p.z-z-k*dz);if(d<nearest){nearest=d;normal.set(dz,0,-dx).normalize();}
   }
  }
  if(!normal.lengthSq())return;
  if(normal.dot(direction)<0)normal.negate();
  this.patch.position.copy(p).addScaledVector(normal,.012);this.patch.quaternion.setFromUnitVectors(axis,normal);
  this.patch.scale.setScalar(.48+dist*.39);this.patchStrength=.36*(1-dist/3.35);this.patchEnd=v.time+.08;this.patch.visible=true;this.patch.material.opacity=this.patchStrength;
 }
 worldHeat(){
  const v=this.view,batch=this.hotBarrels;batch.count=0;
  if(!this.hotActors.size)return;
  for(const r of v.soldiers?.rigs||[]){const a=r.bot,temps=this.hotActors.get(a.id);
   if(!temps||!a.alive||a.atomicDown||r.root.position.distanceToSquared(v.camera.position)>45*45)continue;
   const kind=a.throwAction?.kind||a.held||a.arsenal.weapon.id,entry=temps[kind];if(!entry)continue;
   const heat=entry.value-(v.time-entry.at)*.106;if(heat<=.055)continue;
   const [z,y,radius,length]=remoteBarrels[kind];
   pose.position.set(0,y,z);pose.rotation.set(Math.PI/2,0,0);pose.scale.set(radius,length,radius);pose.updateMatrix();
   if(kind==='rocket')mount.multiplyMatrices(r.arms[1].wrist.matrixWorld,launcherPose);else mount.copy(r.gun.matrixWorld);
   matrix.multiplyMatrices(mount,pose.matrix);batch.setMatrixAt(batch.count,matrix);
   hotColor.setRGB(.046+.93*heat,.019+.13*heat**3,.013);batch.setColorAt(batch.count++,hotColor);
  }
  batch.visible=batch.count>0;if(batch.count){batch.instanceMatrix.needsUpdate=true;batch.instanceColor.needsUpdate=true;}
 }
 update(dt,input){
  const v=this.view;this.pose(dt,input);this.worldHeat();
  for(const k in this.heat)this.heat[k]=Math.max(0,this.heat[k]-dt*.106);
  const kind=this.item(),s=specs[kind],heat=this.heat[kind]||0;
  const root=s?this.origin(kind):null,visible=root&&v.match?.player.alive&&!v.match.remote.engaged&&!v.match.nuclear.restricted&&root.visible;
  let k=clamp((this.handEnd-v.time)/.085,0,1);
  if(!visible||kind!==this.shotKind)k=0;
  this.hand.visible=!!k;this.handLight.intensity=k*k*1.5*(this.strength||1);
  if(k){local.set(0,s[1],s[0]);root.localToWorld(local);this.placeHand(root,local,k);this.handLight.position.copy(local);this.handLight.position.z+=.17;}
  this.light.intensity=5.8*clamp((this.lightEnd-v.time)/.09,0,1)**2;
  for(const o of this.others)if(o.mesh.visible&&v.time>=o.end)o.mesh.visible=false;
  this.patch.visible=v.time<this.patchEnd;if(this.patch.visible)this.patch.material.opacity=this.patchStrength*clamp((this.patchEnd-v.time)/.08,0,1);
  this.sleeve.visible=!!visible&&heat>.012;
  if(this.sleeve.visible){local.set(0,s[1],s[2]);root.localToWorld(local);this.sleeve.position.copy(local);root.getWorldQuaternion(this.sleeve.quaternion);
   this.sleeve.rotateX(Math.PI/2);this.sleeve.scale.set(s[3],s[4],s[3]);
   this.sleeve.material.color.setRGB(.43+.57*heat,.009+.16*heat**3,.003);this.sleeve.material.opacity=heat*.91;}
 }
}
