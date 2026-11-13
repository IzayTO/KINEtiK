import {clamp} from './physics.js';
const $=id=>document.getElementById(id),team=t=>t==='blue'?'AZUL':'ROJO';
// The same mode limits exposed by the menu; quick play always selects their upper tier.
export function quickConfig(base={},rng=Math.random){const pick=xs=>xs[Math.min(xs.length-1,Math.floor(rng()*xs.length))];return{...base,mode:pick(['ffa','tdm','ctf','domination']),bots:pick([4,6,8]),difficulty:pick(['easy','normal','hard']),team:pick(['blue','red']),minutes:pick([10,15]),limit:100,captureLimit:10,dominationLimit:500,environment:pick(['day','night']),quality:'adaptive'};}
export class GameInterface{
 constructor(view,match,input){Object.assign(this,{view,match,input});this.queue=[];this.current=null;this.age=0;this.lastRC='';this.screen=$('hud-backdrop');this.snapshotContext=this.screen.getContext('2d');this.remoteUnderlay=$('rc-underlay');this.remoteContext=this.remoteUnderlay.getContext('2d');$('slot-rc').querySelector('img').src=view.rcView.thumbnail();this.fireLabel=document.createElement('small');this.fireLabel.className='action-caption';document.querySelector('.fire-button').append(this.fireLabel);}
 reset(){this.queue.length=0;this.current=null;this.age=0;$('objective-notice').hidden=true;this.lastRC='';document.body.classList.remove('rc-active','rc-lost');$('rc-monitor').hidden=true;this.input.remoteMode=false;this.remoteUnderlay.hidden=true;$('game').style.clipPath='';}
 prepareRemote(){this.view.render();const src=this.view.renderer?.domElement;if(src){this.remoteUnderlay.width=src.width;this.remoteUnderlay.height=src.height;this.remoteContext.drawImage(src,0,0);}}
 capture(){// Read the just-rendered frame synchronously: preserveDrawingBuffer is unnecessary.
  this.view.render();const src=this.view.renderer?.domElement;if(src){this.screen.width=src.width;this.screen.height=src.height;this.snapshotContext.drawImage(src,0,0);}this.screen.hidden=false;document.body.classList.add('reference-view');
 }
 releaseCapture(){this.screen.hidden=true;document.body.classList.remove('reference-view');}
 notice(title,detail='',color='mint'){const e={title,detail,color};if(this.queue.length>=5)this.queue.shift();this.queue.push(e);}
 onEvent(e){const a=this.match.actors.find(a=>a.id===e.actor),name=a?.name||e.name||'',t=e.team||a?.team;
  if(e.type==='flag-taken')this.notice('BANDERA ROBADA',name+' · rumbo a su base',t);
  if(e.type==='flag-dropped')this.notice('BANDERA CAÍDA',name+' soltó la bandera '+team(e.flagTeam),t);
  if(e.type==='flag-return')this.notice('BANDERA RECUPERADA',(name?name+' · ':'')+'Base '+team(e.team)+' asegurada',e.team);
  if(e.type==='capture')this.notice('CAPTURA CONFIRMADA',name+' suma para '+team(e.team),e.team);
  if(e.type==='zone-captured')this.notice('ZONA '+e.zone+' CONTROLADA','Equipo '+team(e.team),e.team);
  if(e.type==='zone-neutralized')this.notice('ZONA '+e.zone+' NEUTRALIZADA','Captura en curso · '+team(e.team),e.team);
  if(e.type==='zone-defended')this.notice('ZONA '+e.zone+' DEFENDIDA','Equipo '+team(e.team)+' mantiene el control',e.team);
  if(e.type==='rc-earned')this.notice('RC EXPLOSIVO DISPONIBLE','10 bajas · '+e.count+' '+(e.count===1?'carga guardada':'cargas guardadas'));
 }
 frame(dt,editing,playing){const r=this.match.remote,a=this.match.player,rc=r.engaged&&a.alive&&playing,button=$('slot-rc'),shell=button.closest('.hud-shell');button.hidden=!editing&&!a.rcCharges;if(shell)shell.hidden=button.hidden;button.disabled=(!a.rcCharges||r.engaged)&&!editing;button.querySelector('.quantity').textContent='×'+(a.rcCharges||0);
  const state=rc?r.state:'idle';if(state!==this.lastRC){this.lastRC=state;document.body.classList.toggle('rc-active',rc);document.body.classList.toggle('rc-lost',rc&&state==='lost');$('rc-monitor').hidden=!rc;$('rc-monitor').classList.toggle('lost',state==='lost');}
  if(rc){const left=clamp(20-(this.match.time-r.born),0,20);$('rc-time').textContent=left.toFixed(1)+' s';$('rc-battery').style.transform='scaleX('+left/20+')';$('rc-status').textContent=r.state==='lost'?r.reason:'RC / ENLACE ACTIVO';$('rc-signal-lost').hidden=r.state!=='lost';const remain=r.until-this.match.time,opening=clamp((this.match.time-r.born)/.4,0,1),phase=r.state==='lost'?clamp(remain/.32,0,1):1-Math.pow(1-opening,3);$('rc-monitor').style.transform='translateY('+((1-phase)*104)+'%)';$('game').style.clipPath=phase<1?'inset('+((1-phase)*100)+'% 0 0 0)':'';this.remoteUnderlay.hidden=phase>=1;}
  if(!rc){$('game').style.clipPath='';this.remoteUnderlay.hidden=true;}
  document.querySelector('.sprint-button small').textContent=rc?'TURBO':'SPRINT';this.fireLabel.textContent=rc?'DETONAR':a.held?(this.input.firing?'SUELTA':'LANZAR'):'';
  document.querySelector('.aim-button').classList.toggle('selected',this.input.aiming);this.fireLabel.parentElement.setAttribute('aria-label',rc?'Detonar RC':a.held?'Mantener, arrastrar y soltar para lanzar':'Disparar y arrastrar para mirar');
  if(!playing||editing){$('objective-notice').hidden=true;return;}
  if(!this.current&&this.queue.length){this.current=this.queue.shift();this.age=0;const n=$('objective-notice');n.children[0].textContent=this.current.title;n.children[1].textContent=this.current.detail;n.dataset.team=this.current.color;}
  if(this.current){this.age+=dt;const n=$('objective-notice');n.hidden=!a.alive;const enter=clamp(this.age/.24,0,1),exit=clamp((2-this.age)/.34,0,1),fade=Math.min(enter,exit);n.style.opacity=String(fade);n.style.transform=`translate(-50%,-50%) translateY(${(1-enter)*10-(1-exit)*7}px) scale(${.975+.025*enter})`;if(this.age>=2){this.current=null;n.hidden=true;}}
 }
}
