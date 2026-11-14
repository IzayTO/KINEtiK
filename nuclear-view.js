import * as T from './three.module.min.js';
import {clamp} from './physics.js';
import {itemGeometry} from './field-models.js';
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
// One extra plane and one falling object. Illumination is a shared radial tint,
// with no shadow maps, screen-space pass, or light per particle.
export class NuclearView{
 constructor(view){this.view=view;this.uniforms={uAtomicDark:{value:1},uAtomicGlow:{value:0},uAtomicCenter:{value:new T.Vector3()},uAtomicRadius:{value:60}};this.plane=new T.Mesh(view.supportView.plane.geometry,new T.MeshBasicMaterial({color:0x000000,side:T.DoubleSide,fog:false}));this.plane.visible=false;this.bomb=new T.Mesh(itemGeometry('rocket-projectile'),new T.MeshBasicMaterial({color:0x030303,fog:false}));this.bomb.rotation.x=-Math.PI/2;this.bomb.scale.setScalar(4);this.bomb.visible=false;view.scene.add(this.plane,this.bomb);}
 attach(){const v=this.view,skip=new Set([v.sky,this.plane,this.bomb,v.supportView.plane,v.supportView.bombs,v.field.effects.mesh]);v.sky.traverse(o=>skip.add(o));
  v.scene.traverse(o=>{if(!o.isMesh||skip.has(o))return;for(const mat of Array.isArray(o.material)?o.material:[o.material]){if(!mat||mat.userData.atomicTint)return;mat.userData.atomicTint=true;const before=mat.onBeforeCompile.bind(mat),cacheKey=mat.customProgramCacheKey();mat.onBeforeCompile=shader=>{before(shader);Object.assign(shader.uniforms,this.uniforms);
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vAtomicWorld;').replace('#include <project_vertex>',`#include <project_vertex>
vec4 atomicPosition=vec4(transformed,1.0);
#ifdef USE_INSTANCING
atomicPosition=instanceMatrix*atomicPosition;
#endif
vAtomicWorld=(modelMatrix*atomicPosition).xyz;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
varying vec3 vAtomicWorld;uniform float uAtomicDark;uniform float uAtomicGlow;uniform vec3 uAtomicCenter;uniform float uAtomicRadius;`).replace('#include <dithering_fragment>',`#include <dithering_fragment>
if(uAtomicDark<0.999 || uAtomicGlow>0.001){
 float radial=pow(max(0.0,1.0-length(vAtomicWorld.xz-uAtomicCenter.xz)/uAtomicRadius),2.4);
 gl_FragColor.rgb=gl_FragColor.rgb*(vec3(uAtomicDark)+vec3(1.6,0.95,0.45)*radial*uAtomicGlow)+vec3(0.06,0.026,0.008)*radial*uAtomicGlow;
}`);
   };mat.customProgramCacheKey=()=>cacheKey+'-atomic-radial-v1';mat.needsUpdate=true;}
  });this.uniforms.uAtomicDark.value=1;this.uniforms.uAtomicGlow.value=0;this.uniforms.uAtomicRadius.value=Math.min(v.level.width||96,v.level.depth||96)*.66;v.gunScene.visible=true;v.sky.material.color.setScalar(1);
 }
 update(dt,alpha){const v=this.view,n=v.match?.nuclear,active=n?.active,age=active?n.age:0,dim=active?smooth((age-20)/2):0,o=n?.origin||{x:0,y:0,z:0},blast=n?.impactAge??-1;
  this.uniforms.uAtomicDark.value=1-.9*dim;this.uniforms.uAtomicGlow.value=n?.impacted?(1.7*Math.exp(-blast*.3)+.25)*clamp((9.2-blast)/2,0,1):0;this.uniforms.uAtomicCenter.value.set(o.x,o.y,o.z);v.sky.material.color.setScalar(1-.65*dim);v.gunScene.visible=!n?.restricted;
  this.plane.visible=active&&age>=22&&age<29;if(this.plane.visible){const t=age-24;this.plane.position.set(o.x+t*38,o.y+65,o.z+t*24);this.plane.rotation.y=Math.atan2(-38,-24);}
  const b=n?.bomb;this.bomb.visible=!!(active&&b?.active);if(this.bomb.visible)this.bomb.position.set(b.previous.x+(b.x-b.previous.x)*alpha,b.previous.y+(b.y-b.previous.y)*alpha,b.previous.z+(b.z-b.previous.z)*alpha);
  if(n?.impacted){const q=smooth(blast/.55);v.camera.position.y-=.10*q;v.camera.rotation.x=clamp(v.camera.rotation.x+.28*q,-1.48,1.48);v.camera.rotation.z=-.10*q+Math.sin(blast*23)*Math.exp(-blast*3)*.025;v.camera.updateMatrixWorld(true);}
 }
}
