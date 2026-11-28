import * as T from './three.module.min.js';
import {paneledBody,PropParts} from './prop-geometry.js';
import {buildTalon} from './talon-model.js';
// Batch material-compatible fixed components. Movable magazines, pump and joints remain separate.
function batch(root,exclude=[]){root.updateMatrixWorld(true);const inv=root.matrixWorld.clone().invert(),groups=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh||exclude.includes(o)||exclude.some(e=>e.getObjectById(o.id)))return;const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inv,o.matrixWorld));if(!groups.has(o.material))groups.set(o.material,[]);groups.get(o.material).push(g);remove.push(o);});for(const o of remove)o.removeFromParent();for(const [m,gs]of groups){let size=0;for(const g of gs)size+=g.attributes.position.array.length;const p=new Float32Array(size);let offset=0;for(const g of gs){p.set(g.attributes.position.array,offset);offset+=g.attributes.position.array.length;g.dispose();}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(p,3));g.computeVertexNormals();root.add(new T.Mesh(g,m));}}
// All exposed pieces of the K-09 nose share one emissive material and keep their cold finishes.
function rifleBarrel(frontZ){
 const art=new PropParts();
 const axis=[Math.PI/2,0,0];
 for(const [radius,length,z,color] of [
  [.023,.31,-.722,0x687b81], [.031,.079,-.869,0x28373c],
  [.023,.008,-.911,0x1d2930], [.034,.042,frontZ,0x28373c]
 ]){
  art.add(new T.CylinderGeometry(radius,radius,length,12),color,[0,.025,z],axis);
 }
 art.box(0x687b81,[0,.071,frontZ],[.026,.060,.025]);
 art.box(0x61b8a8,[0,.1165,frontZ],[.008,.047,.018]);
 const material=new T.MeshPhongMaterial({
  vertexColors:true,specular:0x313b3e,shininess:23,emissive:0xff3216,emissiveIntensity:0
 });
 return new T.Mesh(art.finish(),material);
}
export function buildModels(){
 const materials={
  dark:new T.MeshLambertMaterial({color:0x28373c}),
  steel:new T.MeshPhongMaterial({color:0x687b81,specular:0x313b3e,shininess:23}),
  accent:new T.MeshLambertMaterial({color:0x61b8a8}),
  wood:new T.MeshLambertMaterial({color:0x9b8062}),
  edge:new T.MeshLambertMaterial({color:0xafbdbb}),
  rubber:new T.MeshLambertMaterial({color:0x1d2930})
 };
 const box=(g,w,h,d,x,y,z,m='dark')=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),materials[m]);o.position.set(x,y,z);g.add(o);return o;};
 const tube=(g,r,length,x,y,z,m='steel')=>{const o=new T.Mesh(new T.CylinderGeometry(r,r,length,12),materials[m]);o.rotation.x=Math.PI/2;o.position.set(x,y,z);g.add(o);return o;};
 const panel=(group,stations,finish='dark')=>{
  const mesh=new T.Mesh(paneledBody(stations),materials[finish]);
  group.add(mesh);
  return mesh;
 };
 const sight=(g,zRear,zFront,physical=true)=>{
  // Both optical reference points are exactly on y=.14, x=0. The front post ends at that axis.
  const rear=new T.Object3D(),front=new T.Object3D();rear.position.set(0,.14,zRear);front.position.set(0,.14,zFront);g.add(rear,front);
  if(!physical)return{rear,front};
  const square=new T.Group(),circle=new T.Group();g.add(square,circle);circle.visible=false;
  const ring=new T.Mesh(new T.TorusGeometry(.043,.006,4,24),materials.dark);ring.position.set(0,.14,zRear);circle.add(ring);
  for(const x of [-.038,.038])box(square,.012,.065,.017,x,.14,zRear);
  box(square,.086,.012,.017,0,.1785,zRear);box(square,.086,.012,.017,0,.1015,zRear);
  // Optical coating: transparent center and a subtle cool edge. The world is magnified
  // by the existing ADS camera FOV, so this adds no second render, framebuffer or shader pass.
  const glassMaterial=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide}),reticleMaterial=new T.LineBasicMaterial({color:0xe1e8ef,transparent:true,opacity:.66,depthWrite:false});
  for(const [group,round]of [[square,false],[circle,true]]){const positions=[],colors=[],n=32;for(let i=0;i<n;i++)for(const [a,edge]of [[0,false],[i/n*Math.PI*2,true],[(i+1)/n*Math.PI*2,true]]){const cos=Math.cos(a),sin=Math.sin(a),radius=round?.036:.0318/Math.max(Math.abs(cos),Math.abs(sin));positions.push(edge?cos*radius:0,(edge?sin*radius:0)+.14,zRear+.002);colors.push(.39,.52,.67,edge?.19:.015);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,4));const glass=new T.Mesh(g,glassMaterial);glass.renderOrder=2;group.add(glass);
   const ticks=new T.BufferGeometry().setFromPoints([[-.012,0],[-.004,0],[.004,0],[.012,0],[0,-.012],[0,-.004]].map(([x,y])=>new T.Vector3(x,y+.14,zRear+.003)));const marks=new T.LineSegments(ticks,reticleMaterial);marks.renderOrder=3;group.add(marks);
  }
  box(g,.062,.034,.046,0,.083,zRear,'steel');
  return{rear,front,squareSight:square,circleSight:circle};
 };
 const flash=(g,z)=>{const f=new T.Mesh(new T.ConeGeometry(.065,.16,5),new T.MeshBasicMaterial({color:0xffdc99,transparent:true,opacity:.9,depthWrite:false}));f.rotation.x=-Math.PI/2;f.position.set(0,.02,z);f.visible=false;g.add(f);return f;};
 const rifle=new T.Group();
 panel(rifle,[[-.285,.112,.101,.003],[-.245,.140,.148,0],[.064,.137,.144,0],[.116,.106,.114,.004]]);
 panel(rifle,[[-.615,.083,.081,.014],[-.565,.117,.113,.013],[-.293,.128,.119,.009],[-.248,.115,.095,.008]],'steel');
 // Raised top rail and broad recessed handguard vents, readable at phone size.
 box(rifle,.055,.026,.54,0,.071,-.225,'dark');
 for(let i=0;i<7;i++)box(rifle,.088,.012,.027,0,.087,-.018-i*.066,'steel');
 for(const side of [-1,1]){
  for(let i=0;i<4;i++)box(rifle,.006,.029,.043,side*(.0585+i*.0009),.012,-.527+i*.063,'rubber').rotation.x=-.16;
  box(rifle,.008,.033,.126,side*.069,.015,-.118,'steel');
  box(rifle,.011,.010,.055,side*.072,.016,-.116,'dark');
  box(rifle,.008,.014,.054,side*.069,-.033,-.038,'accent');
 }
 // Two rails leave open space below the sloping cheek rest.
 panel(rifle,[[.093,.081,.043,.027],[.175,.103,.067,.038],[.269,.109,.079,.026]],'steel');
 box(rifle,.055,.027,.169,0,-.042,.182).rotation.x=.05;
 panel(rifle,[[.245,.102,.103,.003],[.279,.123,.162,-.020],[.302,.119,.167,-.023]],'rubber');
 box(rifle,.078,.144,.061,0,-.116,.046).rotation.x=-.22;
 box(rifle,.014,.013,.114,0,-.099,-.025,'steel');
 const mag=new T.Group();
 mag.position.set(0,-.13,-.13);rifle.add(mag);
 panel(mag,[[-.064,.063,.134,-.012],[-.044,.079,.178,-.018],[.034,.080,.181,-.022],[.055,.069,.132,-.026]],'steel').rotation.x=.08;
 box(mag,.086,.021,.119,0,-.111,.006,'rubber').rotation.x=.08;
 for(const side of [-1,1])for(let i=0;i<3;i++)box(mag,.007,.094,.011,side*.040,-.04,-.030+i*.026,'dark').rotation.x=.08;
 const rf=flash(rifle,-.94),rs=sight(rifle,.035,-.74);
 batch(mag);batch(rifle,[mag,rf,rs.squareSight,rs.circleSight]);
 const barrel=rifleBarrel(rs.front.position.z);rifle.add(barrel);

 const shotgun=new T.Group();
 panel(shotgun,[[-.238,.094,.108,.002],[-.192,.143,.149,0],[.042,.146,.147,0],[.087,.124,.116,-.006]],'steel');
 for(const side of [-1,1]){
  box(shotgun,.006,.042,.132,side*.073,.007,-.074,'rubber');
  box(shotgun,.010,.016,.083,side*.074,.014,-.087,'steel');
 }
 box(shotgun,.059,.008,.091,0,.074,-.036,'dark');
 panel(shotgun,[[.065,.086,.099,-.024],[.140,.078,.080,-.044],[.221,.103,.127,-.048],[.278,.118,.171,-.056]],'wood');
 panel(shotgun,[[.268,.121,.171,-.056],[.296,.126,.174,-.057],[.305,.115,.163,-.057]],'rubber');
 box(shotgun,.086,.127,.069,0,-.094,.083,'wood').rotation.x=-.42;
 tube(shotgun,.031,.719,0,.028,-.55,'dark');
 tube(shotgun,.025,.56,0,-.043,-.48,'steel');
 tube(shotgun,.036,.058,0,.028,-.888,'steel');
 tube(shotgun,.024,.006,0,.028,-.920,'rubber');
 tube(shotgun,.030,.047,0,-.043,-.750,'dark');
 box(shotgun,.048,.052,.032,0,-.006,-.736,'dark');
 const pump=new T.Group();
 pump.position.z=-.47;shotgun.add(pump);
 panel(pump,[[-.147,.100,.087,-.035],[-.110,.142,.114,-.035],[.084,.143,.118,-.036],[.136,.119,.099,-.037]],'wood');
 for(let i=0;i<5;i++){
  const z=-.087+i*.039;
  for(const side of [-1,1])box(pump,.006,.053,.010,side*.071,-.035,z,'dark').rotation.x=-.20;
  box(pump,.084,.006,.012,0,-.093,z,'dark');
 }
 batch(pump);
 const shell=new T.Group();shell.position.set(-.07,-.14,-.06);
 tube(shell,.021,.061,0,0,0,'wood');tube(shell,.022,.011,0,0,.034,'edge');
 shotgun.add(shell);shell.visible=false;
 const sf=flash(shotgun,-.98),ss=sight(shotgun,.025,-.82,false);
 batch(shotgun,[pump,shell,sf]);

 // P-12 compact frame. The slide and the magazine have independent resting pivots.
 const pistol=new T.Group(), slide=new T.Group(), pistolMag=new T.Group();
 pistol.add(slide,pistolMag);
 panel(pistol,[[-.222,.060,.065,-.016],[-.185,.085,.078,-.017],[.07,.086,.074,-.018]]);
 box(pistol,.077,.176,.102,0,-.109,.036,'rubber').rotation.x=-.18;
 box(pistol,.019,.016,.105,0,-.08,-.058,'steel');
 box(pistol,.021,.060,.018,0,-.057,-.102,'steel');
 panel(slide,[[-.248,.064,.066,.041],[-.221,.086,.075,.046],[.075,.088,.080,.047],[.093,.068,.068,.045]],'steel');
 for(const x of [-.043,.043]){
  for(let i=0;i<3;i++)box(slide,.004,.039,.009,x,.044,.017+i*.019,'dark');
  box(pistol,.005,.018,.052,x,-.024,-.129,'accent');
 }
 tube(pistol,.023,.05,0,.043,-.242,'dark');
 for(const x of [-.025,.025])box(slide,.012,.026,.022,x,.098,.050);
 box(slide,.009,.027,.019,0,.100,-.195,'accent');
 pistolMag.position.set(0,-.177,.042);
 box(pistolMag,.073,.080,.074,0,0,0,'steel');box(pistolMag,.085,.018,.088,0,-.043,0,'rubber');
 const ps=sight(pistol,.05,-.195,false),pf=flash(pistol,-.31);
 ps.rear.position.y=ps.front.position.y=.113;
 batch(slide);batch(pistolMag);batch(pistol,[slide,pistolMag,pf]);

 // L-04 long, narrow silhouette, two scope mounts and a separately animated bolt.
 const sniper=new T.Group(),bolt=new T.Group(),sniperMag=new T.Group();
 sniper.add(bolt,sniperMag);
 panel(sniper,[[-.60,.068,.078,.014],[-.51,.103,.098,.012],[-.21,.126,.113,.002],[.10,.118,.115,-.008]],'edge');
 panel(sniper,[[.07,.075,.071,-.004],[.20,.091,.061,.018],[.35,.105,.116,-.009]],'dark');
 box(sniper,.115,.151,.035,0,-.021,.358,'rubber');
 box(sniper,.073,.141,.067,0,-.103,.043,'dark').rotation.x=-.26;
 tube(sniper,.024,.53,0,.028,-.815);tube(sniper,.039,.11,0,.028,-1.119,'dark');
 tube(sniper,.025,.008,0,.028,-1.176,'rubber');
 for(const z of [-.252,-.032])box(sniper,.054,.063,.054,0,.087,z,'dark');
 tube(sniper,.038,.32,0,.141,-.145,'rubber');
 tube(sniper,.059,.095,0,.141,-.334,'dark');tube(sniper,.051,.085,0,.141,.050,'dark');
 tube(sniper,.043,.006,0,.141,.094,'accent');tube(sniper,.052,.006,0,.141,-.384,'accent');
 for(const x of [-.054,.054])box(sniper,.008,.017,.182,x,.007,-.386,'dark');
 bolt.position.set(.052,.038,.009);
 box(bolt,.085,.018,.018,.031,0,0,'steel');box(bolt,.029,.049,.028,.072,-.015,.002,'rubber');
 sniperMag.position.set(0,-.103,-.143);
 box(sniperMag,.071,.113,.116,0,0,0,'dark');box(sniperMag,.080,.018,.122,0,-.059,0,'steel');
 const ns=sight(sniper,.092,-.383,false),nf=flash(sniper,-1.218);
 batch(bolt);batch(sniperMag);batch(sniper,[bolt,sniperMag,nf]);

 return [
  buildTalon(),
  {root:rifle,mag,barrel,kind:'rifle',...rs,flash:rf,muzzle:rf},
  {root:shotgun,pump,shell,kind:'shotgun',...ss,flash:sf,muzzle:sf},
  {root:pistol,slide,mag:pistolMag,kind:'pistol',...ps,flash:pf,muzzle:pf},
  {root:sniper,bolt,mag:sniperMag,kind:'sniper',...ns,flash:nf,muzzle:nf}
 ];
}
export function aimTransform(model){
 const dir=model.front.position.clone().sub(model.rear.position).normalize(),q=new T.Quaternion().setFromUnitVectors(dir,new T.Vector3(0,0,-1));
 const eye=model.rear.position.clone().applyQuaternion(q);return{rotation:q,position:new T.Vector3(-eye.x,-eye.y,-.36)};
}
const limbAxis=new T.Vector3(0,1,0),limbDirection=new T.Vector3();
export function segment(mesh,a,b){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.y=a.distanceTo(b);mesh.quaternion.setFromUnitVectors(limbAxis,limbDirection.subVectors(b,a).normalize());}
