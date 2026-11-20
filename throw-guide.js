import * as T from './three.module.min.js';
import {TRAJECTORY_POINTS} from './ordnance.js';

// The hand and the level are drawn with different cameras. Join the visible
// shoulder of the held prop to the predicted flight in the world camera's view.
const RELEASE_POINTS = {
  grenade: new T.Vector3(-.045, .126, -.012),
  molotov: new T.Vector3(-.020, .232, -.008),
  gas: new T.Vector3(-.036, .143, -.008)
};
const JOIN_LENGTH = 6;
const CAPACITY = TRAJECTORY_POINTS + 40;

function makeRibbon() {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(CAPACITY * 12), 3).setUsage(T.DynamicDrawUsage));
  geometry.setAttribute('uv', new T.BufferAttribute(new Float32Array(CAPACITY * 8), 2).setUsage(T.DynamicDrawUsage));
  const indices = new Uint16Array(CAPACITY * 6);
  for (let i = 0; i < CAPACITY; i++) {
    const v = i * 4;
    indices.set([v, v+1, v+2, v+2, v+1, v+3], i * 6);
  }
  geometry.setIndex(new T.BufferAttribute(indices, 1));
  geometry.setDrawRange(0, 0);
  return geometry;
}

function makeInk() {
  return new T.ShaderMaterial({
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: {pixelScale: {value: 1}},
    vertexShader: `
      varying vec2 stroke;
      void main() {
        stroke = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      varying vec2 stroke;
      uniform float pixelScale;
      void main() {
        float along = abs(mod(stroke.x / pixelScale + 6.5, 13.0) - 6.5);
        float radius = length(vec2(max(along - 3.0, 0.0), stroke.y * 2.25));
        float alpha = 1.0 - smoothstep(1.65, 2.25, radius);
        float core = 1.0 - smoothstep(.82, 1.45, radius);
        gl_FragColor = vec4(mix(vec3(.055,.14,.18), vec3(.82,.98,.94), core), alpha * .96);
      }`
  });
}

export class ThrowGuide extends T.Mesh {
  constructor() {
    super(makeRibbon(), makeInk());
    this.visible = false;
    this.frustumCulled = false;
    this.renderOrder = 1000;
    this.offset = new T.Vector3();
    this.previousPoint = new T.Vector3();
    this.nextPoint = new T.Vector3();
    this.clipA = new T.Vector3();
    this.clipB = new T.Vector3();
  }

  update(points, kind, item, worldCamera, handCamera, width, height) {
    this.geometry.setDrawRange(0, 0);
    if (points.length < 2 || width <= 0 || height <= 0) return;
    item.updateWorldMatrix(true, false);
    handCamera.updateWorldMatrix(true, false);
    const anchor = this.offset.copy(RELEASE_POINTS[kind]).applyMatrix4(item.matrixWorld).applyMatrix4(handCamera.matrixWorldInverse);
    const depth = Math.max(worldCamera.near * 2, -anchor.z);
    anchor.applyMatrix4(handCamera.projectionMatrix);
    const projection = worldCamera.projectionMatrix.elements;
    anchor.set((anchor.x + projection[8]) * depth / projection[0],
               (anchor.y + projection[9]) * depth / projection[5], -depth);
    this.previousPoint.copy(anchor);
    this.offset.sub(this.nextPoint.copy(points[0]).applyMatrix4(worldCamera.matrixWorldInverse));

    let joinLength = 0;
    for (let i = 1; i < points.length && joinLength < JOIN_LENGTH; i++) {
      joinLength += this.nextPoint.copy(points[i]).distanceTo(points[i-1]);
    }
    joinLength = Math.max(.00001, Math.min(joinLength, JOIN_LENGTH));

    this.segments = 0;
    this.pixelDistance = 0;
    this.material.uniforms.pixelScale.value = T.MathUtils.clamp(Math.min(width, height) / 420, .95, 1.5);
    let travelled = 0;
    for (let i = 1; i < points.length; i++) {
      const from = points[i-1], to = points[i];
      const length = this.nextPoint.copy(to).distanceTo(from);
      // Extra samples here only affect presentation. There is no extra collision query.
      const steps = travelled < 3 ? Math.min(6, Math.max(1, Math.ceil(length / .16))) : 1;
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        const u = Math.min(1, (travelled + length * t) / joinLength);
        const weight = i === points.length-1 && step === steps ? 0 : (1-u)*(1-u)*(1+2*u);
        this.nextPoint.lerpVectors(from, to, t).applyMatrix4(worldCamera.matrixWorldInverse).addScaledVector(this.offset, weight);
        this.writeSegment(this.previousPoint, this.nextPoint, worldCamera, width, height);
        this.previousPoint.copy(this.nextPoint);
      }
      travelled += length;
    }
    this.geometry.setDrawRange(0, this.segments * 6);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
  }

  writeSegment(from, to, camera, width, height) {
    const near = -camera.near;
    if (from.z >= near && to.z >= near) return;
    const a = this.clipA.copy(from), b = this.clipB.copy(to);
    if (a.z > near) a.lerp(to, (near - from.z) / (to.z - from.z));
    if (b.z > near) b.lerp(from, (near - to.z) / (from.z - to.z));
    a.applyMatrix4(camera.projectionMatrix);
    b.applyMatrix4(camera.projectionMatrix);
    const dx = (b.x-a.x)*width*.5, dy = (b.y-a.y)*height*.5, length = Math.hypot(dx,dy);
    if (length < .015 || this.segments >= CAPACITY) return;
    const halfWidth = 2.25 * this.material.uniforms.pixelScale.value;
    const nx = -dy/length*halfWidth*2/width, ny = dx/length*halfWidth*2/height;
    const vertex = this.segments++ * 4;
    const {position, uv} = this.geometry.attributes;
    position.setXYZ(vertex, a.x+nx, a.y+ny, 0);
    position.setXYZ(vertex+1, a.x-nx, a.y-ny, 0);
    position.setXYZ(vertex+2, b.x+nx, b.y+ny, 0);
    position.setXYZ(vertex+3, b.x-nx, b.y-ny, 0);
    uv.setXY(vertex, this.pixelDistance, 1);
    uv.setXY(vertex+1, this.pixelDistance, -1);
    this.pixelDistance += length;
    uv.setXY(vertex+2, this.pixelDistance, 1);
    uv.setXY(vertex+3, this.pixelDistance, -1);
  }
}
