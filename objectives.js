import {distance,obstruction} from './navigation.js';
import {clamp} from './physics.js';
export const TEAM_MODES=['tdm','ctf','domination'];
export const captureSeconds=count=>Math.max(4,10-1.5*(Math.max(1,count)-1));
export class Objectives{
 constructor(match){this.match=match;this.flags=[];this.zones=[];this.reset();}
 get active(){return this.match.config.mode==='ctf'||this.match.config.mode==='domination';}
 reset(){const m=this.match;const node=(x,z)=>{const n=m.nav.nearest({x,y:0,z});return{x:n.x,y:n.y,z:n.z};};
 this.flags=['blue','red'].map((team,i)=>{const home=node(i?0:-3,i?-36:37);return{team,home,...home,state:'home',carrier:null,returnAt:0};});
 this.zones=[[-7,30],[-29,7],[40,5],[11,-32]].map(([x,z],i)=>({id:'ABCD'[i],...node(x,z),radius:3.8,owner:null,progress:0,capturing:null,occupant:null,contested:false,counts:{blue:0,red:0}}));this.scoreClock=0;for(const a of m.actors)a.carrying=null;
 }
 home(flag){Object.assign(flag,flag.home,{state:'home',carrier:null,returnAt:0});}
 onDeath(a){if(!a.carrying)return;const flag=this.flags.find(f=>f.team===a.carrying);if(flag){const n=this.match.nav.nearest(a.body);Object.assign(flag,{x:n.x,y:n.y,z:n.z,state:'dropped',carrier:null,returnAt:this.match.time+25});}a.carrying=null;}
 near(a,p,r){return a.alive&&distance(a.body,p)<=r&&Math.abs(a.body.y-p.y)<1.3&&obstruction(this.match.world.colliders,{x:a.body.x,y:a.body.y+.7,z:a.body.z},{x:p.x,y:p.y+.7,z:p.z})>.999;}
 step(dt){const m=this.match;if(!this.active)return;
  if(m.config.mode==='ctf'){
   for(const f of this.flags){if(f.state==='carried'){const carrier=m.actors.find(a=>a.id===f.carrier);if(carrier?.alive){f.x=carrier.body.x;f.y=carrier.body.y;f.z=carrier.body.z;}else if(carrier)this.onDeath(carrier);}
    if(f.state==='dropped'&&m.time>=f.returnAt)this.home(f);
    // Friendly recovery has priority in a simultaneous touch.
    if(f.state==='dropped'&&m.actors.some(a=>a.team===f.team&&this.near(a,f,1.4))){this.home(f);m.events.push({type:'flag-return',actor:-1,team:f.team,position:f});}
    if(f.state!=='carried'){const taker=m.actors.find(a=>a.team!==f.team&&!a.carrying&&this.near(a,f,1.35));if(taker){f.state='carried';f.carrier=taker.id;taker.carrying=f.team;m.events.push({type:'flag-taken',actor:taker.id,position:f});}}
   }
   for(const a of m.actors)if(a.alive&&a.carrying){const own=this.flags.find(f=>f.team===a.team),enemy=this.flags.find(f=>f.team===a.carrying);if(own.state==='home'&&this.near(a,own.home,1.7)){m.score[a.team]++;a.captures=(a.captures||0)+1;a.carrying=null;this.home(enemy);m.events.push({type:'capture',actor:a.id,team:a.team,position:own.home});}}
  }else{
   for(const z of this.zones){let blue=0,red=0;for(const a of m.actors)if(this.near(a,z,z.radius)){if(a.team==='blue')blue++;else red++;}z.counts={blue,red};z.contested=blue>0&&red>0;z.occupant=z.contested?null:blue?'blue':red?'red':null;
    if(z.contested||!z.occupant)continue;const team=z.occupant,n=team==='blue'?blue:red,delta=dt/captureSeconds(n);
    if(z.owner===team){if(z.progress>0)z.progress=Math.max(0,z.progress-delta);if(!z.progress)z.capturing=null;continue;}
    if(z.capturing&&z.capturing!==team){z.progress=Math.max(0,z.progress-delta);if(!z.progress)z.capturing=team;continue;}
    z.capturing=team;z.progress=Math.min(1,z.progress+delta);
    if(z.progress>=1-1e-8){if(z.owner){z.owner=null;z.progress=0;}else{z.owner=team;z.progress=0;z.capturing=null;m.events.push({type:'zone-captured',actor:-1,team,zone:z.id,position:z});}}
   }
   this.scoreClock+=dt;while(this.scoreClock>=1){this.scoreClock--;for(const z of this.zones)if(z.owner)m.score[z.owner]++;}
  }
 }
 botGoal(b){if(!this.active||!b.alive)return false;const m=this.match,time=m.time;if(b.target&&time>=b.recognizedAt&&!b.held&&!b.throwAction){const d=distance(b.body,b.target.body),slots=b.arsenal.slots,slot=d<2.6?0:d<11&&slots[2].ammo+slots[2].reserve>0?2:slots[1].ammo+slots[1].reserve>0?1:slots[2].ammo+slots[2].reserve>0?2:0;if(b.arsenal.select(slot))m.events.push({type:'switch',actor:b.id,position:{x:b.body.x,y:b.body.y,z:b.body.z}});}
  if(time<(b.nextObjective||0)&&b.goal)return true;b.nextObjective=time+.65;
  if(!b.carrying&&b.arsenal.slots[1].ammo+b.arsenal.slots[1].reserve<12){let supply=null,best=Infinity;for(const c of m.crates){const d=distance(b.body,c);if(c.available&&c.rifle&&d<best){best=d;supply=c;}}if(supply){b.state='REABASTECER';m.setGoal(b,supply);return true;}}
  let goal=null,role='OBJETIVO';
  if(m.config.mode==='ctf'){const own=this.flags.find(f=>f.team===b.team),enemy=this.flags.find(f=>f.team!==b.team),defend=Math.floor((b.id-1)/2)%3===1||b.profile.name==='Defensivo';
   if(b.carrying){goal=own.state==='home'?own.home:own;role=own.state==='home'?'ENTREGAR BANDERA':'RECUPERAR BASE';}
   else if(own.state!=='home'&&(defend||distance(b.body,own)<17)){goal=own;role='RECUPERAR BANDERA';}
   else if(enemy.state==='carried'){const carrier=m.actors.find(a=>a.id===enemy.carrier);goal=carrier?{x:carrier.body.x+(b.id%2?2:-2),y:carrier.body.y,z:carrier.body.z+2}:own.home;role='ESCOLTAR';}
   else if(defend){goal={x:own.home.x+Math.sin(b.id+time*.08)*4,y:own.home.y,z:own.home.z+Math.cos(b.id+time*.08)*4};role='DEFENDER';}
   else{goal=enemy;role='ROBAR BANDERA';}
  }else{let best=Infinity;for(const z of this.zones){const assigned=m.bots.filter(a=>a!==b&&a.alive&&a.team===b.team&&a.objectiveId===z.id).length,hostile=z.owner!==b.team,underAttack=z.owner===b.team&&z.capturing&&z.capturing!==b.team;
    const cost=distance(b.body,z)+(hostile?0:underAttack?-15:45)+assigned*26+(z.contested?4:0)+((b.id+z.id.charCodeAt(0))%4)*2;
    if(cost<best){best=cost;goal=z;}}
   if(goal){b.objectiveId=goal.id;role=goal.owner===b.team?'DEFENDER ZONA':'CAPTURAR '+goal.id;const angle=b.id*2.4+time*.18;goal={x:goal.x+Math.cos(angle)*1.5,y:goal.y,z:goal.z+Math.sin(angle)*1.5};}
  }
  if(goal){b.positionPlanUntil=0;b.state=role;m.setGoal(b,m.nav.nearest(goal,m.nav.nearest(b.body).component));if(b.arsenal.ammo<b.arsenal.weapon.capacity*.3&&!b.arsenal.reload)b.arsenal.requestReload();return true;}return false;
 }
 limit(){const c=this.match.config;return c.mode==='ctf'?c.captureLimit:c.mode==='domination'?c.dominationLimit:c.limit;}
}
