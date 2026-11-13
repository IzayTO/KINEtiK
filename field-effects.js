/* Batched translucent effects: one shared sprite atlas + one mottled ground texture.
   Cached ground samples, bounded buffers, no dynamic light, shadow or postprocess. */
import * as T from './three.module.min.js';
import {clamp} from './physics.js';
import {floorAt,fireRadius,THROWABLES,GAS_ACTIVE,GAS_FADE,AREA_LIMIT} from './ordnance.js';
import {obstruction} from './navigation.js';
const CORNERS=[[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]],MAX_QUADS=4096,SECTORS=48;
const hash=(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;}
function texture(w,h,pixel){const bytes=new Uint8Array(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++)bytes.set(pixel(x,y),(y*w+x)*4);const tex=new T.DataTexture(bytes,w,h);tex.magFilter=T.LinearFilter;tex.minFilter=T.LinearMipmapLinearFilter;tex.generateMipmaps=true;tex.needsUpdate=true;return tex;}
function atlas(){const size=128;return texture(size*4,size,(x,y)=>{const type=Math.floor(x/size),u=((x%size)+.5)/size,v=(y+.5)/size,X=(u-.5)*2,Y=(v-.5)*2,r=Math.hypot(X,Y),n=noise(u*9+type*23,v*8);let a;
 if(type===0){a=Math.pow(clamp(1-r*.94-(n-.5)*.28,0,1),1.25)*(.60+.4*noise(u*20,v*20));}
 else if(type===1){const center=.50+.075*Math.sin(v*10)+.04*Math.sin(v*19),width=.40*Math.pow(1-v,.72)+.012,shape=clamp(1-Math.abs(u-center)/width,0,1);a=Math.pow(shape,.85)*clamp(v*14,0,1)*clamp((1-v)*10,0,1)*(.55+.45*n);}
 else if(type===2){a=Math.pow(clamp(1-r,0,1),.6);}
 else{a=Math.pow(clamp(1-r,0,1),2)*(.4+.6*n);}
 return[255,255,255,Math.round(a*255)];});}
function scarTexture(){const tex=texture(256,256,(x,y)=>{const u=(x+.5)/256,v=(y+.5)/256,r=Math.hypot((u-.5)*2,(v-.5)*2),n=noise(u*13,v*13),fine=noise(u*58,v*58),edge=clamp((1-r+(n-.5)*.31)*7,0,1),holes=clamp((n-.18)*2.6,0,1),k=.35+.65*fine;return[Math.round(26+37*k),Math.round(22+22*k),Math.round(18+10*k),Math.round(edge*holes*(.65+.35*fine)*235)];});tex.colorSpace=T.SRGBColorSpace;return tex;}
function geometry(vertices){const g=new T.BufferGeometry();for(const [name,n]of [['position',3],['color',4],['uv',2]])g.setAttribute(name,new T.BufferAttribute(new Float32Array(vertices*n),n).setUsage(T.DynamicDrawUsage));return g;}
export class FieldEffects{
 constructor(view){this.view=view;this.shapes=new Map();this.color=new T.Color();this.right=new T.Vector3();this.up=new T.Vector3();this.g=geometry(MAX_QUADS*6);this.mesh=new T.Mesh(this.g,new T.MeshBasicMaterial({map:atlas(),vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide}));this.mesh.frustumCulled=false;this.mesh.renderOrder=4;view.scene.add(this.mesh);
 this.ground=geometry(AREA_LIMIT*SECTORS*3);this.marks=new T.Mesh(this.ground,new T.MeshBasicMaterial({map:scarTexture(),vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));this.marks.frustumCulled=false;this.marks.renderOrder=3;view.scene.add(this.marks);this.mesh.visible=this.marks.visible=false;}
 reset(){this.shapes.clear();this.mesh.visible=this.marks.visible=false;}
 quad(x,y,z,w,h,color,alpha,type=0,angle=0){if(this.count>=MAX_QUADS||alpha<.008)return;const at=this.count++*6,p=this.g.attributes.position,c=this.g.attributes.color,uv=this.g.attributes.uv,col=this.color.setHex(color),ca=Math.cos(angle),sa=Math.sin(angle);for(let i=0;i<6;i++){const [cx,cy]=CORNERS[i],sx=cx*w*.5,sy=cy*h*.5,rx=sx*ca-sy*sa,ry=sx*sa+sy*ca;p.setXYZ(at+i,x+this.right.x*rx+this.up.x*ry,y+this.right.y*rx+this.up.y*ry,z+this.right.z*rx+this.up.z*ry);c.setXYZW(at+i,col.r,col.g,col.b,clamp(alpha,0,1));uv.setXY(at+i,(type+(cx+1)*.5*.98+.01)/4,(cy+1)*.49+.01);}}
 shape(z){let cached=this.shapes.get(z.id);if(cached)return cached;const m=this.view.match,origin={x:z.x,y:z.y+.22,z:z.z},nearby=m.world.query(z.x,z.z,THROWABLES.molotov.radius+1),valid=(x,Z)=>{const f=floorAt(m.world,{x,y:z.y+.5,z:Z},1.2);return f&&Math.abs(f.y-z.y)<.7&&obstruction(nearby,origin,{x,y:f.y+.22,z:Z})>.999?f:null;},edge=[];
  for(let i=0;i<=SECTORS;i++){const angle=i/SECTORS*Math.PI*2,r=fireRadius(z,z.start+1,angle),dx=Math.cos(angle),dz=Math.sin(angle),fraction=obstruction(nearby,origin,{x:z.x+dx*r,y:origin.y,z:z.z+dz*r});let d=Math.max(0,r*fraction-.045),f=valid(z.x+dx*d,z.z+dz*d);for(let n=0;!f&&n<8;n++){d*=.7;f=valid(z.x+dx*d,z.z+dz*d);}edge.push(f||{x:z.x,y:z.y,z:z.z});}
  const flames=[];for(let i=0;i<62;i++){const a=i*2.399+z.seed,r=Math.sqrt((i+.5)/62)*fireRadius(z,z.start+1,a)*.96;const f=valid(z.x+Math.cos(a)*r,z.z+Math.sin(a)*r);if(f)flames.push({x:f.x,y:f.y,z:f.z,seed:i*.731});}
  cached={edge,flames};this.shapes.set(z.id,cached);return cached;
 }
 explosion(z,age){const scale=z.kind==='rc'?1.32:1,fade=clamp((1.5-age)/.75,0,1),ramp=1-Math.exp(-age*15);if(age<.19)this.quad(z.x,z.y+.4,z.z,(1.2+ramp*3.4)*scale,(1.2+ramp*3.4)*scale,0xffeac1,(1-age/.19)*.9,2);
  for(let i=0;i<18;i++){const a=i*2.399+z.seed,ring=.25+age*(1.5+(i%4)*.32),x=z.x+Math.cos(a)*ring*scale,Z=z.z+Math.sin(a)*ring*scale,y=z.y+.45+age*(.7+(i%5)*.24),size=(.55+ramp*.6+age*.95)*scale;this.quad(x,y,Z,size,size*(1.05+(i%3)*.1),age<.30?(i%2?0xffa047:0xe45d29):i%2?0x595b54:0x77776a,fade*(age<.3?.68:.38),0,a*.3);
   if(i<9&&age<.55)this.quad(x,y+.1,Z,size*.45,size*.8,0xffd48a,clamp((.55-age)/.4,0,1)*.8,1,Math.sin(a)*.6);
  }
  // Low dust skirt and short hot fragments read as a blast, not a single soft blob.
  for(let i=0;i<12;i++){const a=i*Math.PI/6+z.seed,r=(.3+age*4.2)*scale;this.quad(z.x+Math.cos(a)*r,z.y+.12+age*.12,z.z+Math.sin(a)*r,(.7+age*1.5)*scale,.3+age*.3,0xa99e7c,fade*.24,0);if(age<.65){const d=(.6+age*(4+i%3))*scale;this.quad(z.x+Math.cos(a)*d,z.y+.3+age*(2.8+i%2)-age*age*4,z.z+Math.sin(a)*d,.035,.11,0xffd293,(1-age/.65)*.85,2,-a);}}
 }
 update(time){const m=this.view.match;if(!m)return;this.count=0;this.floorCount=0;this.right.setFromMatrixColumn(this.view.camera.matrixWorld,0);this.up.setFromMatrixColumn(this.view.camera.matrixWorld,1);
  for(const z of m.ordnance.areas){if(!z.active)continue;const age=Math.max(0,time-z.start);
   if(z.kind==='grenade'||z.kind==='rc'){this.explosion(z,age);continue;}
   if(z.kind==='gas'){const fade=clamp(age/.4,0,1)*clamp((GAS_ACTIVE+GAS_FADE-age)/GAS_FADE,0,1);for(let i=0;i<15;i++){const a=i*2.399+z.seed+Math.sin(time*.6+i)*.10,r=(i%4)*.52;this.quad(z.x+Math.cos(a)*r,z.y+.55+(i%3)*.56+Math.sin(time*1.3+i)*.13,z.z+Math.sin(a)*r,1.7,1.6,i%2?0xb7c66b:0x8ca850,fade*.34,0,i*.2);}continue;}
   const shape=this.shape(z),growth=clamp(age,0,1),opacity=age<=11?.90:.90*clamp((26-age)/15,0,1),p=this.ground.attributes.position,c=this.ground.attributes.color,uv=this.ground.attributes.uv,R=THROWABLES.molotov.radius;
   for(let i=0;i<SECTORS;i++)for(const f of [z,shape.edge[i],shape.edge[i+1]]){const n=this.floorCount++,dx=f.x-z.x,dz=f.z-z.z;p.setXYZ(n,z.x+dx*growth,z.y+(f.y-z.y)*growth+.025,z.z+dz*growth);c.setXYZW(n,1,1,1,opacity);uv.setXY(n,.5+dx/(2*R),.5+dz/(2*R));}
   if(age<11){const fade=clamp((11-age)/3,0,1),far=((this.view.camera.position.x-z.x)**2+(this.view.camera.position.z-z.z)**2)>1600,stride=far?2:1;for(let i=0;i<shape.flames.length;i+=stride){const f=shape.flames[i];if(Math.hypot(f.x-z.x,f.z-z.z)>THROWABLES.molotov.radius*growth)continue;const wave=.5+.5*Math.sin(time*7+f.seed),h=.55+wave*.72,x=f.x,Z=f.z,sway=Math.sin(time*3.3+f.seed)*.12;this.quad(x+sway,f.y+h*.49,Z,.55+wave*.20,h,0xf66f20,fade*.83,1,sway*.35);this.quad(x+sway*.6,f.y+h*.23,Z,.28,h*.49,0xffce67,fade*.78,1);if(i%5===0)this.quad(x,f.y+1.1+wave*.6,Z,1.0,1.5,0x4b504a,fade*.17,0);}}
  }
  this.g.setDrawRange(0,this.count*6);this.ground.setDrawRange(0,this.floorCount);for(const [g,count]of [[this.g,this.count*6],[this.ground,this.floorCount]])if(count)for(const a of Object.values(g.attributes)){a.clearUpdateRanges();a.addUpdateRange(0,count*a.itemSize);a.needsUpdate=true;}this.mesh.visible=this.count>0;this.marks.visible=this.floorCount>0;for(const id of this.shapes.keys())if(!m.ordnance.areas.some(z=>z.active&&z.id===id))this.shapes.delete(id);
 }
}
