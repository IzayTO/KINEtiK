import * as T from './three.module.min.js';
import {PROJECTILE_LIMIT} from './ordnance.js';
import {BOTS} from './visor-designs.js';
import {COLS,ROWS,CUTOUT,WEAPON_KEYS,charms} from './charm-designs.js';

const rollAxis=new T.Vector3(0,0,1),hang=new T.Quaternion();
const indices=new Map(WEAPON_KEYS.map((kind,i)=>[kind,i]));
// Local attachment, panel width in metres, facing angle, and drop in panel widths.
const mounts={
 rifle:[-.100,.044,-.540,.145,-.90,.24],
 shotgun:[-.114,.030,-.550,.136,-.85,.20],
 pistol:[-.065,.033,-.245,.084,-.60,.20],
 sniper:[-.035,.024,-.930,.137,-.65,.27],
 knife:[.007,.020,.131,.083,1.75,.24],
 grenade:[-.053,.159,.014,.078,-.55,.105],
 molotov:[-.027,.190,.032,.090,-.55,.16],
 gas:[-.036,.155,.043,.085,-.35,.10],
 antidote:[-.046,.094,.018,.064,-.60,.14],
 rocket:[-.145,-.050,-.510,.145,-1,.24]
};
// Surface points on the original meshes. A narrow metal bail links each one
// to the chain, so the panel can hang clear of the support hand.
const sockets={
 rifle:[-.059,.044,-.5392],shotgun:[-.0711,-.0008,-.5499],pistol:[-.0377,.033,-.2339],
 sniper:[-.0237,.027,-.930],knife:[.0069,.0201,.1308],grenade:[-.0606,.1565,.006],
 molotov:[-.0177,.190,.0177],gas:[-.0283,.155,.0283],antidote:[-.046,.092,.018],
 rocket:[-.1185,-.050,-.5099]
};
const soldierMounts={
 rifle:[-.046,-.027,-.366,.101,-.86,.33],shotgun:[-.058,-.031,-.395,.103,-.84,.30],
 pistol:[-.041,.001,-.168,.074,-.81,.25],sniper:[-.025,.023,-.65,.099,-.79,.27],
 knife:[-.016,.020,-.052,.068,1.62,.24]
};
export function charmMount(kind,soldier=false){return (soldier&&soldierMounts[kind])||mounts[kind];}

export class CharmAtlas{
 constructor(library=charms,actorRows=BOTS+1){
  this.rows=actorRows;this.width=COLS*WEAPON_KEYS.length;this.height=ROWS*actorRows;
  this.bytes=new Uint8Array(this.width*this.height*4);
  this.texture=new T.DataTexture(this.bytes,this.width,this.height);
  this.texture.colorSpace=T.SRGBColorSpace;this.texture.generateMipmaps=false;
  this.texture.magFilter=this.texture.minFilter=T.NearestFilter;
  if(library){
   const refresh=keys=>{
    if(keys){for(const key of keys){const id=Math.floor(key/WEAPON_KEYS.length),kind=WEAPON_KEYS[key%WEAPON_KEYS.length];this.write(id,kind,library.get(id,kind));}}
    else for(let id=0;id<this.rows;id++)for(const kind of WEAPON_KEYS)this.write(id,kind,library.get(id,kind));
   };
   refresh(null);this.unsubscribe=library.subscribe(refresh);
  }
 }
 write(id,kind,pixels){
  const col=indices.get(kind)*COLS,top=id*ROWS;
  for(let y=0;y<ROWS;y++){
   let pos=((top+y)*this.width+col)*4;
   for(let x=0;x<COLS;x++){
    const code=pixels[y*COLS+x],rgb=code?code-1:0x12191e;
    this.bytes[pos++]=rgb>>16;this.bytes[pos++]=(rgb>>8)&255;this.bytes[pos++]=rgb&255;this.bytes[pos++]=code===CUTOUT?0:255;
   }
  }
  this.texture.needsUpdate=true;
 }
 dispose(){this.unsubscribe?.();this.texture.dispose();}
}

// In the local geometry, (0,0,0) is the anchor. Only hardware vertices lie
// behind the top centre of the display, and all 24 × 10 texels share one quad.
function tagGeometry(){
 const positions=[],uvs=[],parts=[],drops=[],joints=[],indices=[];
 function quad(corners,part,dropValues,uv=[[0,0],[1,0],[1,1],[0,1]],weights=[0,0,0,0]){
  const i=positions.length/3;
  for(let j=0;j<4;j++){positions.push(...corners[j]);uvs.push(...uv[j]);parts.push(part);drops.push(dropValues[j]);joints.push(weights[j]);}
  indices.push(i,i+1,i+2,i,i+2,i+3);
 }
 // UV y increases from bottom to top; atlas row zero is the artist's top row.
 quad([[-.5,-ROWS/COLS,.014],[.5,-ROWS/COLS,.014],[.5,0,.014],[-.5,0,.014]],1,[1,1,1,1]);
 // Low-profile bracket from the hardpoint on the weapon to the chain pivot.
 const sleeve=[[0,.017,-.044],[0,-.017,-.044],[0,-.017,-.010],[0,.017,-.010]];
 for(let i=0;i<4;i++){
  const a=sleeve[i],b=sleeve[(i+1)%4];
  quad([a,b,b,a],.34,[0,0,0,0],undefined,[0,0,1,1]);
 }
 // Two interlocking angular links behind the face. A per-instance multiplier
 // shortens the connection on a grenade without shrinking the LEDs.
 for(let link=0;link<2;link++){
  const top=link*.47,bottom=top+.53;
  const ring=[[-.052,.18],[0,0],[.052,.18],[.052,.80],[0,1],[-.052,.80]];
  for(let j=0;j<6;j++){
   const pair=[ring[j],ring[(j+1)%6]];
   const pts=[],ds=[];
   for(const [pt,inner] of [[pair[0],false],[pair[1],false],[pair[1],true],[pair[0],true]]){
    const x=pt[0]*(inner?.57:1), y=inner?.18+pt[1]*.64:pt[1];
    pts.push([x*(link?.53:1),0,(link?x*.56:0)-.026]);ds.push(top+y*(bottom-top));
   }
   quad(pts,link?0.48:0.63,ds);
  }
 }
 // Mounting tab is behind the top two LED rows, never in front of either face.
 quad([[-2/COLS,-.035,-.030],[2/COLS,-.035,-.030],[.060,.018,-.030],[-.060,.018,-.030]],0,[1,1,1,1]);
 const g=new T.BufferGeometry();g.setIndex(indices);g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('part',new T.Float32BufferAttribute(parts,1));
 g.setAttribute('dropWeight',new T.Float32BufferAttribute(drops,1));g.setAttribute('joinWeight',new T.Float32BufferAttribute(joints,1));return g;
}
const vertexShader=`
 attribute vec3 tile; attribute vec3 socketDelta; attribute float part; attribute float dropWeight; attribute float joinWeight;
 varying vec2 vTile; varying vec2 grid; varying float vPart;
 void main(){
  vec3 p=position+socketDelta*joinWeight;p.y-=tile.z*dropWeight;
  grid=uv;vTile=tile.xy;vPart=part;
  gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(p,1.);
 }`;
const fragmentShader=`
 uniform sampler2D atlas;uniform vec2 atlasSize;
 varying vec2 vTile;varying vec2 grid;varying float vPart;
 void main(){
  if(vPart>.9){
   vec2 coord=vec2(gl_FrontFacing?grid.x:1.-grid.x,1.-grid.y);
   vec2 cell=clamp(floor(coord*vec2(24.,10.)),vec2(0.),vec2(23.,9.));
   gl_FragColor=texture2D(atlas,(vTile+cell+.5)/atlasSize);
   if(gl_FragColor.a<.5)discard;
  }else{
   // On the rear, keep the hidden tab from overprinting the back of the screen.
   if(vPart<.01 && grid.y<.68)discard;
   gl_FragColor=vec4(mix(vec3(.009,.012,.015),vec3(.19,.22,.22),vPart),1.);
  }
  #include <colorspace_fragment>
 }`;
export class CharmBatch{
 constructor(parent,atlas,capacity){
  const geometry=tagGeometry();
  this.tiles=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage);
  this.socketDeltas=new T.InstancedBufferAttribute(new Float32Array(capacity*3),3).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('tile',this.tiles);geometry.setAttribute('socketDelta',this.socketDeltas);
  const material=new T.ShaderMaterial({uniforms:{atlas:{value:atlas.texture},atlasSize:{value:new T.Vector2(atlas.width,atlas.height)}},vertexShader,fragmentShader,side:T.DoubleSide,toneMapped:false});
  this.mesh=new T.InstancedMesh(geometry,material,capacity);this.mesh.count=0;this.mesh.frustumCulled=false;
  this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);parent.add(this.mesh);
  this.local=new T.Object3D();this.matrix=new T.Matrix4();this.delta=new T.Vector3();this.inverse=new T.Quaternion();this.used=0;
 }
 begin(){this.used=0;}
 add(id,kind,base,swing=0,twist=0,soldier=false,slideZ=0,cant=0){
  const mount=charmMount(kind,soldier);if(!mount)return;
  const [x,y,z,size,yaw,drop]=mount,o=this.local;
  o.position.set(x,y,z+slideZ);o.scale.setScalar(size);o.rotation.set(swing*.45,yaw*(1-.58*cant)+twist,swing,'YXZ');
  // The socket rolls with the weapon. Gravity keeps the hanging LEDs underneath it.
  if(cant)o.quaternion.premultiply(hang.setFromAxisAngle(rollAxis,.68*cant));
  o.updateMatrix();
  const i=this.used++;this.matrix.multiplyMatrices(base,o.matrix);this.mesh.setMatrixAt(i,this.matrix);
  this.tiles.setXYZ(i,indices.get(kind)*COLS,id*ROWS,drop);
  const d=this.delta;
  if(soldier)d.set(.006,0,0);
  else{const socket=sockets[kind];d.set(socket[0]-x,socket[1]-y,socket[2]-z);}
  d.applyQuaternion(this.inverse.copy(o.quaternion).invert()).multiplyScalar(1/size);
  this.socketDeltas.setXYZ(i,d.x,d.y,d.z);
 }
 end(){this.mesh.count=this.used;if(this.used){this.mesh.instanceMatrix.needsUpdate=true;this.tiles.needsUpdate=true;this.socketDeltas.needsUpdate=true;}}
 dispose(){this.mesh.removeFromParent();this.mesh.dispose();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}

export function swingTarget(time,actor){
 const arsenal=actor.arsenal,body=actor.body,phase=time*(body.speed>8?10.2:7.1)+actor.id*.72;
 const stride=Math.min(1,body.speed/10);
 const running=!body.sliding&&(body.state==='SPRINT'||body.state==='CORRIENDO');
 const motion=running?.83:1.24;
 const age=arsenal.time-arsenal.lastShot;
 const kick=age>=0&&age<.42?Math.sin(age*29)*Math.exp(-age*8)*.27:0;
 return motion*(Math.sin(phase)*(.026+stride*.31)+(body.sliding?-.19:0)+kick+
  (arsenal.reload?Math.sin(arsenal.reloadProgress*Math.PI*2)*.23:0));
}
export class MatchCharms{
 constructor(view){
  this.atlas=new CharmAtlas();this.hand=new CharmBatch(view.gunScene,this.atlas,1);this.actors=new CharmBatch(view.scene,this.atlas,BOTS+1+PROJECTILE_LIMIT);
  this.angles=new Float32Array(BOTS+1);
 }
 update(view,dt){
  const m=view.match;this.hand.begin();
  if(m){
   const time=m.time,follow=1-Math.exp(-17*dt);
   for(const r of view.soldiers.rigs){
    const a=r.bot,id=a.id,swing=this.angles[id]+(swingTarget(time,a)-this.angles[id])*follow;this.angles[id]=swing;
    const field=time-a.antidoteAt<.6?'antidote':a.throwAction?.kind||a.held;
    const kind=field||a.arsenal.weapon.id;
    if(a.atomicDown||!a.alive||field&&a.throwAction?.released&&field!=='antidote'&&field!=='rocket')continue;
    if(a.human&&!m.remote.engaged){
     if((view.scoped&&!view.cantedScope)||m.nuclear.impacted)continue;
     const model=view.models[a.arsenal.selected];
     const root=field?view.field.handItems[field]:(model.item||model.root);
     if(!root?.visible)continue;
     root.updateWorldMatrix(true,false);
     const slideZ=kind==='shotgun'?model.pump.position.z-view.restingWeaponParts.get(model.pump).elements[14]:0;
     this.hand.add(id,kind,root.matrixWorld,swing,swing*.28,false,slideZ,view.aim*(view.weaponFX?.cant||0));
    }else if(!field){
     this.actors.add(id,kind,r.gun.matrixWorld,swing,swing*.28,true);
    }
   }
  }
  this.hand.end();this.actors.end();
 }
 dispose(){this.hand.dispose();this.actors.dispose();this.atlas.dispose();}
}
