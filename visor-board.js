import {COLS, ROWS, colorCode} from './visor-designs.js';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function strokeLine(pixels, from, to, color, mirror, cols=COLS) {
  // Connect reported touch samples even when the browser coalesces fast movements.
  let {x, y} = from;
  const dx = Math.abs(to.x-x), dy = Math.abs(to.y-y);
  const sx = x < to.x ? 1 : -1, sy = y < to.y ? 1 : -1;
  let error = dx-dy;
  for (;;) {
    pixels[y*cols+x] = color;
    if (mirror) pixels[y*cols+cols-1-x] = color;
    if (x === to.x && y === to.y) break;
    const twice = 2*error;
    if (twice > -dy) { error -= dy; x += sx; }
    if (twice < dx) { error += dx; y += sy; }
  }
}

export class BoardViewport {
  constructor(cols=COLS,rows=ROWS) { this.cols=cols; this.rows=rows; this.zoom = 1; this.x = this.y = 0; this.resize(1,1); }
  resize(w,h) {
    this.w = Math.max(1,w); this.h = Math.max(1,h);
    this.base = Math.max(.01, Math.min((w-12)/this.cols,(h-12)/this.rows));
    this.limit();
  }
  get cell() { return this.base*this.zoom; }
  get left() { return (this.w-this.cols*this.cell)/2 + this.x; }
  get top() { return (this.h-this.rows*this.cell)/2 + this.y; }
  limit() {
    const ex = Math.max(0,(this.cols*this.cell-this.w+12)/2);
    const ey = Math.max(0,(this.rows*this.cell-this.h+12)/2);
    this.x = clamp(this.x,-ex,ex); this.y = clamp(this.y,-ey,ey);
  }
  frame(zoom, previous, next) {
    const gx = (previous.x-this.left)/this.cell, gy = (previous.y-this.top)/this.cell;
    this.zoom = clamp(zoom,1,6);
    this.x = next.x-this.w/2+(this.cols/2-gx)*this.cell;
    this.y = next.y-this.h/2+(this.rows/2-gy)*this.cell;
    this.limit();
  }
  hit(p) {
    const x = Math.floor((p.x-this.left)/this.cell), y = Math.floor((p.y-this.top)/this.cell);
    return x>=0 && x<this.cols && y>=0 && y<this.rows ? {x,y} : null;
  }
}

export class VisorBoard {
  constructor(canvas, editor, cols=COLS, rows=ROWS) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.editor = editor;
    this.view = new BoardViewport(cols,rows); this.touches = new Map(); this.mode = 'idle';
    canvas.onpointerdown = e => this.down(e);
    canvas.onpointermove = e => this.move(e);
    canvas.onpointerup = e => this.end(e);
    canvas.onpointercancel = e => this.end(e,true);
    canvas.onlostpointercapture = e => { if (this.touches.has(e.pointerId)) this.end(e,true); };
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.touches.size) return;
      const p = this.point(e);
      this.view.frame(this.view.zoom*Math.exp(-e.deltaY*.002),p,p);
      this.editor.redraw();
    }, {passive:false});
  }
  point(e) {
    const box = this.canvas.getBoundingClientRect();
    return {x:(e.clientX-box.left)*this.view.w/(box.width||1), y:(e.clientY-box.top)*this.view.h/(box.height||1)};
  }
  pair() {
    const [a,b] = this.touches.values();
    return {x:(a.x+b.x)/2, y:(a.y+b.y)/2, d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
  }
  cancel() {
    if ((this.mode==='paint'||this.mode==='fill') && this.before) this.editor.pixels.set(this.before);
    const ids = Array.from(this.touches.keys());
    this.mode = 'idle'; this.strokePoint = this.before = null; this.touches.clear();
    for (const id of ids) if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
  }
  down(e) {
    if (e.button!==0 || this.touches.size>=2) return;
    e.preventDefault();
    const p = this.point(e);
    this.canvas.setPointerCapture(e.pointerId); this.touches.set(e.pointerId,p);
    if (this.touches.size===2) {
      if (this.mode==='paint'||this.mode==='fill') this.editor.pixels.set(this.before);
      this.before=null; this.baseTouch=this.pair(); this.mode='pinch'; this.editor.redraw(); return;
    }
    if (this.editor.tool==='pan') { this.mode='pan'; return; }
    const cell=this.view.hit(p);
    if (!cell) { this.mode='wait'; return; }
    this.mode='paint'; this.before=this.editor.pixels.slice(); this.strokePoint=cell; this.firstCell=cell;
    if(this.editor.tool==='bucket'){
      this.mode='fill';this.editor.flood(cell);this.editor.redraw();return;
    }
    this.moved=false;
    this.ink=this.editor.tool==='erase'?0:this.editor.color;
    // A stationary tap toggles a matching LED. A stroke paints continuously.
    const current=this.before[cell.y*this.view.cols+cell.x];
    strokeLine(this.editor.pixels,cell,cell,current===this.ink?0:this.ink,this.editor.mirror,this.view.cols);
    this.editor.redraw();
  }
  move(e) {
    const previous=this.touches.get(e.pointerId);
    if (!previous) return;
    const next=this.point(e);
    this.touches.set(e.pointerId,next);
    if (this.mode==='pinch') {
      const now=this.pair();
      this.view.frame(this.view.zoom*now.d/this.baseTouch.d,this.baseTouch,now);
      this.baseTouch=now;
    } else if (this.mode==='pan') {
      this.view.frame(this.view.zoom,previous,next);
    } else if (this.mode==='paint') {
      const cell=this.view.hit(next);
      if (!cell) { this.strokePoint=null; return; }
      if (!this.moved && cell.x===this.firstCell.x && cell.y===this.firstCell.y) return;
      if (!this.moved) strokeLine(this.editor.pixels,this.firstCell,this.firstCell,this.ink,this.editor.mirror,this.view.cols);
      this.moved=true; strokeLine(this.editor.pixels,this.strokePoint||cell,cell,this.ink,this.editor.mirror,this.view.cols);
      this.strokePoint=cell;
    } else return;
    this.editor.redraw();
  }
  end(e,canceled=false) {
    if (!this.touches.has(e.pointerId)) return;
    if (this.mode==='paint'||this.mode==='fill') {
      if (canceled) this.editor.pixels.set(this.before);
      else { this.move(e); this.editor.commit(this.before); }
    }
    this.touches.delete(e.pointerId);
    this.before=null; this.strokePoint=null;
    this.mode=this.touches.size?'pan':'idle';
    if (this.canvas.hasPointerCapture(e.pointerId)) this.canvas.releasePointerCapture(e.pointerId);
    this.editor.redraw();
  }
  zoomBy(factor) {
    const v=this.view, center={x:v.w/2,y:v.h/2};
    v.frame(v.zoom*factor,center,center); this.editor.redraw();
  }
  draw(pixels) {
    const c=this.canvas, v=this.view, ctx=this.ctx;
    const w=c.clientWidth, h=c.clientHeight;
    if (!w || !h) return;
    const dpr=Math.min(2,globalThis.devicePixelRatio||1);
    if (c.width!==Math.round(w*dpr) || c.height!==Math.round(h*dpr)) {
      c.width=Math.round(w*dpr); c.height=Math.round(h*dpr);
    }
    v.resize(w,h);
    ctx.setTransform(c.width/w,0,0,c.height/h,0,0);
    ctx.clearRect(0,0,w,h);
    const size=v.cell, gap=Math.max(.65,Math.min(2.4,size*.085));
    for (let y=0;y<v.rows;y++) for (let x=0;x<v.cols;x++) {
      const value=pixels[y*v.cols+x];
      const left=v.left+x*size+gap/2, top=v.top+y*size+gap/2;
      const edge=Math.max(.2,size-gap);
      if (left>w || top>h || left+edge<0 || top+edge<0) continue;
      ctx.fillStyle=value?colorCode(value):'#334252';
      ctx.fillRect(left,top,edge,edge);
      if (edge>12) {
        ctx.fillStyle=value?'rgba(255,255,255,.24)':'rgba(184,204,220,.10)';
        ctx.fillRect(left,top,edge,Math.min(1.5,edge*.055));
      }
    }
  }
}
