// Small procedural effects. No downloads, loops, or permanent audio nodes.
export class AudioFX {
  constructor(params){this.params=params;this.context=null;this.noise=null;}
  unlock(){
    if(!this.context){
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      try{this.context=new C();const n=this.context.sampleRate*0.35;this.noise=this.context.createBuffer(1,n,this.context.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);}catch{return;}
    }this.context.resume().catch(()=>{});
  }
  sound(kind){
    if(!this.params.sound||!this.context||this.context.state!=='running')return;
    const c=this.context,t=c.currentTime,src=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    const specs={shot:[0.065,1400,0.12],hit:[0.04,2600,0.08],step:[0.028,190,0.07],land:[0.06,120,0.13],slide:[0.045,550,0.22]};
    const [volume,freq,duration]=specs[kind]||specs.step;
    src.buffer=this.noise;filter.type=kind==='hit'?'highpass':'lowpass';filter.frequency.value=freq;
    gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(0.001,t+duration);
    src.connect(filter);filter.connect(gain);gain.connect(c.destination);src.start(t);src.stop(t+duration);
    src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
  }
}
