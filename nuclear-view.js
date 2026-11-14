import * as T from './three.module.min.js';
import {clamp} from './physics.js';
import {itemGeometry} from './field-models.js';
import {atomicExposure} from './nuclear.js';
export {atomicExposure} from './nuclear.js';
import {AtomicCloud} from './atomic-cloud.js';
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// Shared tint uniforms, no additional lights/shadows. Day and night have separate
// exposure curves; daylight is retained until the actual impact.
export class NuclearView{
 constructor(view){this.view=view;this.uniforms={uAtomicDark:{value:1},uAtomicGlow:{value:0},uAtomicRed:{value:0},uAtomicPulse:{value:0},uAtomicCenter:{value:new T.Vector3()},uAtomicRadius:{value:60}};this.skyUniform={value:0};this.darkSky=new T.Color(0x03050a);this.baseFog=view.scene.fog.color.clone();
  this.plane=new T.Mesh(view.supportView.plane.geometry,new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide,fog:false}));this.plane.visible=false;this.bomb=new T.Mesh(itemGeometry('rocket-projectile'),new T.MeshBasicMaterial({color:0x030303,fog:false}));this.bomb.rotation.x=-Math.PI/2;this.bomb.scale.setScalar(4);this.bomb.visible=false;view.scene.add(this.plane,this.bomb);this.cloud=new AtomicCloud(view.scene);
  this.dayMaterials=[];for(const body of view.environment.dayBodies)body.traverse(o=>{if(o.material)this.dayMaterials.push({material:o.material,opacity:o.material.opacity});});
  const sky=view.sky.material;sky.onBeforeCompile=shader=>{shader.uniforms.uAtomicSky=this.skyUniform;shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uAtomicSky;').replace('#include <dithering_fragment>','#include <dithering_fragment>\ngl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.012,0.016,0.025),uAtomicSky);');};sky.customProgramCacheKey=()=>'atomic-sky-exposure-v2';sky.needsUpdate=true;
 }
 attach(){const v=this.view,skip=new Set([v.sky,this.plane,this.bomb,this.cloud.mesh,v.supportView.plane,v.supportView.bombs,v.field.effects.mesh]);v.sky.traverse(o=>skip.add(o));
  const tint=o=>{if(!o.isMesh||skip.has(o))return;for(const mat of Array.isArray(o.material)?o.material:[o.material]){if(!mat||mat.userData.atomicTint)return;mat.userData.atomicTint=true;const before=mat.onBeforeCompile.bind(mat),cacheKey=mat.customProgramCacheKey();mat.onBeforeCompile=(shader,renderer)=>{before(shader,renderer);Object.assign(shader.uniforms,this.uniforms);shader.uniforms.uAtomicBaked={value:mat.userData.atomicBaked?1:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAtomicWorld;').replace('#include <project_vertex>',`#include <project_vertex>
vec4 atomicPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
atomicPosition=instanceMatrix*atomicPosition;
#endif
vAtomicWorld=(modelMatrix*atomicPosition).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vAtomicWorld;uniform float uAtomicDark;uniform float uAtomicGlow;uniform float uAtomicRed;uniform float uAtomicPulse;uniform float uAtomicBaked;uniform vec3 uAtomicCenter;uniform float uAtomicRadius;`).replace('#include <dithering_fragment>',`#include <dithering_fragment>
if(uAtomicRed>0.001 && uAtomicBaked<0.5){
 float l=dot(gl_FragColor.rgb,vec3(0.45,0.4,0.15));
 gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(l*0.006)+vec3(1.0,0.005,0.001)*l*uAtomicPulse,uAtomicRed);
}
if(uAtomicDark<0.999 || uAtomicGlow>0.001){
 float radial=pow(max(0.0,1.0-length(vAtomicWorld.xz-uAtomicCenter.xz)/uAtomicRadius),2.4);
 gl_FragColor.rgb=gl_FragColor.rgb*(vec3(uAtomicDark)+vec3(1.7,0.95,0.4)*radial*uAtomicGlow)+vec3(0.07,0.027,0.006)*radial*uAtomicGlow;
}`);
   };mat.customProgramCacheKey=()=>cacheKey+'-atomic-radial-v2';mat.needsUpdate=true;}};
  v.scene.traverse(tint);v.gunScene.traverse(tint);this.baseFog.copy(v.environment.night?v.environment.nightFog:v.environment.dayFog);this.uniforms.uAtomicDark.value=1;this.uniforms.uAtomicGlow.value=this.uniforms.uAtomicRed.value=this.uniforms.uAtomicPulse.value=this.skyUniform.value=0;this.uniforms.uAtomicRadius.value=Math.min(v.level.width||96,v.level.depth||96)*.66;v.gunScene.visible=true;v.sky.material.color.setScalar(1);this.cloud.mesh.visible=false;
 }
 update(dt,alpha){const v=this.view,n=v.match?.nuclear,active=n?.active,age=active?n.age:0,o=n?.origin||{x:0,y:0,z:0},blast=n?.impactAge??-1,night=v.match?.config.environment==='night',e=atomicExposure(n,night);
  this.uniforms.uAtomicDark.value=e.dark;this.uniforms.uAtomicGlow.value=e.glow;this.uniforms.uAtomicRed.value=e.red;this.uniforms.uAtomicPulse.value=e.pulse;this.uniforms.uAtomicCenter.value.set(o.x,o.y,o.z);this.skyUniform.value=e.sky;v.scene.fog.color.copy(this.baseFog).lerp(this.darkSky,night&&active&&!n.impacted?Math.max(e.sky,smooth(age/.7)):e.sky);v.gunScene.visible=!n?.restricted;
  // The daylight sun and its halo fade with the sky; no moon or stars are enabled.
  for(const {material,opacity}of this.dayMaterials)material.opacity=opacity*(night?1:1-e.sky);
  this.plane.visible=active&&age>=22&&age<29;if(this.plane.visible){const t=age-24;this.plane.position.set(o.x+t*38,o.y+65,o.z+t*24);this.plane.rotation.y=Math.atan2(-38,-24);}
  const b=n?.bomb;this.bomb.visible=!!(active&&b?.active);if(this.bomb.visible)this.bomb.position.set(b.previous.x+(b.x-b.previous.x)*alpha,b.previous.y+(b.y-b.previous.y)*alpha,b.previous.z+(b.z-b.previous.z)*alpha);
  this.cloud.update(n);
  // Five degrees lower than the previous knockdown view; keep free look and roll.
  if(n?.impacted){const q=smooth(blast/.55);v.camera.position.y-=.10*q;v.camera.rotation.x=clamp(v.camera.rotation.x+(.28-5*Math.PI/180)*q,-1.48,1.48);v.camera.rotation.z=-.10*q+Math.sin(blast*23)*Math.exp(-blast*3)*.025;v.camera.updateMatrixWorld(true);}
 }
}
