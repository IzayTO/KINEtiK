import {clamp} from './physics.js';
import {RC_CONNECT_SECONDS} from './rc.js';
const $=id=>document.getElementById(id),team=t=>t==='blue'?'AZUL':'ROJO';
// The same mode limits exposed by the menu; quick play always selects their upper tier.
export function quickConfig(base={},rng=Math.random){const pick=xs=>xs[Math.min(xs.length-1,Math.floor(rng()*xs.length))];return{...base,mode:pick(['ffa','tdm','ctf','domination','confirmed']),bots:pick([4,6,8]),difficulty:pick(['easy','normal','hard']),team:pick(['blue','red']),minutes:pick([10,15]),limit:100,captureLimit:10,dominationLimit:500,environment:pick(['day','night']),quality:'adaptive'};}
export class GameInterface{
 constructor(view,match,input){Object.assign(this,{view,match,input});this.queue=[];this.current=null;this.noiseClock=0;this.noise=$('rc-noise');this.noiseContext=this.noise.getContext('2d');this.noise.width=160;this.noise.height=96;this.noiseImage=this.noiseContext.createImageData(160,96);this.age=0;this.lastRC='';this.screen=$('hud-backdrop');this.snapshotContext=this.screen.getContext('2d');this.remoteUnderlay=$('rc-underlay');this.remoteContext=this.remoteUnderlay.getContext('2d');$('slot-rc').querySelector('img').src=view.rcView.thumbnail();this.fireLabel=document.createElement('small');this.fireLabel.className='action-caption';document.querySelector('.fire-button').append(this.fireLabel);}
 reset(){this.goAge=-1;$('round-start').hidden=true;$('game').style.filter='';this.queue.length=0;this.current=null;this.age=0;$('objective-notice').hidden=true;this.lastRC='';document.body.classList.remove('rc-active','rc-lost');$('rc-monitor').hidden=true;this.input.remoteMode=false;this.remoteUnderlay.hidden=true;$('game').style.clipPath='';$('game').style.visibility='';document.body.classList.remove('rc-connecting');}
 prepareRemote(){this.view.render();const src=this.view.renderer?.domElement;if(src){this.remoteUnderlay.width=src.width;this.remoteUnderlay.height=src.height;this.remoteContext.drawImage(src,0,0);}}
 capture(){// Read the just-rendered frame synchronously: preserveDrawingBuffer is unnecessary.
  this.view.render();const src=this.view.renderer?.domElement;if(src){this.screen.width=src.width;this.screen.height=src.height;this.snapshotContext.drawImage(src,0,0);}this.screen.hidden=false;document.body.classList.add('reference-view');
 }
 releaseCapture(){this.screen.hidden=true;document.body.classList.remove('reference-view');}
 notice(title,detail='',color='mint'){const e={title,detail,color};if(this.queue.length>=5)this.queue.shift();this.queue.push(e);}
 onEvent(e){const a=this.match.actors.find(a=>a.id===e.actor),name=a?.name||e.name||'',t=e.team||a?.team;
  if(e.type==='round-live'){const phrases=['A GANAR','A VER QUÉ SALE','TÚ PUEDES','DALE CON TODO','AVANZA','LISTO','ES TU MOMENTO','HAZ QUE CUENTE','VAMOS EQUIPO','TODOS A UNA'];this.goMessage=phrases[Math.floor(Math.random()*phrases.length)];this.goAge=0;}
  if(e.type==='kill-confirmed')this.notice('BAJA CONFIRMADA',name+' · +1 para '+team(e.team),e.team);
  if(e.type==='kill-denied')this.notice(e.team!==this.match.player.team?'BAJA PERDIDA':'BAJA RECUPERADA',name+' recuperó una estrella',e.team);
  if(e.type==='flag-taken')this.notice('BANDERA ROBADA',name+' · rumbo a su base',t);
  if(e.type==='flag-dropped')this.notice('BANDERA CAÍDA',name+' soltó la bandera '+team(e.flagTeam),t);
  if(e.type==='flag-return')this.notice('BANDERA RECUPERADA',(name?name+' · ':'')+'Base '+team(e.team)+' asegurada',e.team);
  if(e.type==='capture')this.notice('CAPTURA CONFIRMADA',name+' suma para '+team(e.team),e.team);
  if(e.type==='zone-captured')this.notice('ZONA '+e.zone+' CONTROLADA','Equipo '+team(e.team),e.team);
  if(e.type==='zone-neutralized')this.notice('ZONA '+e.zone+' NEUTRALIZADA','Captura en curso · '+team(e.team),e.team);
  if(e.type==='zone-defended')this.notice('ZONA '+e.zone+' DEFENDIDA','Equipo '+team(e.team)+' mantiene el control',e.team);
  if(e.type==='airstrike-earned')this.notice('APOYO AÉREO DISPONIBLE','20 bajas · '+e.count+' carga(s) guardada(s)');
  if(e.type==='airstrike-called')this.notice('APOYO AÉREO EN CAMINO','Tres objetivos confirmados');
  if(e.type==='rc-earned')this.notice('RC EXPLOSIVO DISPONIBLE','10 bajas · '+e.count+' '+(e.count===1?'carga guardada':'cargas guardadas'));
 }
 frame(dt,editing,playing){const r=this.match.remote,a=this.match.player,rc=r.engaged&&a.alive&&playing,button=$('slot-rc'),shell=button.closest('.hud-shell');button.hidden=!editing&&!a.rcCharges;if(shell)shell.hidden=button.hidden;button.disabled=(!a.rcCharges||r.engaged)&&!editing;button.querySelector('.quantity').textContent='×'+(a.rcCharges||0);
  const state=rc?r.state:'idle';if(state!==this.lastRC){this.lastRC=state;document.body.classList.toggle('rc-active',rc);document.body.classList.toggle('rc-lost',rc&&state==='lost');$('rc-monitor').hidden=!rc;$('rc-monitor').classList.toggle('lost',state==='lost');}
  if(rc){const age=this.match.time-r.born,left=clamp(20-age,0,20),lost=r.state==='lost',opening=clamp(age/.65,0,1),closing=lost?clamp((r.until-this.match.time)/.48,0,1):1,phase=lost?closing:opening*opening*(3-2*opening),signal=lost?0:clamp((age-.65)/(RC_CONNECT_SECONDS-.65),0,1),angle=(1-phase)*82;
   $('rc-time').textContent=left.toFixed(1)+' s';$('rc-battery').style.transform='scaleX('+left/20+')';$('rc-status').textContent=lost?r.reason:signal<1?'ADQUIRIENDO SEÑAL…':'RC / ENLACE ACTIVO';$('rc-signal-lost').hidden=!lost;
   // The lower edge never translates. Only the upper edge unfolds toward the operator.
   $('rc-monitor').style.transform=`perspective(${Math.max(innerWidth,innerHeight)*1.6}px) rotateX(${angle}deg)`;$('rc-monitor').style.opacity=String(clamp(phase*8,0,1));
   this.noise.style.opacity=String(lost?.82:1-signal);this.noise.hidden=!lost&&signal>=1;$('game').style.visibility=signal>0&&!lost?'':'hidden';this.remoteUnderlay.hidden=!lost&&opening>=1;document.body.classList.toggle('rc-connecting',!r.ready||lost);
   if(!this.noise.hidden){this.noiseClock+=dt;if(this.noiseClock>.07){this.noiseClock=0;const data=this.noiseImage.data;for(let i=0;i<data.length;i+=4){const k=22+Math.random()*95;data[i]=data[i+1]=data[i+2]=k;data[i+3]=255;}this.noiseContext.putImageData(this.noiseImage,0,0);}}
  }
  if(!rc){$('game').style.clipPath='';$('game').style.visibility='';this.remoteUnderlay.hidden=true;document.body.classList.remove('rc-connecting');}
  document.querySelector('.sprint-button small').textContent=rc?'TURBO':'SPRINT';this.fireLabel.textContent=rc?'DETONAR':a.held==='rocket'?'COHETE':a.held?(this.input.firing?'SUELTA':'LANZAR'):'';
  document.querySelector('.aim-button').classList.toggle('selected',this.input.aiming);this.fireLabel.parentElement.setAttribute('aria-label',rc?'Detonar RC':a.held==='rocket'?'Disparar cohete':a.held?'Mantener, arrastrar y soltar para lanzar':'Disparar y arrastrar para mirar');
  this.warmupFrame(dt,playing,editing);if(!playing||editing||this.match.staging){$('objective-notice').hidden=true;return;}
  if(!this.current&&this.queue.length){this.current=this.queue.shift();this.age=0;const n=$('objective-notice');n.children[0].textContent=this.current.title;n.children[1].textContent=this.current.detail;n.dataset.team=this.current.color;}
  if(this.current){this.age+=dt;const n=$('objective-notice');n.hidden=!a.alive;const enter=clamp(this.age/.24,0,1),exit=clamp((2-this.age)/.34,0,1),fade=Math.min(enter,exit);n.style.opacity=String(fade);const rect=$('score-bar').closest('.hud-shell').getBoundingClientRect(),status=$('match-status').closest('.hud-shell').getBoundingClientRect(),bottom=status.left<rect.right&&status.right>rect.left&&status.top<rect.bottom+75?Math.max(rect.bottom,status.bottom):rect.bottom;const x=clamp(rect.left+rect.width/2,Math.min(innerWidth/2,170),Math.max(innerWidth/2,innerWidth-170));n.style.left=x+'px';n.style.top=clamp(bottom+6,8,innerHeight-60)+'px';n.style.transform=`translateX(-50%) translateY(${(1-enter)*5-(1-exit)*4}px)`;if(this.age>=2){this.current=null;n.hidden=true;}}
 }
 warmupFrame(dt,playing,editing){const m=this.match,el=$('round-start'),active=playing&&!editing&&m.staging;
  if(active){this.goAge=-1;el.hidden=false;el.classList.remove('live');el.querySelector('strong').textContent='ESPERA';el.querySelector('b').textContent=String(Math.min(10,Math.floor(m.warmupElapsed)));el.querySelector('span').textContent='PREPARANDO EQUIPOS · 10 S';$('game').style.filter=`grayscale(${clamp((10-m.warmupElapsed)/2,0,1)})`;el.style.opacity='1';}
  else{$('game').style.filter='';if(playing&&!editing&&this.goAge>=0){this.goAge+=dt;el.hidden=this.goAge>2;el.classList.add('live');el.querySelector('strong').textContent=this.goMessage;el.querySelector('b').textContent='';el.querySelector('span').textContent='OPERACIÓN EN MARCHA';el.style.opacity=String(clamp((2-this.goAge)/.45,0,1));}else el.hidden=true;}
 }

}
