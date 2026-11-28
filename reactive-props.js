import {makeCollider,rectPoly} from './physics.js';
import {obstruction} from './navigation.js';

// Coordinates are the center of the casing. Mounts face out from the wall.
const sites={
 nodo09:[
  ['tank',-41.39,1.15,-5,90],['panel',-18.53,1.36,0,90],['tank',2,1.18,-23.37,0],
  ['panel',47.77,1.44,-7,-90],['tank',-10,.68,31],['drum',39,.52,21],
  ['drum',-23,.52,18.5],['tank',20,.68,-32],['panel',-47.77,1.45,25,90]
 ],
 airport:[
  ['tank',-53.39,1.2,19,90],['panel',-53.47,1.45,-8,90],['tank',17,1.16,-46.38,0],
  ['panel',30.54,1.42,-28,90],['tank',37,.68,18],['drum',-24,.52,28],
  ['tank',7,.68,-22],['drum',47,.52,-19],['drum',-16,.52,-35]
 ]
};
export function mapProps(map,solids){
 return sites[map].map(([kind,x,y,z,degrees],id)=>{
  const panel=kind==='panel',drum=kind==='drum',yaw=(degrees||0)*Math.PI/180;
  const w=panel?.77:drum?.77:.54,h=panel?.90:drum?1.04:1.36,d=panel?.42:w;
  const poly=rectPoly(x,z,w,d,yaw);
  if(!panel)poly.splice(0,poly.length,...Array.from({length:10},(_,i)=>[x+w*.5*Math.cos(i*Math.PI/5),z+w*.5*Math.sin(i*Math.PI/5)]));
  const collider=makeCollider(poly,y-h/2,y+h/2,'reactive-'+id);solids.push(collider);
  return {id,kind,x,y,z,yaw,mounted:degrees!==undefined,collider};
 });
}
export class ReactiveProps{
 constructor(match){this.match=match;this.reset();}
 reset(){this.items=(this.match.level.reactiveSites||[]).map(s=>({...s,born:-Infinity,owner:null,ticks:0}));this.active=[];}
 hit(o,end,wallDistance,range){
  if(wallDistance>=range)return null;
  const k=wallDistance/range,x=o.x+(end.x-o.x)*k,z=o.z+(end.z-o.z)*k;
  for(const p of this.items){
   const c=p.collider;
   if(x<c.minX-.001||x>c.maxX+.001||z<c.minZ-.001||z>c.maxZ+.001)continue;
   if(Math.abs(obstruction([c],o,end)*range-wallDistance)<.001)return p;
  }
  return null;
 }
 ignite(p,owner){
  if(!p||p.owner)return false;
  p.owner=owner;p.born=this.match.time;p.ticks=0;this.active.push(p);
  this.match.events.push({type:p.kind==='panel'?'prop-discharge':'prop-flame',actor:owner.id,position:{x:p.x,y:p.y,z:p.z}});
  return true;
 }
 blocksSight(a,b=a){
  for(const p of this.active){
   const age=this.match.time-p.born;
   if(p.kind==='panel'||age<3||age>=6)continue;
   const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,len=dx*dx+dy*dy+dz*dz;
   const k=len?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/len)):0;
   if((a.x+dx*k-p.x)**2+(a.y+dy*k-p.y)**2+(a.z+dz*k-p.z)**2<=100)return true;
  }
  return false;
 }
 step(){
  const m=this.match;
  for(let i=this.active.length-1;i>=0;i--){
   const p=this.active[i],age=m.time-p.born,electric=p.kind==='panel';
   const due=Math.min(6,Math.floor((age+1e-8)*2));
   while(p.ticks<due){
    p.ticks++;
    for(const a of m.actors){
     if(!a.alive)continue;
     const b=a.body,range2=(b.x-p.x)**2+(b.y+b.height*.5-p.y)**2+(b.z-p.z)**2;
     if(range2>100)continue;
     m.damage(a,electric?22:30,p.owner,electric?'electric-panel':'gas-tank',{self:true,healthOnly:!electric,position:p});
    }
   }
   if(age+1e-8>=20){p.born=-Infinity;p.owner=null;this.active.splice(i,1);}
  }
 }
}
