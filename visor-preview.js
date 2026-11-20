import * as T from './three.module.min.js';
import {armorGeometry, helmetParts, VisorAtlas, visorMaterial} from './visor-mesh.js';

export class HelmetPreview {
  constructor(canvas, changed) {
    this.canvas=canvas;
    this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
    this.renderer.setClearColor(0x000000,0);
    this.renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));
    this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(32,1,.01,5);
    this.camera.position.set(0,.045,-1);
    this.camera.lookAt(0,.04,0);
    this.head=new T.Group();
    this.head.rotation.order='YXZ'; this.head.rotation.set(.035,-.25,0);
    this.scene.add(this.head);
    this.atlas=new VisorAtlas();
    const armor=armorGeometry(), box=new T.BoxGeometry(), face=visorMaterial(this.atlas,false);
    const materials=new Map();
    helmetParts((type, size, pos, color)=>{
      if (!materials.has(color)) materials.set(color,new T.MeshLambertMaterial({color,flatShading:true,side:T.DoubleSide}));
      const mesh=new T.Mesh(type==='armor'?armor:box,type==='screen'?face:materials.get(color));
      mesh.scale.set(...size); mesh.position.set(...pos); this.head.add(mesh);
    });
    this.scene.add(new T.HemisphereLight(0xe4f0ff,0x8c9ca7,1.25));
    const key=new T.DirectionalLight(0xffebd9,2.2); key.position.set(-2,3,-3); this.scene.add(key);
    const rim=new T.DirectionalLight(0x86bcb5,1.25); rim.position.set(2,1,1); this.scene.add(rim);
    let pointer=null, x=0, y=0;
    canvas.onpointerdown=e=>{
      if (e.button!==0 || pointer!==null) return;
      pointer=e.pointerId; x=e.clientX; y=e.clientY; canvas.setPointerCapture(pointer);
    };
    canvas.onpointermove=e=>{
      if (e.pointerId!==pointer) return;
      this.head.rotation.y-=(e.clientX-x)*.012;
      this.head.rotation.x=T.MathUtils.clamp(this.head.rotation.x-(e.clientY-y)*.009,-1.3,1.3);
      x=e.clientX; y=e.clientY; changed();
    };
    const release=e=>{if(pointer===e.pointerId)pointer=null;};
    canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=release;
    canvas.addEventListener('webglcontextrestored',()=>{ this.atlas.texture.needsUpdate=true; changed(); });
  }
  setDesign(pixels) { this.atlas.write(0,pixels); }
  draw() {
    const w=this.canvas.clientWidth, h=this.canvas.clientHeight;
    if (!w || !h) return;
    if(w!==this.width || h!==this.height){
      this.width=w; this.height=h; this.renderer.setSize(w,h,false);
      this.camera.aspect=w/h;
      this.camera.position.z=-Math.max(.79,.84/this.camera.aspect);
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene,this.camera);
  }
}
