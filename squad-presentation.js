import {TEAM_MODES} from './objectives.js';
import {SquadScene,REVEAL_SECONDS} from './squad-scene.js';

export const PRESENTATION_SECONDS=60;
const teamName=team=>team==='red'?'ROJO':'AZUL';

export function squadResult(result,localId=0){
 const local=result.ranked.find(a=>a.id===localId);
 const isTeam=TEAM_MODES.includes(result.mode);
 const team=teamName(local.team);
 let members,outcome,score;
 if(isTeam){
  members=result.ranked.filter(a=>a.team===local.team);
  // Keep the scoreboard's kills/deaths order as the tiebreak in objective modes.
  if(result.mode==='ctf'||result.mode==='confirmed')members.sort((a,b)=>b.captures-a.captures);
  outcome=result.winner==='EMPATE'?'Empate':result.winner===team?'Victoria':'Derrota';
  score='Azul '+result.score.blue+' / Rojo '+result.score.red;
 }else{
  const winner=result.ranked.find(a=>a.name===result.winner)||result.ranked[0];
  members=winner.id===local.id?[local]:[winner,local];
  outcome=winner.id===local.id?'Victoria':(result.ranked.indexOf(local)+1)+'.º puesto';
  score='Ganador · '+winner.name;
 }
 const category=isTeam?'Equipo '+team:result.mode==='ffa'?'Todos contra todos':'Entrenamiento';
 return {members,outcome,score,category,team:local.team};
}

export class SquadPresentation{
 constructor(panel,onContinue){
  this.panel=panel;
  this.onContinue=onContinue;
  this.plot=panel.querySelector('.squad-plot');
  this.names=panel.querySelector('.squad-names');
  this.button=panel.querySelector('button');
  this.counter=panel.querySelector('time');
  this.button.addEventListener('click',()=>this.finish());
  // The gameplay shortcuts are global; native keyboard activation belongs to this dialog.
  panel.addEventListener('keydown',e=>e.stopPropagation());
 }
 get active(){return !!this.scene;}
 open(view,result){
  this.close();
  const data=squadResult(result);
  this.panel.dataset.team=data.team;
  this.panel.querySelector('.squad-location').textContent=view.level.name+' · '+data.category;
  this.panel.querySelector('h2').textContent=data.outcome;
  this.panel.querySelector('.squad-score').textContent=(result.reason==='atomic'?'Fin atómico · ':'')+data.score;
  this.labels=data.members.map((member,i)=>{
   const label=document.createElement('li'),name=document.createElement('span');
   name.textContent=member.name;
   if(i===0){
    const badge=document.createElement('b');
    badge.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 18" fill="currentColor"><path d="m2 3 5.7 3.5L12 1l4.3 5.5L22 3l-2.2 10H4.2zM4.7 15h14.6v2H4.7z"/></svg>MVP';
    label.className='squad-mvp';label.append(badge);
   }
   label.append(name);
   return label;
  });
  this.names.replaceChildren(...this.labels);
  this.scene=new SquadScene(view,data.members);
  this.panel.dataset.shot='intro';
  this.panel.hidden=false;
  document.body.classList.add('squad-showing');
  this.dirty=true;
  this.markDirty=()=>{this.dirty=true;};
  if(typeof ResizeObserver!=='undefined'){
   this.observer=new ResizeObserver(this.markDirty);
   this.observer.observe(this.plot);
  }
  window.addEventListener('resize',this.markDirty);
  window.addEventListener('kinetik-safe-area',this.markDirty);
  this.deadline=Date.now()+PRESENTATION_SECONDS*1000;
  const current=this.scene;
  this.timer=window.setTimeout(()=>{if(this.scene===current)this.finish();},PRESENTATION_SECONDS*1000);
  this.lastSecond=null;
  this.started=null;
  this.lastFrame=-Infinity;
  this.button.focus({preventScroll:true});
  this.frame(performance.now());
 }
 fit(){
  const screen=this.panel.getBoundingClientRect(),plot=this.plot.getBoundingClientRect();
  if(screen.width<1||screen.height<1||plot.height<1||plot.width<1)return;
  const frame={x:plot.left-screen.left,y:plot.top-screen.top,width:plot.width,height:plot.height};
  const points=this.scene.fit(screen.width,screen.height,frame);
  const order=points.map((p,i)=>({...p,i})).sort((a,b)=>a.x-b.x);
  // The label can use its column or wrap to a second line, including at phone widths.
  for(let i=0;i<order.length;i++){
   const p=order[i],left=i? (p.x-order[i-1].x)/2:p.x-frame.x;
   const right=i+1<order.length?(order[i+1].x-p.x)/2:frame.x+frame.width-p.x;
   const label=this.labels[p.i];
   label.style.left=p.x+'px';
   label.style.maxWidth=Math.max(1,2*Math.min(left,right)-3)+'px';
  }
  this.dirty=false;
 }
 frame(now){
  if(!this.scene)return;
  const seconds=Math.max(0,Math.ceil((this.deadline-Date.now())/1000));
  if(seconds===0){this.finish();return;}
  if(seconds!==this.lastSecond){this.counter.textContent=seconds+' s';this.lastSecond=seconds;}
  if(!this.dirty&&now-this.lastFrame<1000/30-.5)return;
  if(this.dirty)this.fit();
  if(this.dirty)return;
  const age=this.started===null?0:Math.max(0,(now-this.started)/1000);
  this.scene.render(age,Math.min(.1,(now-this.lastFrame)/1000));
  // First-use shader compilation can take a frame on mobile. Start the hold
  // after submitting the close-up so that loading cannot consume its half second.
  if(this.started===null)this.started=performance.now();
  if(age>=REVEAL_SECONDS&&this.panel.dataset.shot==='intro')this.panel.dataset.shot='team';
  this.lastFrame=now;
 }
 finish(){if(this.active){this.close();this.onContinue();}}
 close(){
  if(!this.active)return;
  window.clearTimeout(this.timer);
  this.observer?.disconnect();
  window.removeEventListener('resize',this.markDirty);
  window.removeEventListener('kinetik-safe-area',this.markDirty);
  this.scene.dispose();this.scene=null;
  this.names.replaceChildren();this.labels=[];
  this.panel.hidden=true;
  delete this.panel.dataset.shot;
  document.body.classList.remove('squad-showing');
 }
}
