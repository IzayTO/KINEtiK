import * as T from './three.module.min.js';
import {PropParts} from './prop-geometry.js';

const clamp=t=>Math.min(1,Math.max(0,t));
const temp=new T.Object3D(), color=new T.Color();
function casing(kind,mounted){
 const art=new PropParts(), panel=kind==='panel', drum=kind==='drum';
 const tube=(c,y,top,bottom,height)=>art.add(new T.CylinderGeometry(top,bottom,height,10),c,[0,y,0]);
 if(panel){
  art.box(0x414e59,[0,0,0],[.77,.90,.40]);art.box(0x99a49d,[0,0,.21],[.69,.80,.025]);
  for(let i=0;i<4;i++)art.box(0x273035,[-.14,.24-i*.057,.231],[.27,.024,.015]);
  art.box(0x403b28,[.12,-.08,.232],[.20,.26,.015]);art.box(0xffc945,[.12,-.08,.245],[.065,.16,.022],[0,0,-.38]);
  art.box(0xefb45b,[.25,.27,.237],[.055,.045,.018]);
 }else if(drum){
  tube(0xa34430,0,.376,.376,1);for(const y of [-.49,-.27,.27,.49])tube(0x423c36,y,.385,.385,.045);
  art.box(0xe7b35a,[0,.01,.36],[.23,.21,.024]);
 }else{
  tube(0xba352f,-.055,.265,.265,1.01);tube(0xc34434,.496,.13,.264,.10);tube(0x626056,.56,.071,.091,.08);
  art.box(0xcc913e,[0,.635,0],[.19,.053,.065]);
  for(const y of [-.49,.24])tube(0x503b38,y,.27,.27,.061);
  tube(0x6b4039,-.59,.22,.23,.16);
  if(mounted){art.box(0x37454b,[0,-.12,-.296],[.38,.93,.05]);for(const y of [-.58,.20])art.box(0x495158,[0,y,-.18],[.45,.07,.28]);}
 }
 const g=art.finish(),pos=g.attributes.position,normal=g.attributes.normal,uv=[];
 for(let i=0;i<pos.count;i++){const side=Math.abs(normal.getX(i))>.67,top=Math.abs(normal.getY(i))>.7;
  uv.push((side?pos.getZ(i):pos.getX(i))+.5,(top?pos.getZ(i):pos.getY(i))+.65);}
 g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return g;
}
function scorch(){
 const size=32,px=new Uint8Array(size*size*4);
 const pits=[[6,12,4],[16,25,3],[12,17,2],[23,11,5],[2,28,2],[22,3,3]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let edge=8;for(const [cx,cy,r]of pits)edge=Math.min(edge,Math.hypot(x-cx,y-cy)-r);
  const noise=((x*19+y*37+x*y*13)%17)/17,v=edge<-.6?16:edge<.7?127:64+Math.min(5,edge)*12+noise*18;
  px.set([v,v*.88,v*.76,255],(y*size+x)*4);
 }
 const tex=new T.DataTexture(px,size,size);tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.magFilter=T.NearestFilter;tex.needsUpdate=true;return tex;
}
function cloudTexture(){
 const n=32,px=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const u=(x+.5)/16-1,v=(y+.5)/16-1,angle=Math.atan2(v,u);
  const radius=Math.hypot(u,v)+.045*Math.sin(5*angle)+.03*Math.cos(3*angle);
  px.set([255,255,255,Math.round(255*clamp((.99-radius)*2.2)**1.3)],(y*n+x)*4);}
 const tex=new T.DataTexture(px,n,n);tex.magFilter=T.LinearFilter;tex.needsUpdate=true;return tex;
}
export class ReactiveView{
 constructor(view){
  this.view=view;this.group=new T.Group();this.group.visible=false;view.scene.add(this.group);this.entries=[];this.batches=[];
  const sites=view.level.reactiveSites||[],map=scorch();this.textures=[map];
  const clean=new T.MeshLambertMaterial({vertexColors:true}),burn=new T.MeshLambertMaterial({vertexColors:true,map});
  this.materials=[clean,burn];this.geometries=[];
  for(const kind of ['panel','tank','drum'])for(const mounted of [true,false]){
   const rows=sites.filter(p=>p.kind===kind&&p.mounted===mounted);if(!rows.length)continue;
   const g=casing(kind,mounted);this.geometries.push(g);
   const pair=[clean,burn].map(m=>{const mesh=new T.InstancedMesh(g,m,rows.length);mesh.frustumCulled=false;this.group.add(mesh);this.batches.push(mesh);return mesh;});
   rows.forEach((p,i)=>{temp.position.set(p.x,p.y,p.z);temp.rotation.set(0,p.yaw,0);temp.scale.setScalar(1);temp.updateMatrix();
    this.entries[p.id]={pair,i,matrix:temp.matrix.clone(),damaged:null};});
  }
  const tex=cloudTexture();this.textures.push(tex);
  const smoke=new T.MeshBasicMaterial({map:tex,transparent:true,opacity:.78,depthWrite:false});
  const flame=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:T.AdditiveBlending});
  const spark=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});
  const plane=new T.PlaneGeometry(1,1),arc=new PropParts();
  for(let j=0;j<3;j++){
   const pts=[[0,0,0],[.26,.31,.09],[.19,.40,.16],[.66,.61,.22],[.58,.71,.24],[1,.85,.27]];
   for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],ang=j*2.094,k=.023;
    const point=(v,offset)=>[(v[0]+offset)*Math.cos(ang)-v[2]*Math.sin(ang),v[1],(v[0]+offset)*Math.sin(ang)+v[2]*Math.cos(ang)];
    arc.facet([point(a,0),point(a,k),point(b,0),point(b,0),point(a,k),point(b,k)],0xffffff);}
  }
  const bolt=arc.finish();this.geometries.push(plane,bolt);this.materials.push(smoke,flame,spark);
  const fx=(g,m,n)=>{const mesh=new T.InstancedMesh(g,m,Math.max(1,sites.length*n));mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.group.add(mesh);this.batches.push(mesh);return mesh;};
  this.smoke=fx(plane,smoke,12);this.smoke.renderOrder=4;this.flame=fx(plane,flame,11);this.flame.renderOrder=5;this.arc=fx(bolt,spark,4);
 }
 update(m,camera){
  this.group.visible=true;
  const zero=this.zero??=new T.Matrix4().makeScale(0,0,0);
  for(const p of m.reactive.items){const s=this.entries[p.id],damaged=!!p.owner;if(s.damaged===damaged)continue;s.damaged=damaged;
   s.pair.forEach((mesh,j)=>{mesh.setMatrixAt(s.i,!!j===damaged?s.matrix:zero);mesh.instanceMatrix.needsUpdate=true;});}
  const {flame,smoke,arc}=this;flame.count=smoke.count=arc.count=0;
  const emit=(mesh,shade)=>{temp.updateMatrix();mesh.setMatrixAt(mesh.count,temp.matrix);mesh.setColorAt(mesh.count++,color.setHex(shade));};
  for(const p of m.reactive.active){const t=m.time-p.born;if(t>=6)continue;
   if(p.kind==='panel'){
    if(t>=3)continue;
    for(let i=0;i<4;i++){const tick=t*2%1,k=(1-tick)*(.64+.17*i);
     temp.position.set(p.x,p.y-.12,p.z);temp.rotation.set(i*.47,i*1.81+Math.floor(t*2)*.61,p.yaw+.5*i);
     temp.scale.set(2.7*k,k*1.45,2*k);emit(arc,i%2?0x75baff:0xe6faff);}
    continue;
   }
   const fire=t<3,amount=fire?11:12;
   for(let i=0;i<amount;i++){
    const a=i*2.4+p.id*.73,phase=(t*(fire?1.48:.40)+i*.31)%1;
    const radius=fire?(i%5)*1.9*clamp(t*4):1+(i%5)*1.85;
    const s=fire?(1-phase*.53)*(t<.21?3.8:1.55):3+phase*2.8;
    const end=fire?clamp((3-t)*8):clamp((6-t)*3);
    temp.position.set(p.x+Math.cos(a)*radius,p.y+(fire?.10:.34)+phase*(fire?2.05:3),p.z+Math.sin(a)*radius);
    temp.quaternion.copy(camera.quaternion);temp.rotateZ(.13*Math.sin(a+t));temp.scale.set(s*end,s*(fire?1.75:.88)*end,1);
    emit(fire?flame:smoke,fire?(i%3?0xff8224:0xffdc73):(i%3?0x52575b:0x383f46));
   }
  }
  for(const mesh of [smoke,flame,arc]){mesh.visible=mesh.count>0;if(mesh.count){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}}
 }
 dispose(){this.group.removeFromParent();for(const m of this.batches)m.dispose();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();}
}
