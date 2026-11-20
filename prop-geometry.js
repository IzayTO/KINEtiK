import * as T from './three.module.min.js';

// Eight-sided sections along Z. Stations give depth, width, height and vertical offset.
export function paneledBody(stations) {
  const outline = [[-.67,-1],[.67,-1],[1,-.6],[1,.6],[.67,1],[-.67,1],[-1,.6],[-1,-.6]];
  const rings = stations.map(([z,w,h,y=0]) => outline.map(([x,v]) => [x*w/2, y+v*h/2, z]));
  const vertices = [];
  const tri = (a,b,c) => vertices.push(...a,...b,...c);
  for (let j=1; j<rings.length; j++) {
    const front=rings[j-1], back=rings[j];
    for (let i=0; i<8; i++) {
      const n=(i+1)%8;
      tri(front[i],front[n],back[n]);
      tri(front[i],back[n],back[i]);
    }
  }
  const first=rings[0], last=rings[rings.length-1];
  for (let i=1; i<7; i++) {
    tri(first[0],first[i+1],first[i]);
    tri(last[0],last[i],last[i+1]);
  }
  const geometry=new T.BufferGeometry();
  geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  geometry.computeVertexNormals();
  return geometry;
}

// Assemble static art once using vertex colours, including pieces with different finishes.
export class PropParts {
  constructor() {
    this.positions=[]; this.colors=[];
    this.color=new T.Color();
    this.transform=new T.Object3D();
    this.point=new T.Vector3();
  }
  add(geometry, color, at=[0,0,0], rotation=[0,0,0], scale=[1,1,1]) {
    const tr=this.transform;
    tr.position.set(...at); tr.rotation.set(...rotation); tr.scale.set(...scale); tr.updateMatrix();
    const attr=geometry.getAttribute('position'), index=geometry.index;
    this.color.setHex(color);
    for (let i=0, n=index ? index.count : attr.count; i<n; i++) {
      const p=this.point.fromBufferAttribute(attr,index ? index.getX(i) : i).applyMatrix4(tr.matrix);
      this.positions.push(p.x,p.y,p.z);
      this.colors.push(this.color.r,this.color.g,this.color.b);
    }
    geometry.dispose();
  }
  facet(vertices,color) {
    this.color.setHex(color);
    for (const v of vertices) {
      this.positions.push(...v);
      this.colors.push(this.color.r,this.color.g,this.color.b);
    }
  }
  box(color,at,size,rotation) {
    this.add(new T.BoxGeometry(...size),color,at,rotation);
  }
  soft(color,at,radii,rotation) {
    this.add(new T.SphereGeometry(1,8,5),color,at,rotation,radii);
  }
  finish() {
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(this.positions,3));
    geometry.setAttribute('color',new T.Float32BufferAttribute(this.colors,3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }
}
