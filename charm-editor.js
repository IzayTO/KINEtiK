import {BOTS,colorCode,sameDesign,DesignHistory} from './visor-designs.js';
import {botName} from './bot-roster.js';
import {VisorBoard} from './visor-board.js';
import {COLS,ROWS,CELLS,CUTOUT,CHARMS,MAX_JSON,charms,floodCharm,encodeCharm,decodeCharm} from './charm-designs.js';
import {CharmPreview} from './charm-preview.js';

const actors=Array.from({length:BOTS+1},(_,id)=>id);
const actorName=id=>id===0?'Tú':'Bot '+String(id).padStart(2,'0')+' · '+botName(id);
const button=(name,label)=>'<button type="button" data-act="'+name+'">'+label+'</button>';
const inks=['#78f9d7','#69bdf4','#ac89fb','#ff889c','#ff9d50','#ffd563','#eef4fb','#132230'];
function markup(){return `
 <header class="ve-head"><div class="ve-title"><span>Personalización</span><h1>Llaveros LED</h1></div>
 <button type="button" data-act="close">Volver</button></header>
 <div class="charm-loadout"><label>Diseño de <select data-field="actor">${actors.map(id=>'<option value="'+id+'">'+actorName(id)+'</option>').join('')}</select></label>
 <label>Arma <select data-field="weapon">${Object.entries(CHARMS).map(([key,name])=>'<option value="'+key+'">'+name+'</option>').join('')}</select></label>
 ${button('recipients','Destinatarios')}${button('save','Guardar y aplicar')}</div>
 <section class="charm-recipients" hidden><div><b>Aplicar a</b>${button('self','Solo yo')}${button('bots','Todos los bots')}${button('clear-targets','Limpiar selección')}${button('recipients','Listo')}</div>
 <div class="charm-checks">${actors.map(id=>'<label><input type="checkbox" value="'+id+'">'+actorName(id)+'</label>').join('')}</div></section>
 <div class="ve-panels"><section class="ve-card ve-led"><header><h2>Diseño LED</h2><span>24 × 10 · 240 LED</span></header>
 <canvas id="charm-grid" aria-label="Cuadrícula editable de 24 columnas y 10 filas"></canvas>
 <div class="ve-navigation"><div class="ve-zoom"><button type="button" data-act="minus" aria-label="Alejar cuadrícula">−</button><output id="charm-scale">100%</output><button type="button" data-act="plus" aria-label="Acercar cuadrícula">+</button></div>${button('pan','Desplazar')}${button('mirror','Simetría')}</div>
 <div class="ve-colors"><strong>Color</strong>${inks.map(hex=>'<button type="button" data-ink="'+hex+'" style="--ink:'+hex+'" aria-label="Color '+hex+'"></button>').join('')}<label class="ve-custom">＋<input type="color" data-field="color" value="#78f9d7" aria-label="Elegir color"></label></div>
 <div class="ve-tools">${[['pencil','Lápiz'],['erase','Borrar'],['cut','Recortar LED'],['bucket','Rellenar zona'],['fill','Llenar todo'],['off','Apagar todo'],['undo','Deshacer'],['redo','Rehacer']].map(([k,v])=>button(k,v)).join('')}</div></section>
 <section class="ve-card ve-preview"><header><h2>Vista previa 3D</h2>${button('whole','Ver arma completa')}</header>
 <div class="ve-stage"><canvas id="charm-model" aria-label="Arma y llavero en 3D"></canvas><span class="ve-preview-error" hidden>Vista 3D no disponible.</span></div>
 <div class="ve-stage-caption"><span data-field="model-name"></span><span>Arrastra para girar</span></div></section></div>
 <footer class="ve-footer">${button('copy','Copiar diseño')}${button('paste','Pegar diseño')}<div class="ve-files">${button('export','Exportar diseño')}${button('backup','Exportar todos')}${button('import','Importar JSON')}</div><input type="file" data-field="file" accept=".json,application/json,text/json" hidden></footer>
 <details class="charm-collection"><summary>Mis diseños</summary><div>
 <label>Nombre <input type="text" maxlength="64" data-field="preset-name"></label>${button('save-preset','Guardar diseño')}
 <label>Guardados <select data-field="presets"></select></label>${button('load-preset','Usar diseño')}${button('remove-preset','Quitar de la colección')}</div></details>
 <p id="charm-status" role="status" aria-live="polite"></p>`;}

export class CharmEditor{
 constructor(getView,library=charms){
  this.getView=getView;this.library=library;this.actor=0;this.weapon='rifle';this.color=0x78f9d7+1;
  this.histories=new Map();this.clipboard=null;this.tool='pencil';this.mirror=false;this.selectionVersion=0;
  this.dialog=document.createElement('dialog');this.dialog.id='charm-editor';this.dialog.setAttribute('aria-label','Editor de llaveros LED');
  this.dialog.innerHTML=markup();document.body.append(this.dialog);
  this.board=new VisorBoard(this.el('#charm-grid'),this,COLS,ROWS,CUTOUT);
  this.checks=Array.from(this.el('.charm-checks').querySelectorAll('input'));
  this.field('actor').onchange=()=>this.select(Number(this.field('actor').value),this.weapon);
  this.field('weapon').onchange=()=>this.select(this.actor,this.field('weapon').value);
  this.field('file').onchange=e=>this.load(e.target);
  this.field('color').oninput=e=>this.setColor(e.target.value);
  this.field('presets').onchange=e=>{this.field('preset-name').value=e.target.value;};
  this.dialog.addEventListener('click',e=>{
   const b=e.target.closest('button');if(!b)return;
   if(b.dataset.ink)this.setColor(b.dataset.ink);else if(b.dataset.act)this.action(b.dataset.act);
  });
  this.el('.charm-checks').onchange=()=>this.updateRecipients();
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();this.close();}});
  this.dialog.addEventListener('keyup',e=>e.stopPropagation());
  this.resize=new ResizeObserver(()=>this.redraw(false));
 }
 get opened(){return this.dialog.open;}
 el(selector){return this.dialog.querySelector(selector);}
 field(name){return this.el('[data-field="'+name+'"]');}
 act(name){return this.el('[data-act="'+name+'"]');}
 status(text){this.el('#charm-status').textContent=text;}
 get selected(){return this.checks.filter(input=>input.checked).map(input=>Number(input.value));}
 historyFor(actor){
  const key=actor+'/'+this.weapon;
  if(!this.histories.has(key))this.histories.set(key,new DesignHistory());
  return this.histories.get(key);
 }
 get history(){return this.historyFor(this.actor);}
 refreshPresets(preferred=this.field('presets').value){
  const list=this.field('presets');list.replaceChildren();
  for(const name of this.library.presets.keys())list.add(new Option(name,name));
  const empty=!list.length;
  if(empty)list.add(new Option('Sin diseños guardados',''));
  else if(this.library.presets.has(preferred))list.value=preferred;
  list.disabled=this.act('load-preset').disabled=this.act('remove-preset').disabled=empty;
  this.field('preset-name').value=list.value;
 }
 open(){
  if(this.opened)return;this.dialog.showModal();const canvas=this.el('#charm-model');
  try{this.preview=new CharmPreview(canvas,this.getView(),()=>this.redraw(false));}catch{this.preview=null;}
  this.el('.ve-preview-error').hidden=!!this.preview;this.act('whole').disabled=!this.preview;
  this.select(this.actor,this.weapon);this.refreshPresets();this.resize.observe(this.el('#charm-grid'));this.resize.observe(this.el('.ve-stage'));
 }
 close(){
  if(!this.opened)return;this.board.cancel();this.resize.disconnect();cancelAnimationFrame(this.frame);this.frame=0;
  this.preview?.dispose();this.preview=null;
  // A new canvas can immediately acquire a fresh context when the dialog reopens on iOS.
  const canvas=this.el('#charm-model');canvas.replaceWith(canvas.cloneNode(false));this.dialog.close();
 }
 select(actor,weapon){
  this.board.cancel();this.actor=actor;this.weapon=weapon;this.pixels=this.library.get(actor,weapon);
  this.field('actor').value=String(actor);this.field('weapon').value=weapon;this.checks.forEach(input=>{input.checked=Number(input.value)===actor;});
  this.el('.charm-recipients').hidden=true;this.updateRecipients();
  this.field('model-name').textContent=CHARMS[weapon];this.preview?.select(weapon);
  this.act('whole').textContent=this.preview?.whole?'Ver llavero':'Ver arma completa';
  this.status('Los trazos se guardan para los destinatarios seleccionados.');this.redraw();
 }
 updateRecipients(){
  this.selectionVersion++;
  const selected=this.selected;
  this.act('recipients').textContent='Aplicar a · '+(selected.length===1?actorName(selected[0]):selected.length+' personajes');
  this.act('save').disabled=!selected.length;
 }
 setColor(hex){this.color=parseInt(hex.slice(1),16)+1;if(this.tool==='erase'||this.tool==='cut'||this.tool==='pan')this.tool='pencil';this.field('color').value=hex;this.redraw(false);}
 flood(cell){floodCharm(this.pixels,cell.x,cell.y,this.color,this.mirror);}
 store(){
  const ids=this.selected;
  if(!ids.length){this.status('Selecciona un destinatario y pulsa Guardar y aplicar.');return;}
  for(const id of ids)if(id!==this.actor){
   const previous=this.library.get(id,this.weapon);
   if(!sameDesign(previous,this.pixels))this.historyFor(id).remember(previous);
  }
  const saved=this.library.apply(ids,this.weapon,this.pixels);
  this.status(saved?'Guardado · '+CHARMS[this.weapon]+' · '+(ids.length===1?actorName(ids[0]):ids.length+' personajes')+'.':'Diseño en memoria. Exporta una copia JSON para conservarlo.');
 }
 commit(before){if(!sameDesign(before,this.pixels)){this.history.remember(before);this.store();}this.redraw();}
 replace(pixels,apply=false){
  this.board.cancel();const before=this.pixels.slice();this.pixels=pixels.slice();
  if(apply&&sameDesign(before,this.pixels)){this.store();this.redraw();}else this.commit(before);
 }
 action(name){
  if(['pencil','erase','cut','bucket','pan'].includes(name)){this.tool=name;this.redraw(false);return;}
  switch(name){
   case 'close':this.close();return;
   case 'recipients':this.el('.charm-recipients').hidden=!this.el('.charm-recipients').hidden;return;
   case 'self':case 'bots':case 'clear-targets':
    for(const input of this.checks)input.checked=name==='self'?input.value==='0':name==='bots'&&input.value!=='0';
    this.updateRecipients();return;
   case 'minus':case 'plus':this.board.zoomBy(name==='minus'?1/1.4:1.4);return;
   case 'mirror':this.mirror=!this.mirror;break;
   case 'fill':this.replace(new Uint32Array(CELLS).fill(this.color));return;
   case 'off':this.replace(new Uint32Array(CELLS));return;
   case 'undo':case 'redo':this.board.cancel();this.pixels=this.history[name](this.pixels);this.store();this.redraw();return;
   case 'copy':this.clipboard=this.pixels.slice();this.status('Diseño copiado. Elige otra arma o personaje y pulsa Pegar diseño.');break;
   case 'paste':if(this.clipboard)this.replace(this.clipboard,true);return;
   case 'save':this.store();return;
   case 'save-preset':{
    const name=this.field('preset-name').value.trim();
    try{const saved=this.library.savePreset(name,this.pixels);this.refreshPresets(name);this.status(saved?'Diseño guardado en tu colección.':'Diseño en memoria. Exporta el JSON para conservarlo.');}
    catch(error){this.status(error.message);}return;
   }
   case 'load-preset':{const pixels=this.library.getPreset(this.field('presets').value);if(pixels)this.replace(pixels,true);return;}
   case 'remove-preset':{
    const saved=this.library.removePreset(this.field('presets').value);this.refreshPresets();
    this.status(saved?'Diseño retirado de la colección.':'Cambio en memoria. Exporta una copia JSON para conservarlo.');return;
   }
   case 'whole':if(this.preview){this.preview.whole=!this.preview.whole;this.act('whole').textContent=this.preview.whole?'Ver llavero':'Ver arma completa';}break;
   case 'export':this.download(encodeCharm(this.pixels),'KINETIK-llavero-'+this.weapon+'.json');return;
   case 'backup':this.download(this.library.export(),'KINETIK-todos-los-llaveros.json');return;
   case 'import':this.field('file').click();return;
  }
  this.redraw(false);
 }
 download(text,name){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=name;this.dialog.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 async load(input){
  const file=input.files?.[0];input.value='';if(!file)return;
  const version=++this.selectionVersion;
  try{
   if(file.size>MAX_JSON)throw Error('El archivo es demasiado grande.');
   const text=await file.text();if(!this.opened||version!==this.selectionVersion)return;
   const data=JSON.parse(text);
   if(data?.format==='kinetik-llavero')this.replace(decodeCharm(data),true);
   else{const saved=this.library.import(text);this.histories.clear();this.select(this.actor,this.weapon);this.refreshPresets();this.status(saved?'Copia de llaveros restaurada.':'Copia restaurada en memoria. Exporta el JSON para conservarla.');}
  }catch(error){this.status(error instanceof SyntaxError?'El archivo no contiene JSON válido.':error.message);}
 }
 redraw(design=true){
  if(!this.opened)return;this.dirty=this.dirty||design;if(this.frame)return;
  this.frame=requestAnimationFrame(()=>{
   this.frame=0;if(!this.opened)return;this.board.draw(this.pixels);
   if(this.dirty)this.preview?.setDesign(this.pixels);this.dirty=false;this.preview?.draw();
   const zoom=this.board.view.zoom;this.el('#charm-scale').textContent=Math.round(zoom*100)+'%';
   this.act('minus').disabled=zoom<=1.001;this.act('plus').disabled=zoom>=5.999;
   this.act('undo').disabled=!this.history.past.length;this.act('redo').disabled=!this.history.future.length;this.act('paste').disabled=!this.clipboard;
   for(const name of ['pencil','erase','cut','bucket','pan','mirror'])this.act(name).setAttribute('aria-pressed',String(name==='mirror'?this.mirror:name===this.tool));
   for(const b of this.dialog.querySelectorAll('[data-ink]'))b.setAttribute('aria-pressed',String(b.dataset.ink===colorCode(this.color)));
  });
 }
}
