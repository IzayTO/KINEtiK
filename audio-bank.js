// Original mono sample synthesis, once per AudioContext. No downloads or convolution.
// Short impulses, resonant body, mechanical transients and a restrained diffuse tail.
export const BANK_SECONDS={'atomic-impact':2,'atomic-roar':5.5,'atomic-pulse':.48,medal:.32,chain:.20,rifle:.32,shotgun:.52,explosion:1.15,'airstrike-impact':1.9,step:.16,sprint:.18,land:.28,jump:.20,pump:.26,reload:.40,shell:.18,loaded:.22,switch:.15,casing:.28,glass:.52,gas:.72,throw:.24,'fire-loop':.62,antidote:.27};
export function createAudioBank(ctx){const bank={};for(const [kind,duration]of Object.entries(BANK_SECONDS)){const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);let low=0,rumble=0,previous=0,seed=kind.split('').reduce((s,c)=>s+c.charCodeAt(0),197),peak=0;
 const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 for(let i=0;i<data.length;i++){const t=i/ctx.sampleRate,n=rnd();low+=.14*(n-low);rumble+=.016*(n-rumble);const high=n-previous;previous=n;let v=0;
  if(kind==='atomic-impact'){v=n*Math.exp(-t/.027)*.7+Math.sin(2*Math.PI*(43*t-5*t*t))*Math.exp(-t/.40)*.50+low*Math.exp(-t/.55)*3+rumble*Math.exp(-t/.72)*2;}
  else if(kind==='atomic-roar'){const rise=Math.min(1,t/.5),tail=Math.pow(Math.max(0,1-t/duration),1.7);v=(rumble*3.2+low*.45)*(rise*tail)*(.8+.2*Math.sin(t*5));}
  else if(kind==='atomic-pulse'){v=Math.sin(2*Math.PI*(92*t-42*t*t))*Math.exp(-t/.13)*.7+rumble*Math.exp(-t/.16)*1.8;}
  else if(kind==='medal'||kind==='chain'){v=Math.sin(t*2*Math.PI*(kind==='medal'?740:580))*Math.exp(-t/.075)*.40;if(t>.07)v+=Math.sin((t-.07)*2*Math.PI*(kind==='medal'?1110:870))*Math.exp(-(t-.07)/.09)*.3;}
  else if(kind==='rifle'||kind==='shotgun'||kind==='explosion'||kind==='airstrike-impact'){const heavy=kind!=='rifle',boom=kind==='explosion'||kind==='airstrike-impact',body=kind==='airstrike-impact'?32:boom?42:heavy?73:127;
   v=n*Math.exp(-t/(boom?.045:heavy?.016:.008))*.65+Math.sin(2*Math.PI*body*t*(1-.24*t))*Math.exp(-t/(boom?.21:heavy?.075:.042))*.38+low*Math.exp(-t/(boom?.38:heavy?.16:.085))*(boom?3.5:heavy?1.8:1.1)+rumble*Math.exp(-t/(boom?.55:.15))*.8;
   // Two very quiet early reflections add body without a long, busy reverb.
   for(const delay of [heavy?.037:.019,heavy?.069:.043])if(t>delay)v+=low*.21*Math.exp(-(t-delay)/.07);
  }else if(['step','sprint','land','jump'].includes(kind)){const heavy=kind==='land',run=kind==='sprint',freq=heavy?64:run?91:120;v=Math.sin(2*Math.PI*freq*t)*Math.exp(-t/(heavy?.058:.022))*.6+low*Math.exp(-t/.045)*1.2+high*.13*Math.exp(-Math.abs(t-.03)/.012);if(kind==='jump')v=low*Math.sin(Math.PI*t/duration)*.55;}
  else if(kind==='glass'){for(const [delay,hz,amp]of [[0,3800,.28],[.025,2400,.32],[.061,4700,.22],[.12,1800,.16],[.20,3100,.10],[.31,5100,.07]])if(t>delay){const d=t-delay;v+=(Math.sin(d*hz*Math.PI*2)+n*.8)*Math.exp(-d/.035)*amp;}}
  else if(kind==='gas'){v=(n*.16+low*.45)*Math.min(1,t/.045)*Math.exp(-t/.34);}
  else if(kind==='fire-loop'){v=low*.42*(.65+.35*Math.sin(t*37))+high*.17*Math.exp(-Math.abs(t-.09)/.006)+high*.12*Math.exp(-Math.abs(t-.32)/.009);v*=Math.sin(Math.PI*t/duration);}
  else if(kind==='throw'){v=low*Math.sin(Math.PI*t/duration)*(.5+.5*t/duration);}
  else{const metallic=['pump','loaded','casing','shell'].includes(kind),delays=kind==='reload'?[0,.11,.28]:kind==='pump'?[0,.10,.19]:kind==='casing'?[0,.08,.14]:[0,.04];for(const delay of delays)if(t>delay){const d=t-delay;v+=(n*.50+Math.sin(d*(metallic?2300:750)*Math.PI*2)*.25+Math.sin(d*163*Math.PI*2)*.25)*Math.exp(-d/(kind==='casing'?.021:.013));}if(kind==='pump')v+=high*.07*Math.sin(Math.PI*t/duration);}
  v*=Math.min(1,t/.0008)*Math.min(1,(duration-t)/.018);data[i]=v;peak=Math.max(peak,Math.abs(v));
 }const scale=.88/Math.max(.01,peak);for(let i=0;i<data.length;i++)data[i]*=scale;bank[kind]=buffer;}return bank;}
