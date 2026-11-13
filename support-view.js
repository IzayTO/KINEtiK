import * as T from './three.module.min.js';
import {itemGeometry} from './field-models.js';
export class SupportView{
 constructor(view){this.view=view;const outline=[[0,11],[.8,5],[7,1.2],[10,-2],[10,-3],[1.2,-1],[.8,-7],[4,-9],[4,-10],[.7,-9],[0,-11],[-.7,-9],[-4,-10],[-4,-9],[-.8,-7],[-1.2,-1],[-10,-3],[-10,-2],[-7,1.2],[-.8,5]],shape=new T.Shape(outline.map(p=>new T.Vector2(...p)));shape.closePath();this.plane=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color:0x171c24,side:T.DoubleSide,fog:true}));this.plane.geometry.rotateX(-Math.PI/2);this.plane.visible=false;view.scene.add(this.plane);
  this.bombs=new T.InstancedMesh(itemGeometry('rocket-projectile'),new T.MeshLambertMaterial({vertexColors:true}),3);this.bombs.frustumCulled=false;this.bombs.instanceMatrix.setUsage(T.DynamicDrawUsage);this.temp=new T.Object3D();this.direction=new T.Vector3();this.forward=new T.Vector3(0,0,-1);view.scene.add(this.bombs);this.bombs.visible=false;
 }
 update(alpha){const support=this.view.match?.support,flight=support?.flight;this.plane.visible=!!flight;if(flight){this.plane.position.set(flight.previousX+(flight.x-flight.previousX)*alpha,flight.y,flight.previousZ+(flight.z-flight.previousZ)*alpha);this.plane.rotation.y=Math.atan2(-flight.vx,-flight.vz);this.plane.material.color.setHex(this.view.match.config.environment==='night'?0x323b4a:0x151b24);}let count=0;
  for(const b of support?.bombs||[]){if(!b.active)continue;this.temp.position.set(b.previous.x+(b.x-b.previous.x)*alpha,b.previous.y+(b.y-b.previous.y)*alpha,b.previous.z+(b.z-b.previous.z)*alpha);this.direction.set(b.x-b.previous.x,b.y-b.previous.y,b.z-b.previous.z);if(this.direction.lengthSq()<1e-8)this.direction.set(0,-1,0);this.temp.quaternion.setFromUnitVectors(this.forward,this.direction.normalize());this.temp.scale.setScalar(3.5);this.temp.updateMatrix();this.bombs.setMatrixAt(count++,this.temp.matrix);}
  this.bombs.count=count;this.bombs.visible=count>0;if(count)this.bombs.instanceMatrix.needsUpdate=true;
 }
}
