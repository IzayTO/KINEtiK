import * as T from './three.module.min.js';
import {CharmAtlas,CharmBatch,charmMount} from './charm-mesh.js';

// Clone only the transform hierarchy. Geometry, materials and weapon textures are
// borrowed from the actual loadout and are owned and disposed by the game.
export function previewModel(view,kind){
 const model=view.models.find(item=>item.kind===kind);
 const source=model?.item||model?.root||view.field.handItems[kind];
 const root=source.clone(true);
 function rest(original,copy){
  const matrix=view.restingWeaponParts?.get(original);
  if(matrix)matrix.decompose(copy.position,copy.quaternion,copy.scale);
  if(original===model?.flash||original===model?.shell)copy.visible=false;
  for(let i=0;i<original.children.length;i++)rest(original.children[i],copy.children[i]);
 }
 rest(source,root);root.visible=true;root.position.set(0,0,0);root.quaternion.identity();root.scale.setScalar(1);
 root.updateMatrixWorld(true);return root;
}
export class CharmPreview{
 constructor(canvas,view,invalidate){
  this.canvas=canvas;this.view=view;this.invalidate=invalidate;
  this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  this.renderer.setPixelRatio(Math.min(1.5,globalThis.devicePixelRatio||1));this.renderer.setClearColor(0,0);
  this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(34,1,.008,12);
  this.scene.add(new T.HemisphereLight(0xf3fbff,0xb8c0bf,1.9));
  const key=new T.DirectionalLight(0xffefd4,2.1);key.position.set(-1.4,2,1.8);this.scene.add(key);
  this.atlas=new CharmAtlas(null,1);this.tag=new CharmBatch(this.scene,this.atlas,1);this.center=new T.Vector3();
  this.bounds=new T.Box3();this.size=new T.Vector3();this.whole=false;
  canvas.onpointerdown=e=>{if(this.drag||e.button!==0)return;canvas.setPointerCapture(e.pointerId);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};};
  canvas.onpointermove=e=>{
   if(!this.drag||e.pointerId!==this.drag.id)return;
   this.yaw-=(e.clientX-this.drag.x)*.013;this.pitch=T.MathUtils.clamp(this.pitch+(e.clientY-this.drag.y)*.009,-1.2,1.2);
   this.drag.x=e.clientX;this.drag.y=e.clientY;invalidate();
  };
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===this.drag?.id)this.drag=null;};
 }
 select(kind){
  this.model?.removeFromParent();this.kind=kind;this.model=previewModel(this.view,kind);this.scene.add(this.model);
  this.tag.begin();this.tag.add(0,kind,this.model.matrixWorld);this.tag.end();
  this.yaw=charmMount(kind)[4];this.pitch=.10;
  this.bounds.setFromObject(this.model);this.bounds.getSize(this.size);
 }
 setDesign(pixels){this.atlas.write(0,this.kind,pixels);}
 draw(){
  const w=this.canvas.clientWidth,h=this.canvas.clientHeight;if(!w||!h||!this.model)return;
  if(w!==this.w||h!==this.h){this.w=w;this.h=h;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  const [x,y,z,width,,drop]=charmMount(this.kind);let distance;
  if(this.whole){
   this.bounds.getCenter(this.center);distance=this.size.length()*1.94/Math.min(1,this.camera.aspect);
  }else{
   this.center.set(x,y-width*(drop+0.17),z);distance=width*Math.max(2.6,2.1/this.camera.aspect);
  }
  const cos=Math.cos(this.pitch);
  this.camera.position.set(Math.sin(this.yaw)*cos,Math.sin(this.pitch),Math.cos(this.yaw)*cos).multiplyScalar(distance).add(this.center);
  this.camera.lookAt(this.center);this.renderer.render(this.scene,this.camera);
 }
 dispose(){
  this.canvas.onpointerdown=this.canvas.onpointermove=this.canvas.onpointerup=this.canvas.onpointercancel=this.canvas.onlostpointercapture=null;
  this.tag.dispose();this.atlas.dispose();this.scene.clear();this.renderer.dispose();this.renderer.forceContextLoss();
 }
}
