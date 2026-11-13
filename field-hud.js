import * as T from './three.module.min.js';
import {itemModel,modelThumbnail} from './field-models.js';
import {THROWABLES} from './ordnance.js';
import {clamp} from './physics.js';
import {angleDelta} from './navigation.js';
const $=id=>document.getElementById(id),teamColor=t=>t==='blue'?'#69c2ff':t==='red'?'#ff7e71':'#b4c4c0';
export class FieldHUD{
 constructor(match,view,input){Object.assign(this,{match,view,input});this.vector=new T.Vector3();this.numberIndex=0;this.sequence=0;this.timer=0;this.numbers=Array.from({length:128},()=>{const el=document.createElement('span');el.className='damage-number';el.hidden=true;$('damage-numbers').append(el);return{el,start:-100};});this.directions=Array.from({length:8},()=>{const el=document.createElement('i');el.hidden=true;$('damage-direction').append(el);return{el,start:-100,x:0,z:0};});this.directionIndex=0;
 this.worldLabels=Array.from({length:4},()=>{const el=document.createElement('div');el.className='objective-label';el.innerHTML='<b></b><span></span><i><em></em></i>';el.hidden=true;$('objective-markers').append(el);return el;});
 for(const [id,model]of [['slot-knife',view.models[0].wrist],['slot-rifle',view.models[1].root],['slot-shotgun',view.models[2].root],...['grenade','molotov','gas','antidote','rocket'].map(k=>['slot-'+k,itemModel(k)])]){const el=$(id);el.querySelector('img').src=modelThumbnail(model);}
 this.map=document.createElement('canvas');this.map.width=this.map.height=240;this.map.className='objective-map';$('minimap').append(this.map);this.ctx=this.map.getContext('2d');
 }
 reset(){for(const n of this.numbers){n.start=-100;n.el.hidden=true;}for(const d of this.directions){d.start=-100;d.el.hidden=true;}this.timer=0;}
 onEvent(e){if(e.type!=='damage')return;const m=this.match;
  if(e.source===0&&e.actor!==0){for(const [value,shield]of [[e.shield,true],[e.health,false]])if(value>0){const n=this.numbers[this.numberIndex++%this.numbers.length];Object.assign(n,{start:m.time,x:e.position.x,y:e.position.y+.06,z:e.position.z,offset:this.sequence++});n.el.textContent='−'+(value<1?value.toFixed(1):Math.round(value));n.el.style.color=shield?'#67bfff':'#ffffff';n.split=shield?0:1;}}
  if(e.actor===0){const angle=Math.atan2(-(e.origin.x-m.player.body.x),-(e.origin.z-m.player.body.z));let d=this.directions.find(d=>m.time-d.start<.7&&Math.abs(angleDelta(Math.atan2(-(d.x-m.player.body.x),-(d.z-m.player.body.z)),angle))<.4)||this.directions[this.directionIndex++%8];Object.assign(d,{start:m.time,x:e.origin.x,z:e.origin.z});}
 }
 project(x,y,z){const p=this.vector;p.set(x,y,z).project(this.view.camera);return p.z>-1&&p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2;}
 frame(dt,editing=false){this.editing=editing;const m=this.match,a=m.player,time=m.time,visible=!$('hud').hidden&&!editing&&a.alive;
  for(const n of this.numbers){const age=time-n.start,show=visible&&age>=0&&age<.9&&this.project(n.x,n.y,n.z);n.el.hidden=!show;if(show){const x=(this.vector.x*.5+.5)*innerWidth-28-(n.offset%4)*9,y=(-this.vector.y*.5+.5)*innerHeight-age*40+(n.offset%3)*7+n.split*14;n.el.style.transform=`translate(${x}px,${y}px) translate(-100%,-50%)`;n.el.style.opacity=String(Math.min(1,age/.06)*clamp((.9-age)/.3,0,1));}}
  for(const d of this.directions){const age=time-d.start;d.el.hidden=!visible||age<0||age>1;if(!d.el.hidden){const yaw=Math.atan2(-(d.x-a.body.x),-(d.z-a.body.z)),relative=angleDelta(this.input.yaw,yaw);d.el.style.transform=`translate(-50%,-50%) rotate(${-relative}rad)`;d.el.style.opacity=String(clamp((1-age)/.5,0,1));}}
  $('burn-feedback').style.opacity=visible&&time<a.burnUntil?String(.6+.12*Math.sin(time*11)):'0';$('gas-feedback').style.opacity=visible&&a.poison?String(.25+.12*Math.sin(time*3)):'0';
  const targets=m.config.mode==='ctf'?m.objectives.flags:m.config.mode==='domination'?m.objectives.zones:[];
  this.worldLabels.forEach((el,i)=>{const z=targets[i],show=visible&&z&&this.project(z.x,z.y+2,z.z);el.hidden=!show;if(!show)return;el.style.transform=`translate(${(this.vector.x*.5+.5)*innerWidth}px,${(-this.vector.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`;el.style.color=teamColor(z.contested?null:z.team||z.occupant||z.owner);el.children[0].textContent=z.id||'⚑ '+(z.team==='blue'?'AZUL':'ROJA');el.children[1].textContent=z.state?({home:'BASE',carried:'EN MANOS',dropped:'CAÍDA'}[z.state]):z.contested?'DISPUTADA':z.capturing?(z.owner?'NEUTRALIZANDO':'CAPTURANDO'):z.owner?'CONTROLADA':'NEUTRAL';el.querySelector('em').style.width=(z.progress||0)*100+'%';el.querySelector('i').hidden=!!z.state;});
  this.timer+=dt;if(this.timer>=.1){this.timer=0;this.refresh();this.drawMap();}
 }
 refresh(){const m=this.match,a=m.player,held=a.held;
  for(const kind of ['grenade','molotov','gas','antidote','rocket']){const el=$('slot-'+kind),count=a.equipment[kind]||0;if(kind==='rocket'){el.hidden=!count&&!this.editing;const shell=el.closest('.hud-shell');if(shell)shell.hidden=el.hidden;}el.querySelector('.quantity').textContent='×'+count;el.disabled=count===0&&!this.editing;el.classList.toggle('empty-slot',count===0);el.setAttribute('aria-disabled',String(count===0));el.classList.toggle('selected',kind===held);}
  $('slot-knife').classList.toggle('selected',!held&&a.arsenal.selected===0);$('slot-rifle').classList.toggle('selected',!held&&a.arsenal.selected===1);$('slot-shotgun').classList.toggle('selected',!held&&a.arsenal.selected===2);
  if(held){$('ammo').textContent='×'+a.equipment[held];$('weapon-name').textContent=THROWABLES[held].name;$('fire-mode').textContent=held==='rocket'?'COHETE':'LANZABLE';$('ammo-status').textContent=held==='rocket'?'1 COHETE POR DISPARO':'APUNTAR: TRAYECTORIA';}
  $('auto-reload').hidden=!!held;
  const panel=$('objective-panel');panel.hidden=!m.objectives.active&&!this.editing;const rows=panel.children;
  const list=m.config.mode==='ctf'?m.objectives.flags:m.objectives.zones;
  for(let i=0;i<4;i++){const row=rows[i],z=list[i];row.hidden=!z||(!m.objectives.active&&!this.editing);if(!z)continue;row.style.color=teamColor(z.contested?null:z.team||z.occupant||z.owner);row.children[0].textContent=z.id||'⚑ '+(z.team==='blue'?'AZUL':'ROJA');row.children[1].textContent=z.state?({home:'EN BASE',carried:'ROBADA',dropped:'CAÍDA'}[z.state]):z.contested?'DISPUTADA':z.capturing?(z.owner?'NEUTRALIZAR':'CAPTURAR')+' '+Math.floor(z.progress*100)+'%':z.owner?'CONTROLADA':'NEUTRAL';row.querySelector('em').style.width=(z.progress||0)*100+'%';row.querySelector('i').hidden=!!z.state;}
 }
 drawMap(){const c=this.ctx,m=this.match;c.clearRect(0,0,240,240);if(!m.objectives.active)return;c.save();c.translate(120,120);if(this.view.preferences.mapRotate)c.rotate(this.input.yaw);c.scale(240/(this.view.mapExtent||104),240/(this.view.mapExtent||104));const list=m.config.mode==='ctf'?m.objectives.flags:m.objectives.zones;for(const z of list){c.fillStyle=teamColor(z.contested?null:z.team||z.owner);c.strokeStyle=c.fillStyle;c.lineWidth=.55;c.beginPath();c.arc(z.x,z.z,z.radius||1.8,0,Math.PI*2);c.globalAlpha=.18;c.fill();c.globalAlpha=1;c.stroke();c.save();c.translate(z.x,z.z);if(this.view.preferences.mapRotate)c.rotate(-this.input.yaw);c.font='bold 4px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(z.id||'⚑',0,0);c.restore();}c.restore();}
}
