import * as T from './three.module.min.js';
import {clamp} from './physics.js';
// Faceted body of the cloud. One instanced draw, shared geometry and material;
// translucent wisps are supplied by the existing effects batch.
export class AtomicCloud{
 constructor(scene){const g=new T.IcosahedronGeometry(1,1),p=g.attributes.position,colors=[],c=new T.Color();
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),n=1+.055*Math.sin(x*17+y*13+z*11);p.setXYZ(i,x*n,y*n,z*n);}g.computeVertexNormals();
  const normal=g.attributes.normal;for(let i=0;i<p.count;i++){const k=.66+.24*Math.max(0,normal.getY(i))+.10*Math.max(0,-normal.getX(i));colors.push(k,k,k);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  this.mesh=new T.InstancedMesh(g,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.95,depthWrite:true,fog:false}),44);this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.renderOrder=3;this.mesh.visible=false;scene.add(this.mesh);this.temp=new T.Object3D();this.color=c;this.hot=new T.Color();this.smoke=new T.Color();
 }
 part(x,y,z,sx,sy,sz,angle,hot,smoke,cool){const t=this.temp;t.position.set(x,y,z);t.rotation.set(Math.sin(angle)*.13,angle,Math.cos(angle)*.12);t.scale.set(sx,sy,sz);t.updateMatrix();this.mesh.setMatrixAt(this.index,t.matrix);this.color.setHex(hot).lerp(this.smoke.setHex(smoke),cool);this.mesh.setColorAt(this.index++,this.color);}
 update(operation){const age=operation?.impactAge??-1;this.mesh.visible=!!operation?.impacted&&age>=0&&age<9.2;if(!this.mesh.visible)return;
  const o=operation.origin,g=1-Math.exp(-age*2.8),rise=1-Math.exp(-age*.85),top=o.y+3+rise*26,cap=3+g*16,fade=clamp((9.2-age)/1.5,0,1),cool=clamp((age-2.0)/4,0,1);this.index=0;
  // Voluminous fireball, then a textured column and a filled mushroom cap.
  this.part(o.x,o.y+2.2,o.z,(3+g*4)*(1-age*.025),2.5+g*3,3+g*4,age*.05,0xffd871,0x51463e,cool);
  for(let j=0;j<8;j++){const q=j/8,a=j*1.73+age*.09,swirl=Math.sin(j*.8+age*.5)*.45,y=o.y+2+(top-o.y-3)*q,r=(2.5+g*1.15)*(1+q*.12);this.part(o.x+Math.cos(a)*swirl,y,o.z+Math.sin(a)*swirl,r,2.8+rise*.8,r*.92,a,j%2?0xffad43:0xf77723,j%2?0x77716b:0x5a5551,clamp(cool+q*.25,0,1));}
  this.part(o.x,top+1.8,o.z,cap*.58,4.8*g+1,cap*.58,age*.04,0xffbd5a,0x777271,clamp(cool+.25,0,1));
  for(let ring=0;ring<2;ring++){const count=ring===0?14:20,rad=cap*(ring===0?.47:.87);for(let i=0;i<count;i++){const a=i/count*Math.PI*2+ring*.31,roll=age*.35+i*.67,r=rad+Math.sin(roll)*.45,sy=(ring?3.3:4.5)*g+1,y=top+(ring?-1.4:1.3)+Math.sin(roll)*.55;this.part(o.x+Math.cos(a)*r,y,o.z+Math.sin(a)*r,(ring?4.4:5.4)*g+1.1,sy,(ring?3.8:4.8)*g+1.1,a+age*.025,ring?(i%2?0xffb53e:0xee7924):0xe7a365,i%3?0x68696b:0x85817b,clamp(cool+(ring?-.12:.30),0,1));}}
  this.mesh.count=this.index;this.mesh.material.opacity=.94*fade;this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;
 }
}
