import {BOTS, COLS, ROWS, CELLS, ORIGINAL_GREEN, template, visors, sameDesign, colorCode, DesignHistory, slotName} from './visor-designs.js';
import {VisorBoard} from './visor-board.js';
import {HelmetPreview} from './visor-preview.js';

const palette=[
  ['Menta','#78f9d7'],['Azul','#69bdf4'],['Violeta','#ac89fb'],['Rosa','#f57daf'],
  ['Naranja','#ff9d50'],['Ámbar','#ffd563'],['Blanco','#eef4fb']
];
const paths={
  back:'M14 5l-7 7 7 7',next:'M9 5l7 7-7 7',
  pencil:'M4 16L16 4l4 4L8 20l-5 1z M14 6l4 4',
  erase:'M3 14L14 3l7 7-10 10H8z M7 10l7 7 M11 20h10',
  fill:'M3 12l8-8 9 9-7 7h-3z M7 2l8 8 M3 12h16 M20 16s-3 3-2 4a2 2 0 0 0 4-1z',
  off:'M12 2v9 M7 5a8 8 0 1 0 10 0',undo:'M9 5L3 11l6 6 M4 11h10a6 6 0 0 1 6 6',
  redo:'M15 5l6 6-6 6 M20 11H10a6 6 0 0 0-6 6',
  pan:'M7 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-2 7-6 7h-1c-2 0-4-1-5-3l-4-6a1.6 1.6 0 0 1 2.5-2z',
  copy:'M8 7h12v14H8z M5 17H3V3h12v2',save:'M3 3h15l3 3v15H3z M7 3v6h9V3 M7 21v-8h10v8',
  original:'M3 4v6h6 M4 10a8 8 0 1 1 0 6',mirror:'M12 2v20 M8 6L2 17h6z M16 6l6 11h-6z'
};
function icon(name) { return '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="'+paths[name]+'"/></svg>'; }
function button(action,label,symbol) {
  return '<button type="button" data-act="'+action+'">'+(symbol?icon(symbol):'')+'<span>'+label+'</span></button>';
}
// Pixel 22 exports RGB hex codes in row-major order, top-left to bottom-right.
export function parsePixelArt(text) {
  const tokens=text.trim()?text.trim().split(/\s+/):[];
  if (tokens.length!==CELLS) throw new Error('Se necesitan '+CELLS+' colores ('+COLS+' × '+ROWS+'). Recibidos: '+tokens.length+'.');
  const pixels=new Uint32Array(CELLS);
  for (let i=0;i<CELLS;i++) {
    if (!/^#[0-9a-f]{6}$/i.test(tokens[i]))
      throw new Error('HEX inválido en fila '+(Math.floor(i/COLS)+1)+', columna '+(i%COLS+1)+'. Usa #RRGGBB.');
    pixels[i]=parseInt(tokens[i].slice(1),16)+1; // 0 is off; #000000 is active black.
  }
  return pixels;
}
const slotOptions=Array.from({length:BOTS+1},(_,id)=>'<option value="'+id+'">'+slotName(id)+'</option>').join('');
function editorMarkup() {
  return [
    '<header class="ve-head"><button type="button" data-act="close" class="ve-back" aria-label="Volver a personalización">'+icon('back')+'</button>',
    '<div class="ve-title"><span>Personalización</span><h1 id="ve-heading">Editor de visor</h1></div>',
    '<div class="ve-slots"><button type="button" data-act="prev" aria-label="Personaje anterior">'+icon('back')+'</button>',
    '<select id="ve-slot" aria-label="Personaje en edición">'+slotOptions+'</select><button type="button" data-act="next" aria-label="Personaje siguiente">'+icon('next')+'</button></div>',
    button('copy','Copiar a…','copy'),button('save','Guardar','save'),'</header>',
    '<div class="ve-copy" hidden><label>Copiar diseño a <select id="ve-dest">'+slotOptions+'</select></label>'+button('apply-copy','Copiar')+button('hide-copy','Cancelar')+'</div>',
    '<div class="ve-panels"><section class="ve-card ve-led"><header><h2>Editor LED</h2><span>22 × 8 · 176 LED</span></header>',
    '<canvas id="ve-grid" aria-label="Cuadrícula de 22 columnas por 8 filas. Toca o arrastra para dibujar."></canvas>',
    '<div class="ve-navigation"><div class="ve-zoom"><button type="button" data-act="minus" aria-label="Alejar cuadrícula">−</button><output id="ve-scale">100%</output><button type="button" data-act="plus" aria-label="Acercar cuadrícula">+</button></div>',
    button('pan','Desplazar','pan'),button('mirror','Simetría','mirror'),'</div>',
    '<div class="ve-colors"><strong>Color</strong>'+palette.map(([name,hex])=>'<button type="button" data-ink="'+hex+'" style="--ink:'+hex+'" aria-label="'+name+'" title="'+name+'"></button>').join('')+'<label class="ve-custom" title="Color personalizado">＋<input id="ve-color" type="color" aria-label="Color personalizado" value="#78f9d7"></label></div>',
    '<div class="ve-tools">'+[['pencil','Lápiz','pencil'],['erase','Borrador','erase'],['fill','Rellenar','fill'],['off','Apagar','off'],['undo','Deshacer','undo'],['redo','Rehacer','redo'],['original','Original','original']].map(item=>button(...item)).join('')+'</div></section>',
    '<section class="ve-card ve-preview"><header><h2>Vista previa 3D</h2></header><div class="ve-stage"><canvas id="ve-model" aria-label="Casco del personaje. Arrastra para girarlo."></canvas><span class="ve-preview-error" hidden>Vista 3D no disponible en este dispositivo.</span></div><div class="ve-stage-caption"><span id="ve-head-name"></span><span>Arrastra para girar</span></div></section></div>',
    '<footer class="ve-footer"><label>Plantilla <select id="ve-template"><option value="eyes">Ojos</option><option value="bars">Barras</option><option value="original">Visor original</option></select></label>'+button('template','Aplicar')+'<div class="ve-files">'+button('export','Exportar JSON')+button('import','Importar JSON')+button('paste-art','Pegar 8x22-ART')+'</div><input id="ve-file" type="file" accept=".json,application/json,text/json" hidden></footer>',
    '<p id="ve-status" role="status" aria-live="polite"></p>',
    '<style>#visor-editor .ve-files{flex-wrap:wrap;max-width:100%}#visor-editor #ve-art-dialog{box-sizing:border-box;width:min(620px,calc(100% - 24px));max-height:calc(100dvh - 24px);overflow:auto;margin:auto;padding:16px;border:1px solid var(--line);border-radius:10px;background:#202d3a;color:var(--text);font:inherit}#ve-art-dialog::backdrop{background:rgba(8,14,22,.76)}#ve-art-dialog p{margin:9px 0;color:var(--sub)}#ve-art-dialog textarea{display:block;width:100%;min-height:92px;max-height:32dvh;resize:vertical;padding:10px;border:1px solid #526478;border-radius:6px;background:#101923;color:var(--text);font:16px/1.45 ui-monospace,monospace;white-space:pre-wrap;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text}#ve-art-dialog textarea:focus-visible{outline:2px solid var(--mint)}#ve-art-dialog #ve-art-error{min-height:1em;color:#ffb3a5}#ve-art-dialog .ve-art-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}#visor-editor [data-act=apply-art]{background:var(--mint);border-color:#c0fff1;color:#0a302c}</style>',
    '<dialog id="ve-art-dialog" aria-labelledby="ve-art-title"><h2 id="ve-art-title">Pegar 8x22-ART</h2><p id="ve-art-target"></p><p>En Pixel 22 pulsa Copiar colores HEX y pega aquí los 176 colores. Se aplicarán de izquierda a derecha, desde la primera fila hasta la octava.</p><textarea id="ve-art-text" aria-label="Colores HEX del diseño" rows="5" maxlength="8192" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="#000000 #FFAA00 #FFFFFF …"></textarea><p id="ve-art-error" role="alert"></p><div class="ve-art-actions">'+button('cancel-art','Cancelar')+button('apply-art','Cargar')+'</div></dialog>'
  ].join('');
}

export class VisorEditor {
  constructor(library=visors) {
    this.library=library; this.slot=1;
    this.histories=Array.from({length:BOTS+1},()=>new DesignHistory());
    this.tool='pencil'; this.mirror=false; this.color=ORIGINAL_GREEN;
    this.dialog=document.createElement('dialog'); this.dialog.id='visor-editor';
    this.dialog.setAttribute('aria-labelledby','ve-heading');
    this.dialog.innerHTML=editorMarkup(); document.body.append(this.dialog);
    this.el=id=>this.dialog.querySelector('#ve-'+id);
    this.act=id=>this.dialog.querySelector('[data-act="'+id+'"]');
    this.board=new VisorBoard(this.el('grid'),this);
    this.dialog.onclick=e=>{
      const ink=e.target.closest('[data-ink]');
      if (ink) return this.useColor(ink.dataset.ink);
      const trigger=e.target.closest('[data-act]');
      if (trigger) this.action(trigger.dataset.act);
    };
    this.el('slot').onchange=e=>this.select(Number(e.target.value));
    this.el('color').oninput=e=>this.useColor(e.target.value);
    this.el('file').onchange=e=>this.loadFile(e.target);
    const artDialog=this.el('art-dialog');
    artDialog.addEventListener('keydown',e=>{
      e.stopPropagation(); // Keep text editing and clipboard shortcuts native.
      if (e.key==='Escape') { e.preventDefault(); artDialog.close(); }
    });
    artDialog.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();artDialog.close();});
    this.el('art-text').addEventListener('input',()=>{this.el('art-error').textContent='';});
    this.dialog.addEventListener('keydown',e=>{
      e.stopPropagation();
      if (e.key==='Escape') { e.preventDefault(); this.close(); }
      if ((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z') { e.preventDefault(); this.action(e.shiftKey?'redo':'undo'); }
    });
    this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.dialog.addEventListener('close',e=>{
      if(e.target!==this.dialog) return;
      this.opened=false; this.observer.disconnect(); this.board.cancel();
      cancelAnimationFrame(this.frame); this.frame=0;
      document.getElementById('open-visor')?.focus();
    });
    this.observer=new ResizeObserver(()=>this.redraw(false));
  }
  open() {
    if (this.opened) return;
    this.opened=true; this.dialog.showModal();
    this.observer.observe(this.el('grid')); this.observer.observe(this.el('model'));
    if (!this.preview) {
      try { this.preview=new HelmetPreview(this.el('model'),()=>this.redraw(false)); }
      catch { this.dialog.querySelector('.ve-preview-error').hidden=false; }
    }
    this.select(this.slot); this.act('close').focus();
  }
  close() { this.el('art-dialog').close(); this.board.cancel(); this.dialog.close(); }
  select(slot) {
    if(this.el('art-dialog').open) this.el('art-dialog').close();
    this.board.cancel(); this.slot=slot; this.pixels=this.library.get(slot);
    this.el('slot').value=String(slot); this.el('head-name').textContent=slotName(slot);
    this.dialog.querySelector('.ve-copy').hidden=true; this.act('copy').setAttribute('aria-expanded','false');
    this.status(this.library.lastSaved?'':'El almacenamiento local no está disponible. Puedes exportar tus visores.');
    this.redraw();
  }
  useColor(hex) {
    this.color=parseInt(hex.slice(1),16)+1; this.el('color').value=hex;
    this.tool='pencil'; this.redraw(false);
  }
  status(message) { this.el('status').textContent=message; }
  commit(before) {
    if (sameDesign(before,this.pixels)) return;
    this.histories[this.slot].remember(before);
    this.library.set(this.slot,this.pixels);
    this.status(this.library.lastSaved?'Guardado en este dispositivo.':'Cambio en memoria. Exporta una copia para conservarlo.');
  }
  replace(pixels) {
    const before=this.pixels; this.pixels=pixels; this.commit(before); this.redraw();
  }
  action(name) {
    if(this.board.touches?.size)this.board.cancel();
    const history=this.histories[this.slot];
    switch (name) {
      case 'close': this.close(); return;
      case 'prev': this.select((this.slot+BOTS)%(BOTS+1)); return;
      case 'next': this.select((this.slot+1)%(BOTS+1)); return;
      case 'pencil': case 'erase': case 'pan': this.tool=name; break;
      case 'mirror': this.mirror=!this.mirror; break;
      case 'plus': case 'minus': this.board.zoomBy(name==='plus'?1.4:1/1.4); return;
      case 'fill': this.replace(new Uint32Array(CELLS).fill(this.color)); return;
      case 'off': this.replace(new Uint32Array(CELLS)); return;
      case 'original': this.replace(template()); return;
      case 'template': this.replace(template(this.el('template').value,this.color)); return;
      case 'undo': case 'redo':
        this.pixels=history[name](this.pixels); this.library.set(this.slot,this.pixels);
        this.status(this.library.lastSaved?'Cambio guardado.':'Cambio en memoria. Exporta una copia para conservarlo.'); this.redraw(); return;
      case 'save':
        this.status(this.library.save()?slotName(this.slot)+' guardado en este dispositivo.':'No se pudo guardar. Puedes exportar el JSON.'); return;
      case 'copy': {
        const row=this.dialog.querySelector('.ve-copy'),dest=this.el('dest');
        row.hidden=!row.hidden; this.act('copy').setAttribute('aria-expanded',String(!row.hidden));
        if (row.hidden) return;
        for (const option of dest.options) option.disabled=Number(option.value)===this.slot;
        dest.value=String(this.slot===BOTS?1:this.slot+1); dest.focus(); return;
      }
      case 'hide-copy': this.dialog.querySelector('.ve-copy').hidden=true; this.act('copy').setAttribute('aria-expanded','false'); return;
      case 'apply-copy': {
        const dest=Number(this.el('dest').value);
        if (dest===this.slot) return;
        const before=this.library.get(dest);
        if (!sameDesign(before,this.pixels)) { this.histories[dest].remember(before); this.library.set(dest,this.pixels); }
        this.action('hide-copy'); this.status('Diseño copiado a '+slotName(dest)+(this.library.lastSaved?'.':' en memoria. Exporta una copia.')); return;
      }
      case 'export': this.download(); return;
      case 'import': this.el('file').click(); return;
      case 'paste-art': {
        const dialog=this.el('art-dialog');
        if(dialog.open) return;
        this.el('art-target').textContent='Destino: '+slotName(this.slot)+'. Reemplaza únicamente este visor.';
        this.el('art-text').value=''; this.el('art-error').textContent='';
        dialog.showModal(); this.el('art-text').focus(); return;
      }
      case 'cancel-art': this.el('art-dialog').close(); return;
      case 'apply-art': {
        if(!this.el('art-dialog').open) return;
        let pixels;
        try { pixels=parsePixelArt(this.el('art-text').value); }
        catch(error) { this.el('art-error').textContent=error.message; return; }
        this.replace(pixels);
        this.el('art-dialog').close();
        this.status('176 colores cargados en '+slotName(this.slot)+(this.library.lastSaved?'. Guardado en este dispositivo.':'. Cambio en memoria. Exporta una copia.'));
        return;
      }
    }
    this.redraw(false);
  }
  download() {
    const url=URL.createObjectURL(new Blob([this.library.export()],{type:'application/json'}));
    const a=document.createElement('a'); a.href=url; a.download='KINETIK-visores.json';
    this.dialog.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  async loadFile(input) {
    const file=input.files?.[0]; input.value=''; if (!file) return;
    try {
      if (file.size>131072) throw new Error('El archivo de visores es demasiado grande.');
      const data=await file.text();
      const previous=Array.from({length:BOTS+1},(_,i)=>this.library.get(i));
      this.library.import(data);
      previous.forEach((design,id)=>{if(!sameDesign(design,this.library.get(id)))this.histories[id].remember(design);});
      this.select(this.slot); this.status(this.library.lastSaved?'Visores importados y guardados.':'Visores importados en memoria. Exporta una copia para conservarlos.');
    } catch (error) { this.status(error instanceof SyntaxError?'El archivo no contiene JSON válido.':error.message); }
  }
  redraw(designChanged=true) {
    if (!this.opened) return;
    this.dirtyDesign=this.dirtyDesign||designChanged;
    if (this.frame) return;
    this.frame=requestAnimationFrame(()=>{
      this.frame=0; if(!this.opened) return;
      this.board.draw(this.pixels);
      if(this.dirtyDesign){this.preview?.setDesign(this.pixels);this.dirtyDesign=false;}
      this.preview?.draw();
      const v=this.board.view; this.el('scale').textContent=Math.round(v.zoom*100)+'%';
      this.act('minus').disabled=v.zoom<=1.001; this.act('plus').disabled=v.zoom>=5.999;
      this.act('undo').disabled=!this.histories[this.slot].past.length; this.act('redo').disabled=!this.histories[this.slot].future.length;
      for (const name of ['pencil','erase','pan','mirror'])
        this.act(name).setAttribute('aria-pressed',String(name==='mirror'?this.mirror:name===this.tool));
      const color=colorCode(this.color);
      for (const ink of this.dialog.querySelectorAll('[data-ink]')) ink.setAttribute('aria-pressed',String(ink.dataset.ink===color));
      this.el('grid').style.cursor=this.tool==='pan'?'grab':'crosshair';
    });
  }
}
