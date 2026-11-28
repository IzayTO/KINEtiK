import * as T from './three.module.min.js';

// Half-width, length, lifetime, lobes, width of the central flame and amber tip.
const profiles={
 pistol:  {row:0,r:.095,length:.19,time:.062,lobes:4,core:.27,tip:37},
 rifle:   {row:1,r:.126,length:.32,time:.072,lobes:6,core:.24,tip:52},
 shotgun: {row:2,r:.217,length:.34,time:.101,lobes:7,core:.46,tip:24},
 sniper:  {row:3,r:.148,length:.49,time:.086,lobes:5,core:.21,tip:63},
 rocket:  {row:4,r:.192,length:.56,time:.146,lobes:4,core:.53,tip:30}
};
const saturate=x=>Math.min(1,Math.max(0,x));
const smooth=x=>{x=saturate(x);return x*x*(3-2*x);};
function atlas(){
 const n=64,w=n*2,h=n*5,rgba=new Uint8Array(w*h*4);
 for(const p of Object.values(profiles)){
  for(let y=0;y<n;y++)for(let x=0;x<w;x++){
   const u=(x%n+.5)/n,v=(y+.5)/n,Y=v*2-1,X=u*2-1;
   let edge,hot,halo;
   if(x<n){
    const r=Math.hypot(X,Y),a=Math.atan2(Y,X);
    const wave=Math.cos(p.lobes*a+.52*Math.sin(3*a+.7*p.row));
    const ray=Math.pow(Math.max(0,wave),5)*(.56+.12*Math.cos(2*a-.7));
    const width=p.core+ray;
    edge=smooth((width-r)/(.075+.18*width));
    hot=saturate(1-r/(width*.88));halo=.25*Math.exp(-7*r*r)*(1-smooth((r-.73)/.25));
   }else{
    // Three overlapping flame tongues with tapered, scalloped edges.
    const center=.11*Math.sin(8*v+p.row)*v;
    const taper=Math.max(0,1-v);
    const width=(.13+.59*Math.sin(Math.PI*Math.pow(v,.62)))*taper**.55;
    const tongue=(offset,len,spread)=>v<len?1-Math.abs(X-center-offset*v)/(width*spread+.002):0;
    const f=Math.max(tongue(0,.99,.67),tongue(.77,.66,.41),tongue(-.94,.77,.44));
    edge=smooth(f*3)*smooth(v*24)*smooth(taper*12);hot=saturate(f*taper);
    halo=.19*Math.exp(-X*X/(width*width+.02))*smooth(v*28)*taper;
   }
   const i=((p.row*n+y)*w+x)*4;
   rgba[i]=255;rgba[i+1]=Math.round(100+155*smooth(hot*2.7));
   rgba[i+2]=Math.round(p.tip+(247-p.tip)*smooth((hot-.12)*2.5));
   rgba[i+3]=Math.round(255*saturate(edge+.80*halo));
  }
 }
 const t=new T.DataTexture(rgba,w,h);t.colorSpace=T.SRGBColorSpace;
 t.minFilter=t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
}
const corners=[[0,0],[1,0],[1,1],[0,1]];
function geometry(){
 const g=new T.BufferGeometry(),verts=[];
 for(const [u,v] of corners)verts.push(2*u-1,2*v-1,-.16);
 for(const [u,v] of corners)verts.push(2*u-1,0,-v);
 for(const [u,v] of corners)verts.push(0,2*u-1,-v);
 g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
 g.setAttribute('uv',new T.BufferAttribute(new Float32Array(24),2));
 g.setIndex([0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11]);return g;
}
export function makeFlareFactory(){
 const map=atlas();
 return scene=>{
  const mat=new T.MeshBasicMaterial({map,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false});
  mat.forceSinglePass=true;
  const mesh=new T.Mesh(geometry(),mat);mesh.visible=false;scene.add(mesh);
  return mesh;
 };
}
export function igniteFlare(mesh,kind,time){
 const p=profiles[kind],state=mesh.userData;
 if(state.profile!==p){
  const uv=mesh.geometry.attributes.uv;
  for(let face=0;face<3;face++)corners.forEach(([u,v],j)=>{
   uv.setXY(face*4+j,((face?64:0)+.5+u*63)/128,(p.row*64+.5+v*63)/320);
  });
  uv.needsUpdate=true;state.profile=p;
 }
 state.born=time;state.roll=Math.random()*Math.PI*2;state.size=.90+Math.random()*.20;
 animateFlare(mesh,time);
}
export function animateFlare(mesh,time){
 const s=mesh.userData,p=s.profile;if(!p){mesh.visible=false;return;}
 const t=(time-s.born)/p.time;mesh.visible=t>=0&&t<1;if(!mesh.visible)return;
 const bloom=s.size*(.77+.34*smooth(t/.24))*(1-.48*t*t);
 mesh.scale.set(p.r*bloom,p.r*bloom,p.length*s.size*(.63+.48*smooth(t/.32))*(1-.38*t));
 mesh.material.opacity=(1-smooth((t-.19)/.81))*.97;
}
