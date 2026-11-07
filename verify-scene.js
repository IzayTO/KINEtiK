/* Tests on the actual Three.js scene graph, without creating a GPU context.
   Pointer tests dispatch synthetic browser events; they are NOT a device test. */
import * as THREE from './three.module.min.js';
import {DEFAULTS,Player,CollisionWorld,FIXED_DT,BODY} from './physics.js';
import {createLevel} from './level.js';
import {WorldView} from './render.js';
import {Input} from './input.js';
const assert=(ok,message)=>{if(!ok)throw Error(message);};
let testInput=null;
export function runSceneChecks({includeEvents=typeof document!=='undefined'}={}){
  const results=[],test=(name,fn)=>{try{const detail=fn();results.push({name,passed:true,detail:detail||'OK'});}catch(e){results.push({name,passed:false,detail:e.message});}};
  const params={...DEFAULTS},level=createLevel(),view=new WorldView(null,level,params,{render:false});
  const player=new Player(new CollisionWorld(level.solids),params,level.spawn);
  const advance=(seconds,command={})=>{for(let i=0;i<Math.round(seconds/FIXED_DT);i++){player.step(FIXED_DT,command);if(player.jumpEvent)view.onJump();if(player.landEvent)view.onLand(player.landImpact);view.update(FIXED_DT,player,command,1);}};
  test('Escena · Geometría finita y polígonos válidos',()=>{
    let meshCount=0,triangles=0;
    for(const root of [view.scene,view.gunScene])root.traverse(o=>{if(o.isMesh){meshCount++;const a=o.geometry.attributes.position;assert(a.count>=3,'Geometría vacía');for(const v of a.array)assert(Number.isFinite(v),'Vértice inválido');triangles+=(o.geometry.index?o.geometry.index.count:a.count)/3*(o.isInstancedMesh?o.count:1);}});
    assert(triangles<70000,'Exceso de geometría');return meshCount+' mallas; '+Math.round(triangles)+' triángulos en total (incluye efectos reservados)';
  });
  test('Escena · Brazos, manos y rifle tridimensionales',()=>{assert(view.arms.length===2,'Falta un brazo');for(const arm of view.arms){let count=0;arm.traverse(o=>{if(o.isMesh)count+=o.geometry.attributes.position.count;});assert(count>200,'Brazo sin geometría');}assert(view.muzzle.position.z< -0.6,'Cañón incompleto');});
  test('Escena · Rampa visible coincide con su colisión',()=>{
    const ray=new THREE.Raycaster(new THREE.Vector3(-3,10,2.5),new THREE.Vector3(0,-1,0));view.scene.updateMatrixWorld(true);
    const hit=ray.intersectObjects(view.shootables,false)[0];assert(hit&&Math.abs(hit.point.y-1.6)<0.025,'Rampa visual desalineada');return 'Superficie a 1.600 m';
  });
  test('F · Raycasting al blanco inicial',()=>{view.update(1/60,player,{yaw:0,pitch:0},1);const hit=view.shoot();assert(hit.target===1,'No detecta el blanco 01: '+JSON.stringify(hit));return 'Blanco 01; '+hit.distance.toFixed(2)+' m';});
  test('F · Una pared bloquea el disparo',()=>{
    view.camera.position.set(-3,1.43,20);view.camera.rotation.set(0,0,0);view.camera.updateMatrixWorld();
    const hit=view.shoot();assert(!hit.target&&hit.distance>2.5&&hit.distance<2.7,'El rayo atravesó el dintel');return hit.distance.toFixed(2)+' m, primer impacto en estructura';
  });
  test('F · Disparo durante sprint',()=>{
    player.reset();advance(0.35,{z:-1,sprint:true,yaw:0,pitch:0});assert(player.state==='SPRINT','Estado incorrecto');view.camera.lookAt(0,1.55,25);view.camera.updateMatrixWorld();
    const v=player.speed,hit=view.shoot();assert(hit.target===1,'No impactó corriendo');assert(player.speed===v,'Disparar alteró la velocidad');return v.toFixed(2)+' m/s';
  });
  test('F · Disparo durante slide',()=>{
    player.step(FIXED_DT,{slide:true,z:-1,sprint:true});advance(0.12,{z:-1,sprint:true,yaw:0,pitch:0});assert(player.sliding,'No desliza');view.camera.lookAt(0,1.55,25);view.camera.updateMatrixWorld();
    const v=player.speed,hit=view.shoot();assert(hit.target===1,'No impactó deslizando');assert(player.speed===v,'Disparo frenó al personaje');assert(view.poseSlide>0.5,'Arma sin postura de slide');
  });
  test('F · Disparo durante salto',()=>{
    player.step(FIXED_DT,{jump:true,z:-1,sprint:true});advance(0.1,{z:-1,sprint:true,yaw:0,pitch:0});assert(!player.grounded,'No está en aire');view.camera.lookAt(0,1.55,25);view.camera.updateMatrixWorld();
    assert(view.shoot().target===1,'No impactó en el aire');
  });
  test('Animación · Transiciones continuas y valores finitos',()=>{
    for(let i=0;i<200;i++){const command={z:-1,sprint:true,yaw:i*0.002,pitch:Math.sin(i*0.01)*0.3,aim:i>100};player.step(FIXED_DT,command);view.update(FIXED_DT,player,command,0.5);for(const o of [view.camera,view.rig,view.weapon,...view.arms])for(const v of [...o.position.toArray(),o.rotation.x,o.rotation.y,o.rotation.z])assert(Number.isFinite(v),'Transformación inválida');}assert(view.aim>0.99,'No interpola apuntado');
  });
  test('Cámara · No atraviesa el techo durante la bajada',()=>{
    player.reset({x:-3,y:0,z:16});player.height=BODY.slide;view.eye=1.66;view.update(1/120,player,{yaw:0,pitch:0},1);
    assert(view.camera.position.y<1.05,'Cámara dentro de techo');return 'Ojo por debajo de 1.05 m';
  });
  test('Cámara · Efectos desactivables',()=>{
    player.reset();params.cameraMotion=0;view.roll=0;advance(0.4,{x:1,z:-1,sprint:true,yaw:0,pitch:0});assert(view.camera.rotation.z===0,'Queda inclinación');
    assert(Math.abs(view.camera.position.y-player.y-view.eye)<1e-8,'Queda balanceo vertical');params.cameraMotion=DEFAULTS.cameraMotion;
  });
  test('Ajustes · Velocidad y gravedad cambian la simulación',()=>{
    player.reset();params.sprintSpeed=9;advance(1,{z:-1,sprint:true});assert(Math.abs(player.speed-9)<0.01,'Velocidad decorativa');
    player.reset();params.gravity=12;player.step(FIXED_DT,{jump:true});advance(0.3,{});const high=player.y;
    player.reset();params.gravity=36;player.step(FIXED_DT,{jump:true});advance(0.3,{});assert(player.y<high-0.5,'Gravedad decorativa');Object.assign(params,DEFAULTS);
  });
  if(includeEvents){
    if(!testInput){
      const fixture=document.createElement('div');fixture.id='event-fixture';fixture.style.cssText='position:fixed;left:-2000px;top:0;width:600px;height:400px;pointer-events:none';
      fixture.innerHTML='<canvas id="event-canvas"></canvas><div id="touch-controls"><div id="joystick" style="width:120px;height:120px"><span id="stick"></span></div><div id="look-area"></div><button data-action="fire"></button><button data-action="jump"></button><button data-action="slide"></button><button data-action="sprint"></button><button data-action="aim"></button></div>';
      document.body.append(fixture);testInput=new Input(document.querySelector('#event-canvas'),{...DEFAULTS},()=>{},()=>{});
    }
    const i=testInput;i.clear();i.active=true;i.params={...DEFAULTS};
    const event=(selector,type,id,x=0,y=0)=>document.querySelector(selector).dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:y,pointerType:'touch',bubbles:true,cancelable:true}));
    test('G · Eventos: mover, mirar, disparar y saltar simultáneamente',()=>{
      const r=i.joy.getBoundingClientRect(),cx=r.left+60,cy=r.top+60;
      event('#joystick','pointerdown',11,cx,cy);event('#joystick','pointermove',11,cx,cy-40);
      event('#look-area','pointerdown',12,300,100);event('#look-area','pointermove',12,340,110);
      event('[data-action="fire"]','pointerdown',13,460,300);event('[data-action="jump"]','pointerdown',14);
      const s=i.sample();assert(s.z< -0.8&&s.fire&&s.jump&&s.yaw< -0.05,'Un control bloqueó otro');return '4 pointerId independientes; eventos sintéticos';
    });
    test('G · Arrastrar disparo también rota cámara',()=>{const yaw=i.yaw;event('[data-action="fire"]','pointermove',13,490,300);const s=i.sample();assert(s.fire&&s.yaw<yaw&&s.z< -0.8,'No combina mirada y disparo');});
    test('G · Cancelar un dedo conserva los demás',()=>{
      event('[data-action="fire"]','pointercancel',13);const s=i.sample();assert(!s.fire&&s.z< -0.8,'Cancelación cruzada');
      event('#look-area','pointercancel',12);const yaw=i.yaw;event('#look-area','pointermove',12,400,100);assert(i.yaw===yaw,'Dedo cancelado siguió mirando');
    });
    test('G · Botón contextual distingue slide y crouch',()=>{
      i.speed=11;event('[data-action="slide"]','pointerdown',15);const a=i.sample();assert(a.slide&&!a.crouch,'No activa slide');event('[data-action="slide"]','pointerup',15);
      i.speed=0;event('[data-action="slide"]','pointerdown',16);const b=i.sample();assert(!b.slide&&b.crouch,'No activa crouch');event('[data-action="slide"]','pointerup',16);
      i.params.contextualSlide=false;i.speed=11;event('[data-action="slide"]','pointerdown',17);assert(!i.sample().slide,'Ignora ajuste contextual');
    });
    test('G · Pausa/cancelación libera todas las entradas',()=>{i.clear();const s=i.sample();assert(s.x===0&&s.z===0&&!s.fire&&!s.aim&&!s.crouch&&!s.jump&&!s.slide,'Quedan entradas retenidas');});
    i.active=false;
  }
  const disposed=new Set();for(const root of [view.scene,view.gunScene])root.traverse(o=>{if(o.geometry&&!disposed.has(o.geometry)){o.geometry.dispose();disposed.add(o.geometry);}if(o.material&&!disposed.has(o.material)){o.material.map?.dispose();o.material.dispose();disposed.add(o.material);}});
  return {passed:results.filter(r=>r.passed).length,total:results.length,results};
}
