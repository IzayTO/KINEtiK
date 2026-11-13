// AERÓDROMO 12 — compact 128 × 104 m terminal, apron and cargo compound.
// Original authored geometry. Airport planning references are listed in the patch notes.
import {rectPoly,makeCollider} from './physics.js';
export function createAirport(){
 const solids=[],visuals=[],labels=[],targets=[],zones=[];
 const box=(id,x,y,z,w,h,d,mat='concrete',solid=true,angle=0)=>{visuals.push({type:'box',id,x,y,z,w,h,d,mat,angle});if(solid)solids.push(makeCollider(rectPoly(x,z,w,d,angle),y-h/2,y+h/2,id));};
 const prism=(id,poly,bottom,top,mat='concrete',solid=true,sx=0,sz=0,ox=0,oz=0)=>{visuals.push({type:'prism',id,poly,bottom,top,mat,sx,sz,ox,oz});if(solid)solids.push(makeCollider(poly,bottom,top,id,sx,sz,ox,oz));};
 const ramp=(id,x,z,w,d,low,high,axis='z',sign=-1)=>{const slope=sign*(high-low)/(axis==='z'?d:w);prism(id,rectPoly(x,z,w,d),low-.12,(low+high)/2,'concrete',true,axis==='x'?slope:0,axis==='z'?slope:0,x,z);};
 const sign=(text,sub,x,y,z,w=6,angle=0,color='white')=>labels.push({text,sub,x,y,z,w,angle,color});
 const line=(x,z,w,d,mat='yellow')=>box('route',x,.018,z,w,.018,d,mat,false);
 const rail=(x,y,z,w,d)=>{box('rail',x,y+.42,z,w,.84,d,'dark');box('rail cap',x,y+.86,z,w,.06,d+.04,'yellow',false);};
 box('ground',0,-.4,0,132,.8,108,'floor');
 for(const x of [-65,65])box('perimeter',x,2.3,0,2,4.6,108,'concrete');
 for(const z of [-53,53])box('perimeter',0,2.3,z,132,4.6,2,'concrete');
 box('apron surface',23,.004,3,79,.008,95,'asphalt',false);box('terminal tile',-42,.012,0,24,.024,65,'light',false);
 // A through-terminal: two end doors, three airside portals and a mezzanine.
 box('terminal west wall',-54,3.6,0,.6,7.2,66,'concrete');
 for(const z of [-33,33]){for(const x of [-50,-33.5])box('terminal end',x,3,z,x===-50?8:9,6,.6);box('terminal lintel',-42,6.6,z,24,1.2,.6,'steel');}
 for(const [z,d]of [[-26,14],[0,14],[26,14]]){
  box('terminal sill',-30,.55,z,.5,1.1,d);box('terminal glazing',-30,3,z,.12,3.8,d,'glass',false);
  // Actual window collision; glazed bays are solid, clear doorways separate them.
  solids.push(makeCollider(rectPoly(-30,z,.18,d),1.1,4.9,'terminal glass'));
  box('window header',-30,5.9,z,.6,2,d,'steel');
  for(let p=z-d/2;p<=z+d/2;p+=3.5)box('window mullion',-29.86,3,p,.22,3.9,.12,'dark',false);
 }
 box('terminal roof',-42,7.35,0,25,.3,67,'steel');
 for(const z of [-29,-14,14,29])box('terminal column',-45,3.5,z,.45,7,.45,'dark');
 // Ticket counters, check-in belt and seating leave a broad central corridor.
 for(const z of [-22,-18,-14]){box('check-in desk',-50,.64,z,3,1.28,1.5,'light');box('counter top',-50,1.32,z,3.2,.09,1.65,'dark');box('counter screen',-50,1.65,z,.55,.48,.1,'glass',false);}
 box('baggage belt',-49,.55,21,6,1.1,5,'dark');box('belt inset',-49,1.11,21,4,.035,3,'steel',false);
 for(const z of [-4,4,13])for(const x of [-46,-38]){box('bench seat',x,.47,z,3.6,.18,.7,'dark');box('bench back',x,.86,z+.35,3.6,.65,.1,'steel');for(const d of [-1.3,1.3])box('bench leg',x+d,.2,z,.12,.4,.5,'steel');}
 box('mezzanine deck',-48.7,3.02,-12,9.8,.36,34,'concrete');rail(-43.7,3.2,-22,.12,14);rail(-43.7,3.2,-4,.12,10);rail(-48.7,3.2,-28.9,9.6,.12);
 for(let i=0;i<16;i++)box('terminal stair',-48.7,(i+1)*.10,15-i*.65,4.2,(i+1)*.20,.65,'concrete');
 box('stair landing',-48.7,3.05,4.5,4.2,.3,1.8,'light');
 // Accessible jet bridge and airside ramp, independent of the aircraft.
 box('gate bridge',-33,3.02,-12,22,.36,4,'light');rail(-33,3.2,-14,22,.12);rail(-33,3.2,-10,22,.12);
 ramp('gate access ramp',-14,-12,17,4,0,3.2,'x',-1);
 for(const x of [-36,-24])box('bridge column',x,1.5,-12,.5,3,.5,'steel');
 box('gate canopy',-28,6.1,-12,8,.16,4.6,'steel');
 for(const z of [-14.25,-9.75])box('canopy side frame',-30,4.65,z,.15,2.9,.15,'dark');
 sign('01 / TERMINAL','SALIDAS · EQUIPAJE · CONEXIONES',-42,5.7,33.35,9);
 sign('PUERTA 12','EMBARQUE / ACCESO A PLATAFORMA',-29.65,6.3,-12,6,Math.PI/2,'yellow');
 sign('LLEGADAS','RECOGIDA DE EQUIPAJE',-53.62,2.9,20,6,Math.PI/2);
 sign('CONTROL DE ACCESO','MEZZANINE +3.20',-49,6.2,-28.65,6);
 // North maintenance hangar. Front and side exits, roof access via loading ramp.
 box('hangar slab',14,.012,-35,32,.024,24,'light',false);
 box('hangar rear',14,3.4,-47,32,6.8,.6);box('hangar west',-2,3.4,-35,.6,6.8,24);
 for(const [z,d]of [[-44,6],[-28,10]])box('hangar east',30,3.4,z,.6,6.8,d);
 for(const x of [1,27])box('hangar front',x,2.8,-23,6,5.6,.5);
 box('hangar header',14,6,-23,32,1.2,.6,'steel');
 prism('hangar roof',rectPoly(14,-35,33,25),6.8,7.4,'steel',true,.025,0,14,-35);
 for(const x of [4,24])box('hangar workbench',x,.75,-42,5,1.5,2,'dark');
 for(const x of [7,20]){box('tool cabinet',x,1,-45.6,2,2,1,'coral');box('tool handles',x,1,-45.02,1.6,.08,.04,'white',false);}
 sign('02 / HANGAR','MANTENIMIENTO · ACCESO NORTE',14,5.9,-22.63,10,0,'coral');
 // Cargo compound provides a flank along the east edge, with low cover and a climb.
 for(const [x,z,w,d,h]of [[47,-31,12,7,2.8],[46,-14,10,6,2.8],[52,3,9,5,1.25],[29,13,7,5,1.1],[48,38,10,6,2.8],[10,33,7,4,1.1]]){
  box('cargo container',x,h/2,z,w,h,d,'steel');box('cargo top',x,h+.045,z,w+.1,.09,d+.1,'light',false);
  for(let p=x-w/2+.7;p<x+w/2;p+=1.1)box('container rib',p,h/2,z+d/2+.02,.075,h-.16,.06,'dark',false);
 }
 ramp('cargo ramp',46,-4,5,12,0,2.8,'z',-1);
 box('cargo platform',46,2.65,-10.5,6,.3,1,'light');rail(49,2.8,-12,.15,5);
 sign('03 / CARGA','ALMACÉN · RAMPA · PERÍMETRO',46,2.05,-10.91,6,0,'yellow');
 // Control office and tall observation room, kept outside the main fighting lanes.
 // Walkable service office; roof joins the ramp at exactly the same elevation.
 box('office roof',-16,3.0,37,10.4,.30,8.4,'concrete');ramp('office ramp',-16,25,5,16,0,3.15,'z',1);
 box('office rear',-16,1.4,33,10,2.8,.35,'concrete');
 for(const x of [-21,-11]){box('office side sill',x,.5,37,.35,1,8,'concrete');box('office window',x,1.8,37,.12,1.6,7.6,'glass');box('office fascia',x,2.8,37,.4,.5,8,'steel');for(const z of [34.3,36.9,39.5])box('office mullion',x,1.8,z,.22,1.6,.10,'dark',false);}
 for(const x of [-19.5,-12.5])box('office front',x,1.4,41,3,2.8,.35,'concrete');box('office door lintel',-16,2.7,41,4,.6,.35,'steel');
 box('office counter',-19,.55,35.5,2,1.1,2,'light');box('office console',-19,1.35,35,.8,.5,.1,'dark',false);
 box('tower stem',-20,7,41,2,14,2,'steel');box('tower cabin base',-20,13.5,41,6,.45,5,'dark');
 box('tower glass',-20,14.7,41,5.6,2,4.6,'glass');box('tower roof',-20,15.9,41,6.8,.28,5.8,'dark');
 sign('04 / TORRE','SERVICIOS / CUBIERTA',-16,2.65,41.2,4);
 function barrel(id,x,y,z,r,length,mat){const positions=[],n=10;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,A=[x+Math.cos(a)*r,y+Math.sin(a)*r,z-length/2],B=[x+Math.cos(b)*r,y+Math.sin(b)*r,z-length/2],C=[B[0],B[1],z+length/2],D=[A[0],A[1],z+length/2];positions.push(...A,...D,...B,...B,...D,...C,x,y,z-length/2,...B,...A,x,y,z+length/2,...D,...C);}visuals.push({type:'mesh',id,mat,positions});}
 function aircraft(cx,cz,scale=1,paint='white'){
  const triangles=[],sections=[[-14,.05,1.9],[-12,.85,2],[-9,1.42,2.35],[6,1.35,2.4],[10,.7,2.6],[12,.1,2.75]],N=8;
  const point=(s,i)=>{const angle=i/N*Math.PI*2;return[cx+Math.cos(angle)*s[1]*scale,(s[2]+Math.sin(angle)*s[1]*.82)*scale,cz+s[0]*scale];};
  for(let j=0;j<sections.length-1;j++)for(let i=0;i<N;i++){const a=point(sections[j],i),b=point(sections[j],(i+1)%N),c=point(sections[j+1],(i+1)%N),d=point(sections[j+1],i);triangles.push(...a,...b,...c,...a,...c,...d);}
  visuals.push({type:'mesh',id:'aircraft fuselage',mat:paint,positions:triangles});
  // Simplified solid hull with clear space underneath for a slide route.
  prism('aircraft hull',[[cx-.7*scale,cz-12*scale],[cx+.7*scale,cz-12*scale],[cx+1.42*scale,cz-9*scale],[cx+1.35*scale,cz+6*scale],[cx+.45*scale,cz+11*scale],[cx-.45*scale,cz+11*scale],[cx-1.35*scale,cz+6*scale],[cx-1.42*scale,cz-9*scale]],1.1*scale,3.5*scale,paint,false);
  // The hull collider alone (visual fuselage above uses faceted cross sections).
  solids.push(makeCollider([[cx-.7*scale,cz-12*scale],[cx+.7*scale,cz-12*scale],[cx+1.42*scale,cz-9*scale],[cx+1.35*scale,cz+6*scale],[cx+.45*scale,cz+11*scale],[cx-.45*scale,cz+11*scale],[cx-1.35*scale,cz+6*scale],[cx-1.42*scale,cz-9*scale]],1.1*scale,3.5*scale,'aircraft hull'));
  visuals.pop(); // collider is independent from the rounded visible fuselage
  for(const side of [-1,1]){
   const poly=[[.8,-2],[11,3],[11,5],[1,2]].map(([x,z])=>[cx+x*side*scale,cz+z*scale]);if(side<0)poly.reverse();prism('aircraft wing',poly,2.05*scale,2.27*scale,paint);
   // Faceted round nacelles and recessed intake, with a simple matching solid envelope.
   const ex=cx+4*side*scale,ey=1.65*scale,ez=cz+1.1*scale;
   barrel('engine nacelle',ex,ey,ez,.7*scale,3.3*scale,'steel');barrel('engine intake',ex,ey,ez-1.66*scale,.54*scale,.025,'dark');
   solids.push(makeCollider(rectPoly(ex,ez,1.35*scale,3.3*scale),ey-.65*scale,ey+.65*scale,'engine envelope'));
   box('engine pylon',ex,2.15*scale,ez,.15*scale,.6*scale,1.7*scale,'light',false);
   const tail=[[.5,8],[4.4,10.5],[4.4,11.4],[.5,10.5]].map(([x,z])=>[cx+x*side*scale,cz+z*scale]);if(side<0)tail.reverse();prism('tail plane',tail,2.9*scale,3.05*scale,'dark');
   for(let z=-7;z<6;z+=1.5)box('aircraft window',cx+side*1.34*scale,2.7*scale,cz+z*scale,.035,.28*scale,.48*scale,'glass',false);
   box('landing wheel',cx+side*1.4*scale,.42*scale,cz+2*scale,.32*scale,.84*scale,.84*scale,'dark');box('wheel strut',cx+side*1.4*scale,1.05*scale,cz+2*scale,.12*scale,1.25*scale,.12*scale,'steel');
  }
  // Swept vertical stabilizer, cockpit glazing and nose landing gear.
  prism('tail fin',rectPoly(cx,cz+9*scale,.28*scale,4*scale),2.6*scale,5*scale,'coral',true,0,.65,0,cz+9*scale);
  box('cockpit',cx,2.62*scale,cz-10.6*scale,1.4*scale,.42*scale,1.8*scale,'glass',false);
  box('nose wheel',cx,.34*scale,cz-9*scale,.4*scale,.68*scale,.65*scale,'dark');box('nose strut',cx,.95*scale,cz-9*scale,.13*scale,1.3*scale,.13*scale,'steel');
 }
 aircraft(5,1,1);aircraft(34,29,.72,'light');
 // Tow tractor, baggage carts, mobile stairs and marked service lanes.
 box('tug body',-9,.55,14,2,1.1,3.8,'yellow');box('tug cab',-9,1.35,15,1.7,1.1,1.5,'dark');
 for(const x of [-10.05,-7.95])for(const z of [12.8,15.2])box('tug tire',x,.35,z,.28,.7,.7,'dark');
 for(const z of [21,25]){box('baggage cart',-24,.6,z,2.7,.3,3,'steel');box('baggage load',-24,1.25,z,2.4,1,2.6,'dark');for(const x of [-25.1,-22.9])box('cart wheel',x,.28,z,.24,.56,1.6,'dark');}
 // A full stair run meets a level boarding platform alongside the forward door.
 for(let i=0;i<12;i++)box('boarding step',-1.8+i*.43,((i+1)*.19)/2,-6.4,.43,(i+1)*.19,1.9,'light');
 box('boarding platform',3.45,2.18,-6.4,.9,.2,1.9,'light');
 for(const z of [-7.43,-5.37]){box('boarding handrail',.565,2.235,z,5.17,.07,.07,'steel',false);visuals[visuals.length-1].tiltZ=Math.atan(.19/.43);for(const x of [-1.8,2.93])box('boarding rail post',x,.69+(x+1.8)*.19/.43,z,.07,1.0,.07,'steel',false);box('boarding top rail',3.45,2.78,z,.9,1,.08,'dark');}
 box('boarding door surround',3.57,2.6,-6.4,.035,1.45,.77,'steel',false);box('boarding door',3.54,2.59,-6.4,.04,1.28,.63,'light',false);
 // Pedestrian stripes and wheel chocks make service objects read as placed, not intersecting.
 for(const z of [-7.8,-5])line(.5,z,5.2,.08,'yellow');
 for(const x of [3.6,6.4])box('wheel chock',x,.10,2.65,.5,.20,.22,'yellow');
 for(let z=-45;z<=45;z+=6){line(59,z,.15,2.8,'white');line(-23,z,.15,2.8,'white');}
 for(const x of [5,34]){line(x,x===5?7:33,.14,21);line(x,x===5?17:43,16,.13);}
 for(let i=0;i<7;i++)line(-42+i*1.6,40,.85,5,'white');
 sign('AERÓDROMO 12','PLATAFORMA · TERMINAL · CARGA',-42,3.6,50.85,11);
 sign('05 / PLATAFORMA','SERVICIO · AERONAVES ESTACIONADAS',60,3,15,9,-Math.PI/2,'yellow');
 // Sparse warm fixtures: 15 positions versus 27 on NODO 09. No shadow maps.
 const lamps=[];const ceiling=(x,y,z,r=15)=>lamps.push({x,y,z,r,wall:false,n:[0,-1,0]});
 for(const z of [-23,0,22])ceiling(-39,7.13,z,18);
 ceiling(-49,2.78,-15,10);ceiling(8,6.62,-35,19);ceiling(23,6.62,-35,19);
 for(const [x,z]of [[-26,38],[-24,-32],[58,-40],[57,-2],[57,44],[16,44],[20,-17],[20,12],[-4,22]]){box('lamp post',x,4,z,.16,8,.16,'dark');box('lamp arm',x+.65,8,z,1.5,.14,.14,'steel');ceiling(x+1.2,7.9,z,23);}
 const zone=(name,x,z,w,d)=>zones.push({name,x,z,w,d});zone('01 · TERMINAL',-42,0,26,66);zone('02 · HANGAR',14,-35,34,26);zone('03 · CARGA',47,-12,28,60);zone('04 · TORRE',-16,34,16,27);zone('05 · PLATAFORMA',18,12,72,77);zone('06 · ACCESO',-42,42,33,18);
 return{id:'airport',name:'AERÓDROMO 12',width:128,depth:104,bounds:{minX:-62,maxX:62,minZ:-50,maxZ:50},solids,visuals,labels,targets,zones,lamps,shadows:[[-42,0,24,66],[14,-35,32,24],[-16,37,10,8]],spawn:{x:-42,y:0,z:41,yaw:0},bases:{blue:[-42,42],red:[45,-43]},spawnAnchors:{blue:[[-42,42],[-55,27],[-26,45]],red:[[45,-43],[57,-35],[33,-48]]},crateSpots:[[-50,0,38],[-39,0,27],[-37,0,-24],[-49,3.2,-23],[22,0,-40],[38,0,-25],[57,0,14],[23,0,39],[-18,3,38]],objectiveZones:[[-40,19],[-40,-21],[15,-32],[29,21]],navLinks:[]};
}
