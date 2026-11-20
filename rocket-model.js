import * as T from './three.module.min.js';
import {paneledBody} from './prop-geometry.js';
const cache=new Map();
export function rocketGeometry(projectile=false){const key=projectile?'missile':'launcher';if(cache.has(key))return cache.get(key);const positions=[],colors=[];
 const add=(g,color,x,y,z,rx=0)=>{let q=g.index?g.toNonIndexed():g;q.rotateX(rx);q.translate(x,y,z);positions.push(...q.attributes.position.array);const c=new T.Color(color);for(let i=0;i<q.attributes.position.count;i++)colors.push(c.r,c.g,c.b);q.dispose();if(q!==g)g.dispose();};
 const box=(c,x,y,z,w,h,d)=>add(new T.BoxGeometry(w,h,d),c,x,y,z);
 const tube=(c,z,r,h)=>add(new T.CylinderGeometry(r,r,h,10,1,false),c,0,0,z,Math.PI/2);
 if(projectile){tube(0xc3c6b5,0,.085,.56);add(new T.ConeGeometry(.085,.22,8),0x5e6e7f,0,0,-.39,-Math.PI/2);for(const s of [-1,1]){box(0x414d60,s*.11,0,.20,.14,.018,.18);box(0x414d60,0,s*.11,.20,.018,.14,.18);}}
 else{
  const graphite=0x344451,steel=0x849498,rubber=0x25303a,amber=0xc89354;
  tube(graphite,-.17,.115,1.12);
  tube(rubber,-.753,.137,.126);
  tube(steel,-.804,.138,.018);
  tube(0x25313a,-.816,.112,.009);
  tube(steel,.399,.138,.108);
  tube(rubber,.445,.145,.036);
  tube(0x27333a,.465,.116,.012);
  add(paneledBody([[-.54,.190,.183],[-.51,.237,.226],[-.12,.241,.232],[-.08,.212,.202]]),0x607078,0,0,0);
  for(const z of [-.511,-.112,.134])tube(z===-.112?amber:steel,z,.125,.028);
  for(const side of [-1,1]){
   for(let i=0;i<4;i++)box(rubber,side*.120,.008,-.443+i*.061,.006,.042,.037);
   box(amber,side*.119,.043,-.242,.008,.013,.159);
   box(steel,side*.107,-.045,.237,.025,.044,.18);
  }
  add(paneledBody([[-.55,.113,.097],[-.51,.134,.123],[-.36,.130,.121],[-.32,.103,.091]]),rubber,0,-.111,0);
  box(rubber,0,-.157,-.076,.084,.158,.105);
  for(let i=0;i<3;i++)box(graphite,0,-.151-i*.024,-.076,.089,.010,.109);
  // Rear window is open. Its side posts are seated in the saddle.
  tube(graphite,.147,.124,.074);
  box(rubber,0,.133,.147,.141,.082,.083);
  for(const x of [-.054,.054]){
   box(steel,x,.202,.147,.018,.090,.033);
   box(0xbec9c8,x,.246,.147,.018,.009,.033);
  }
  // One continuous silhouette from the front collar to the bead at the ADS axis.
  tube(steel,-.65,.126,.058);
  box(graphite,0,.133,-.65,.089,.062,.039);
  box(steel,0,.172,-.65,.037,.057,.033);
  add(new T.CylinderGeometry(.0065,.017,.054,6),graphite,0,.219,-.65);
  box(0xf2c988,0,.246,-.65,.013,.008,.018);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();g.computeBoundingSphere();cache.set(key,g);return g;
}
