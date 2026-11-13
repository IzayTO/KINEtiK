import * as T from './three.module.min.js';
const cache=new Map();
export function rocketGeometry(projectile=false){const key=projectile?'missile':'launcher';if(cache.has(key))return cache.get(key);const positions=[],colors=[];
 const add=(g,color,x,y,z,rx=0)=>{let q=g.index?g.toNonIndexed():g;q.rotateX(rx);q.translate(x,y,z);positions.push(...q.attributes.position.array);const c=new T.Color(color);for(let i=0;i<q.attributes.position.count;i++)colors.push(c.r,c.g,c.b);q.dispose();if(q!==g)g.dispose();};
 const box=(c,x,y,z,w,h,d)=>add(new T.BoxGeometry(w,h,d),c,x,y,z);
 const tube=(c,z,r,h)=>add(new T.CylinderGeometry(r,r,h,10,1,false),c,0,0,z,Math.PI/2);
 if(projectile){tube(0xc3c6b5,0,.085,.56);add(new T.ConeGeometry(.085,.22,8),0x5e6e7f,0,0,-.39,-Math.PI/2);for(const s of [-1,1]){box(0x414d60,s*.11,0,.20,.14,.018,.18);box(0x414d60,0,s*.11,.20,.018,.14,.18);}}
 else{
  tube(0x475360,-.17,.115,1.12);tube(0x202b38,-.76,.14,.12);tube(0x77818a,.40,.15,.11);tube(0x1b222a,.463,.115,.018);
  for(const z of [-.48,.14])tube(0xb7b7aa,z,.123,.055);
  box(0x252e3b,0,-.15,-.08,.085,.23,.13);box(0x353c47,0,-.12,-.48,.12,.14,.26);
  box(0xd5a35d,0,.12,-.3,.13,.018,.24);box(0x202c3b,0,.15,.15,.14,.08,.09);
  for(const x of [-.06,.06])box(0x8999a8,x,.21,.15,.022,.09,.025);
  box(0xb9c2c9,0,.24,-.65,.024,.075,.026);box(0x252e3b,.10,-.08,.26,.055,.11,.23);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();cache.set(key,g);return g;
}
