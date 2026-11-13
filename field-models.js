import * as T from './three.module.min.js';
import {rocketGeometry} from './rocket-model.js';
const cache=new Map(),material=new T.MeshLambertMaterial({vertexColors:true,flatShading:true});
export function itemGeometry(kind){if(kind==='rocket'||kind==='rocket-projectile')return rocketGeometry(kind==='rocket-projectile');if(cache.has(kind))return cache.get(kind);const positions=[],colors=[],matrix=new T.Matrix4();
 const add=(g,color,x,y,z,sx=1,sy=1,sz=1,rz=0)=>{const geom=g.index?g.toNonIndexed():g;matrix.compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),rz),new T.Vector3(sx,sy,sz));geom.applyMatrix4(matrix);positions.push(...geom.attributes.position.array);const c=new T.Color(color);for(let i=0;i<geom.attributes.position.count;i++)colors.push(c.r,c.g,c.b);geom.dispose();if(g!==geom)g.dispose();};
 const box=(color,x,y,z,w,h,d)=>add(new T.BoxGeometry(w,h,d),color,x,y,z);
 const tube=(color,x,y,z,rt,rb,h)=>add(new T.CylinderGeometry(rt,rb,h,8),color,x,y,z);
 if(kind==='grenade'){add(new T.IcosahedronGeometry(.095,1),0x596747,0,0,0,1,1.35,1);for(const y of [-.06,0,.06])tube(0x293c37,0,y,0,.096,.096,.009);tube(0xb3bba4,0,.14,0,.035,.045,.05);box(0x263a39,.045,.09,0,.025,.20,.05);add(new T.TorusGeometry(.035,.006,4,10),0xc1c5ae,-.03,.17,0);}
 if(kind==='molotov'){tube(0x68754c,0,-.02,0,.065,.073,.23);tube(0x737e52,0,.12,0,.025,.065,.07);tube(0x8c9869,0,.19,0,.025,.025,.09);box(0xb3a781,0,-.025,-.069,.09,.10,.008);box(0x594d3e,0,.23,0,.042,.04,.035);add(new T.BoxGeometry(.036,.13,.02),0xe0bd77,.025,.285,0,1,1,1,-.4);}
 if(kind==='gas'){tube(0x788d54,0,0,0,.07,.085,.19);tube(0xc7cfa1,0,.115,0,.044,.070,.04);tube(0x384a3b,0,.15,0,.04,.04,.04);box(0xe2cf69,0,-.01,-.083,.11,.09,.012);box(0x394a39,0,-.01,-.092,.065,.018,.009);box(0x394a39,-.025,-.01,-.095,.012,.065,.01);}
 if(kind==='antidote'){tube(0xd1e2d7,0,0,0,.025,.025,.20);tube(0x7ad5c6,0,-.01,0,.026,.026,.07);tube(0x405a60,0,.14,0,.009,.009,.09);box(0x69c8bf,0,.19,0,.085,.022,.04);box(0xbcd0c4,0,.075,0,.105,.013,.035);tube(0xa1afb2,0,-.15,0,.003,.009,.09);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();cache.set(kind,g);return g;
}
export function itemModel(kind){return new T.Mesh(itemGeometry(kind),material);}
// One-time CPU projection of the actual model triangles, cached as a small image.
// No extra WebGL context, scene camera, network texture or per-frame thumbnail pass.
export function modelThumbnail(root){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),tri=[],matrix=new T.Matrix4(),v=new T.Vector3(),co=new T.Color();let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 root.traverse(o=>{if(!o.isMesh||!o.visible)return;for(let p=o.parent;p&&p!==root;p=p.parent)if(!p.visible)return;matrix.multiplyMatrices(inv,o.matrixWorld);const g=o.geometry,p=g.attributes.position,c=g.attributes.color,idx=g.index,n=idx?idx.count:p.count;
  for(let i=0;i<n;i+=3){const pts=[];let depth=0;for(let j=0;j<3;j++){const k=idx?idx.getX(i+j):i+j;v.fromBufferAttribute(p,k).applyMatrix4(matrix);const x=-v.z+.13*v.x,y=v.y,X=x*.866-y*.5,Y=x*.5+y*.866;minX=Math.min(minX,X);maxX=Math.max(maxX,X);minY=Math.min(minY,Y);maxY=Math.max(maxY,Y);depth+=v.x;pts.push([X,Y]);}if(c)co.setRGB(c.getX(idx?idx.getX(i):i),c.getY(idx?idx.getX(i):i),c.getZ(idx?idx.getX(i):i));else co.copy(o.material.color);co.multiplyScalar(.78+.12*((i/3)%3));tri.push({pts,depth,color:co.getStyle()});}
 });
 const canvas=document.createElement('canvas');canvas.width=192;canvas.height=128;const ctx=canvas.getContext('2d'),scale=Math.min(174/Math.max(.01,maxX-minX),112/Math.max(.01,maxY-minY));tri.sort((a,b)=>a.depth-b.depth);for(const t of tri){ctx.fillStyle=t.color;ctx.beginPath();t.pts.forEach(([x,y],i)=>{const X=96+(x-(minX+maxX)/2)*scale,Y=64-(y-(minY+maxY)/2)*scale;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.closePath();ctx.fill();}return canvas.toDataURL('image/png');
}
