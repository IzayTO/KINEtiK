import * as T from './three.module.min.js';
import {itemGeometry} from './field-models.js';
// Authored low-poly twin-engine aircraft, oriented toward -Z. All details share one draw.
export function createAircraftGeometry(){const positions=[],normals=[],colors=[],col=new T.Color();
 function add(geometry,color){const g=geometry.index?geometry.toNonIndexed():geometry,p=g.attributes.position,n=g.attributes.normal;col.setHex(color);for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n?.getX(i)||0,n?.getY(i)||0,n?.getZ(i)||0);const shade=.70+.30*Math.max(0,-(n?.getY(i)||0));colors.push(col.r*shade,col.g*shade,col.b*shade);}g.dispose();if(g!==geometry)geometry.dispose();}
 const outline=[[0,12.5],[.55,9],[1.05,3.6],[6.6,.8],[11.4,-2.5],[11.4,-3.9],[7.2,-3.1],[1.3,-1.6],[.75,-7],[4.6,-8.9],[4.6,-10],[.65,-9],[0,-11.2],[-.65,-9],[-4.6,-10],[-4.6,-8.9],[-.75,-7],[-1.3,-1.6],[-7.2,-3.1],[-11.4,-3.9],[-11.4,-2.5],[-6.6,.8],[-1.05,3.6],[-.55,9]],shape=new T.Shape(outline.map(p=>new T.Vector2(...p)));shape.closePath();const wing=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false,steps:1});wing.rotateX(-Math.PI/2);add(wing,0x202833);
 const fuselage=new T.CylinderGeometry(.18,.88,21,6,1);fuselage.rotateX(Math.PI/2);fuselage.translate(0,.13,.15);add(fuselage,0x343d49);const nose=new T.ConeGeometry(.88,2.1,6);nose.rotateX(-Math.PI/2);nose.translate(0,.13,-11.2);add(nose,0x303944);
 const underside=new T.BoxGeometry(.55,.055,10);underside.translate(0,-.67,1);add(underside,0x141c27);
 for(const side of [-1,1]){const engine=new T.CylinderGeometry(.38,.46,3.6,8,1);engine.rotateX(Math.PI/2);engine.translate(side*2.15,-.38,1.6);add(engine,0x424950);const intake=new T.CircleGeometry(.32,8);intake.translate(side*2.15,-.38,-.22);intake.rotateY(0);add(intake,0x0c111a);
  const panel=new T.Shape([new T.Vector2(side*1.6,2.2),new T.Vector2(side*9.2,-2.3),new T.Vector2(side*7.1,-2.4),new T.Vector2(side*1.5,.45)]);panel.closePath();const detail=new T.ShapeGeometry(panel);detail.rotateX(-Math.PI/2);detail.translate(0,-.025,0);add(detail,0x414953);
  const flap=new T.BoxGeometry(3.5,.035,.18);flap.rotateY(side*-.18);flap.translate(side*6.9,-.04,2.8);add(flap,0x0e1520);
  const fin=new T.BufferGeometry();fin.setAttribute('position',new T.Float32BufferAttribute([side*.48,.23,6,side*.55,2.4,8.3,side*.50,.23,9.5],3));fin.computeVertexNormals();add(fin,0x303944);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;
}
export class SupportView{
 constructor(view){this.view=view;this.plane=new T.Mesh(createAircraftGeometry(),new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,fog:false}));this.plane.visible=false;view.scene.add(this.plane);
  this.bombs=new T.InstancedMesh(itemGeometry('rocket-projectile'),new T.MeshLambertMaterial({vertexColors:true}),3);this.bombs.frustumCulled=false;this.bombs.instanceMatrix.setUsage(T.DynamicDrawUsage);this.temp=new T.Object3D();this.direction=new T.Vector3();this.forward=new T.Vector3(0,0,-1);view.scene.add(this.bombs);this.bombs.visible=false;
 }
 update(alpha){const support=this.view.match?.support,flight=support?.flight;this.plane.visible=!!flight;if(flight){this.plane.position.set(flight.previousX+(flight.x-flight.previousX)*alpha,flight.y,flight.previousZ+(flight.z-flight.previousZ)*alpha);this.plane.rotation.y=Math.atan2(-flight.vx,-flight.vz);this.plane.material.color.setHex(this.view.match.config.environment==='night'?0xb8c3d3:0xffffff);}let count=0;
  for(const b of support?.bombs||[]){if(!b.active)continue;this.temp.position.set(b.previous.x+(b.x-b.previous.x)*alpha,b.previous.y+(b.y-b.previous.y)*alpha,b.previous.z+(b.z-b.previous.z)*alpha);this.direction.set(b.x-b.previous.x,b.y-b.previous.y,b.z-b.previous.z);if(this.direction.lengthSq()<1e-8)this.direction.set(0,-1,0);this.temp.quaternion.setFromUnitVectors(this.forward,this.direction.normalize());this.temp.scale.setScalar(3.5);this.temp.updateMatrix();this.bombs.setMatrixAt(count++,this.temp.matrix);}
  this.bombs.count=count;this.bombs.visible=count>0;if(count)this.bombs.instanceMatrix.needsUpdate=true;
 }
}
