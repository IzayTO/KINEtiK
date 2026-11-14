import {clamp} from './physics.js';
const $=id=>document.getElementById(id),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const ICONS={cross:'M24 7v9m0 16v9M7 24h9m16 0h9M16 24a8 8 0 1 0 16 0a8 8 0 1 0-16 0',rank:'m12 28 12-11 12 11m-24 7 12-11 12 11M18 9h12',burst:'m24 5 4 12 12-5-7 11 10 8-14-1-5 13-4-13-14 1 10-8-7-11 12 5Z',blade:'m12 37 7-7m-4-5 8 8m-4-9L34 8l4-1-1 8-13 15Z',wing:'m24 31-17-9 12 1-8-10 13 7 13-7-8 10 12-1Z',shield:'m24 7 14 5v13c0 9-14 16-14 16S10 34 10 25V12Z m-7 17 5 5 10-12',flag:'M13 40V8m1 1h23l-7 8 7 8H14',star:'m24 6 5 12 13 1-10 9 3 13-11-7-11 7 3-13-10-9 13-1Z',atom:'M24 22v4m-2-2h4M8 24c0-7 32-7 32 0S8 31 8 24Zm8-14c6-4 22 24 16 28S10 14 16 10Zm16 0c6 4-10 32-16 28S26 6 32 10Z'};
export function medalIcon(kind){return `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="${ICONS[kind]||ICONS.cross}"/></svg>`;}
export class OperationUI{
 constructor(match,input){this.match=match;this.input=input;this.medal=$('combat-medal');this.card=this.medal.querySelector('.medal-card');this.icon=this.medal.querySelector('.medal-icon');this.title=this.medal.querySelector('b');this.detail=this.medal.querySelector('small');this.combo=$('combat-chain');this.live=this.combo.querySelector('.chain-live');this.ghost=this.combo.querySelector('.chain-ghost');this.reset();}
 reset(){this.queue=[];this.current=null;this.comboAt=-100;this.comboCount=0;this.blur=0;this.lastMedal=null;document.body.classList.remove('atomic-limited','atomic-down');$('atomic-death').hidden=true;$('atomic-overlay').hidden=true;$('game').style.filter='';}
 onEvent(e){if(e.type==='medal'){
   if(this.current?.id===e.id){this.current={...e,at:this.match.time};this.setMedal(e);return;}
   const existing=this.queue.findIndex(a=>a.id===e.id);if(existing>=0)this.queue.splice(existing,1);if(e.priority>=3){this.queue.unshift(e);this.current=null;}else this.queue.push(e);if(this.queue.length>6)this.queue.splice(6);
  }else if(e.type==='chain'){this.comboAt=this.match.time;this.comboCount=e.count;this.live.textContent=this.ghost.textContent='×'+e.count;}
  else if(e.type==='chain-reset'){this.comboAt=-100;this.comboCount=0;}
  else if(e.type==='atomic-blackout'||e.type==='atomic-impact'){this.input.clear();if(e.type==='atomic-blackout'){this.input.yaw=this.match.player.yaw;this.input.pitch=this.match.player.pitch;}}
 }
 setMedal(e){this.icon.innerHTML=medalIcon(e.icon);this.title.textContent=e.title;this.detail.textContent=e.detail;}
 frame(dt,editing,playing){const m=this.match,t=m.time,n=m.nuclear,show=playing&&m.player.alive&&!n.restricted;
  if(editing){if(this.lastMedal!=='preview'){this.setMedal({icon:'cross',title:'HEADSHOT',detail:'Impacto en la cabeza'});this.lastMedal='preview';}this.card.style.opacity='1';this.card.style.transform='';this.live.textContent='×7';this.live.style.opacity='1';this.ghost.style.opacity='0';this.live.style.clipPath='';}
  else{this.lastMedal=null;if(!this.current&&this.queue.length){this.current={...this.queue.shift(),at:t};this.setMedal(this.current);}if(this.current){const age=t-this.current.at,enter=clamp(age/.22,0,1),exit=clamp((1.9-age)/.42,0,1),pop=1+Math.sin(enter*Math.PI)*.10;this.card.style.opacity=String(ease(enter)*exit);this.card.style.transform=`translateY(${(1-ease(enter))*8-(1-exit)*4}px) scale(${(.84+.16*ease(enter))*pop})`;if(age>=1.9)this.current=null;}
   const age=t-this.comboAt,solid=age<.5?1:clamp((1-age)/.5,0,1);this.live.textContent=this.ghost.textContent='×'+this.comboCount;this.live.style.opacity=String(solid);this.live.style.transform=`scale(${1+Math.sin(clamp(age/.18,0,1)*Math.PI)*.14}) translateY(${-Math.max(0,age-.5)*8}px)`;this.live.style.clipPath=`inset(0 ${Math.max(0,1-solid)*22}% 0 0)`;this.ghost.style.opacity=String(.30*ease((age-.5)/.5)*clamp((6-age)/5,0,1));
  }
  this.medal.hidden=!editing&&(!show||!this.current);this.combo.hidden=!editing&&(!show||this.comboCount<3||t-this.comboAt>=6);
  const button=$('slot-atomic');button.hidden=!editing&&(!n.unlocked||n.state!=='idle');const shell=button.closest('.hud-shell');if(shell)shell.hidden=button.hidden;button.disabled=!editing&&!n.available;
  const alert=$('atomic-alert');alert.hidden=!editing&&(!playing||n.state!=='alarm');alert.querySelector('b').textContent=editing?'20':String(Math.max(0,Math.ceil(20-n.age)));
  const limited=playing&&n.restricted,down=playing&&n.impacted;document.body.classList.toggle('atomic-limited',limited&&!down);document.body.classList.toggle('atomic-down',down);
  const overlay=$('atomic-overlay'),death=$('atomic-death');overlay.hidden=!down;death.hidden=!down||n.pulses<5;
  if(down){const age=n.impactAge,flash=.8*(1-ease((age-.5)/.5)),initial=n.roster.find(r=>r.actor===m.player)?.health??100,progress=clamp((age-1.5)/4.5,0,1),since=age-(1+n.pulses),pulse=n.pulses?Math.exp(-Math.max(0,since)*5)*.18:0,red=initial<10?progress*.94:clamp(n.pulses*.145+pulse,0,.94);overlay.style.setProperty('--atomic-flash',String(flash));overlay.style.setProperty('--atomic-red',String(red));this.blur+=(progress*5-this.blur)*(1-Math.exp(-dt*5));$('game').style.filter=`blur(${this.blur.toFixed(2)}px)`;
   if(n.pulses>=5){const q=ease((age-6)/.42);death.querySelector('strong').textContent=n.deathLine;death.style.opacity=String(q);death.style.transform=`translate(-50%,-50%) translateY(${12*(1-q)}px) scale(${.97+.03*q})`;}
  }else{this.blur=0;}
 }
}
