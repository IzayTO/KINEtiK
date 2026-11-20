import * as T from './three.module.min.js';
import {PropParts} from './prop-geometry.js';

const P = {
  liner:0x33434d, scale:0xdcdfd0, collar:0x637582, pin:0xb29866,
  blade:0x859daa, bevel:0xc4d3d6, edge:0xf0f1e4,
  glove:0x35434b, cloth:0x596a71, rubber:0x26343e, welt:0xa4987f
};

function profile(points) {
  const shape=new T.Shape(points.map(([x,y])=>new T.Vector2(x,y)));
  shape.closePath();
  return shape;
}

function plate(shape, depth, bevel=0) {
  const geometry=new T.ExtrudeGeometry(shape,{depth,steps:1,curveSegments:8,
    bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});
  return geometry.translate(0,0,-depth/2);
}

function blade(parts) {
  // A shallow sweep at the heel turns into an upturned tip. Each station has a
  // spine, a broad satin face, and a narrower, separately shaded cutting bevel.
  const stations=[
    [.072,.026,-.025],[.088,.017,-.035],[.094,.014,-.029],[.101,.010,-.042],
    [.107,.008,-.035],[.115,.005,-.046],[.121,.004,-.040],[.130,.001,-.048],
    [.153,-.003,-.054],[.184,-.005,-.057],[.214,-.002,-.051],
    [.242,.008,-.037],[.269,.026,-.015],[.292,.049,.013],
    [.310,.078,.049],[.322,.106,.086],[.327,.121,.1206]
  ];
  const ridge=stations.map(([u,spine,edge])=>[u,edge+(spine-edge)*.36]);
  const face=profile([...stations.map(([u,y])=>[u,y]),...ridge.slice().reverse()]);
  for(const [u,y,r] of [[.126,-.012,.0053],[.144,-.015,.0047],[.160,-.017,.0037]]) {
    const hole=new T.Path();
    hole.absarc(u,y,r,0,Math.PI*2,true);
    face.holes.push(hole);
  }
  parts.add(plate(face,.012),P.blade);
  for (let i=1; i<stations.length; i++) {
    const rim=j=>[stations[j][0],stations[j][2],0];
    for (const side of [-1,1]) {
      const shoulder=j=>[...ridge[j],side*.006];
      const glint=j=>[stations[j][0],stations[j][2]+(ridge[j][1]-stations[j][2])*.18,side*.0016];
      const quad=(a,b,c,d,col)=>parts.facet(side>0?[a,b,c,a,c,d]:[a,c,b,a,d,c],col);
      quad(rim(i-1),rim(i),glint(i),glint(i-1),P.edge);
      quad(glint(i-1),glint(i),shoulder(i),shoulder(i-1),i%5===0?0xb9cbd0:P.bevel);
    }
  }
  // A few brushed lines follow the curve on the face. No image textures.
  for (const [fraction,color] of [[.24,0x9db2ba],[.48,0x758e9c],[.69,0x97adb5]]) {
    for(let i=10; i<15; i++) {
      const p=(j,offset)=>[stations[j][0],T.MathUtils.lerp(stations[j][1],ridge[j][1],fraction)+offset,.00614];
      parts.facet([p(i-1,0),p(i,0),p(i,.0008),p(i-1,0),p(i,.0008),p(i-1,.0008)],color);
    }
  }
}

function knifeArt() {
  const parts=new PropParts();
  const grip=profile([[-.083,.047],[-.059,.057],[-.038,.051],[-.010,.043],[.027,.035],[.060,.034],
    [.076,.044],[.088,.038],[.093,.022],[.084,-.030],[.071,-.035],[.058,-.018],
    [.036,-.016],[.021,-.022],[.005,-.020],[-.014,-.011],[-.038,-.010],[-.059,.001],[-.075,.014]]);
  parts.add(plate(grip,.032,.002),P.liner);
  for (const side of [-1,1]) {
    parts.add(plate(grip,.011,.002),P.scale,[0,.001,side*.019],[0,0,0],[.966,.90,1]);
    for (const [x,y] of [[-.057,.030],[.004,.011],[.064,.009]]) {
      parts.add(new T.CylinderGeometry(.0044,.0044,.002,8),P.pin,[x,y,side*.027],[Math.PI/2,0,0]);
    }
  }
  const ring=[-.097,.039,0];
  parts.add(new T.TorusGeometry(.035,.008,6,22),P.collar,ring);
  parts.add(new T.TorusGeometry(.035,.003,4,22),0xbfcbca,[ring[0],ring[1],.006]);
  blade(parts);
  // Local -Z is the long axis, as on the other inventory models.
  return parts.finish().rotateY(Math.PI/2);
}

export function gripGloveGeometry() {
  const hand=new PropParts();
  hand.soft(P.glove,[-.002,-.011,.032],[.064,.054,.055],[.15,-.14,-.12]);
  hand.soft(P.cloth,[.002,-.002,.064],[.052,.043,.022],[.18,-.1,-.12]);
  for(let i=0;i<4;i++) {
    const x=-.044+i*.026, y=.028-Math.abs(i-1)*.003;
    hand.soft(P.glove,[x,y,.013],[.016,.026,.045],[-.26,0,-.10]);
    hand.soft(P.rubber,[x,y+.012,.043],[.014,.012,.021]);
    hand.soft(P.glove,[x,y-.003,-.020],[.014,.020,.017],[.48,0,0]);
  }
  hand.soft(P.glove,[-.047,.003,.029],[.022,.045,.032],[.2,-.22,-.54]);
  hand.soft(P.cloth,[-.048,.025,.012],[.019,.023,.029],[-.48,0,-.4]);
  for(let i=0;i<3;i++)hand.box(P.glove,[-.020+i*.014,-.011,.084],[.005,.031,.002],[.02,0,-.35]);
  return hand.finish();
}

function sleeve(material, upper=false) {
  const parts=new PropParts();
  const band=(a,b,r0,r1,col)=>parts.add(new T.CylinderGeometry(r1,r0,b-a,8,1),col,[0,(a+b)/2,0],[0,0,0],[1,1,.91]);
  if(upper)band(-.5,.5,.060,.072,P.cloth);
  else {
    band(-.5,-.32,.045,.056,P.glove);
    band(-.32,-.25,.056,.057,P.welt);
    band(-.25,.5,.057,.065,P.cloth);
  }
  return new T.Mesh(parts.finish(),material);
}

function freeHand(material) {
  const hand=new PropParts();
  hand.soft(P.glove,[0,0,0],[.053,.038,.077],[-.12,.18,-.12]);
  hand.soft(P.cloth,[-.006,.020,.010],[.046,.021,.054]);
  for(let i=0;i<4;i++) {
    const x=-.038+i*.023,reach=.047+(i===1||i===2?.014:0);
    hand.soft(P.glove,[x,.012,-.064],[.013,.017,reach],[-.18,.22-i*.12,0]);
    hand.soft(P.rubber,[x,.022,-.052],[.011,.010,.019]);
  }
  hand.soft(P.glove,[.046,-.008,-.018],[.021,.019,.042],[-.25,-.63,0]);
  const group=new T.Group();
  group.add(new T.Mesh(hand.finish(),material));
  const arm=sleeve(material);
  const start=new T.Vector3(-.004,-.007,.051),end=new T.Vector3(-.20,-.19,.34);
  arm.position.lerpVectors(start,end,.5);
  arm.scale.y=start.distanceTo(end);
  arm.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());
  group.add(arm);
  group.position.set(-.39,-.047,-.014);
  group.rotation.z=-.13;
  return group;
}

export function buildTalon() {
  const fabric=new T.MeshLambertMaterial({vertexColors:true});
  const metal=new T.MeshPhongMaterial({vertexColors:true,shininess:28,specular:0x393e42});
  const root=new T.Group(),wrist=new T.Group(),item=new T.Mesh(knifeArt(),metal);
  item.name='Talon';
  item.rotation.y=-2.32;
  item.position.set(0,-.003,.047);
  const bladeTip=new T.Object3D();
  bladeTip.position.set(0,.121,-.327);
  item.add(bladeTip);
  wrist.add(item,new T.Mesh(gripGloveGeometry(),fabric));
  const fore=sleeve(fabric),upper=sleeve(fabric,true),leftHand=freeHand(fabric);
  root.add(wrist,fore,upper,leftHand);
  return {kind:'knife',root,wrist,fore,upper,bladeTip,item,leftHand,muzzle:new T.Object3D(),flash:null};
}
