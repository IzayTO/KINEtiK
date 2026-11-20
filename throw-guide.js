import * as T from './three.module.min.js';

// The hand and the level are drawn with different cameras. Join the visible
// shoulder of the held prop to the predicted flight in the world camera's view.
const RELEASE_POINTS = {
  grenade: new T.Vector3(-.045, .126, -.012),
  molotov: new T.Vector3(-.020, .232, -.008),
  gas: new T.Vector3(-.036, .143, -.008)
};
const CAPACITY = 96;

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
    this.hand = new T.Vector3();
    this.end = new T.Vector3();
    this.viewPoint = new T.Vector3();
    this.previousPoint = new T.Vector2();
    this.nextPoint = new T.Vector2();
  }

  update(points, kind, item, worldCamera, handCamera, width, height) {
    this.geometry.setDrawRange(0, 0);
    if (points.length < 2 || width <= 0 || height <= 0) return;
    item.updateWorldMatrix(true, false);
    handCamera.updateWorldMatrix(true, false);
    const hand = this.hand.copy(RELEASE_POINTS[kind]).applyMatrix4(item.matrixWorld).project(handCamera);
    const first = points[0], last = points[points.length - 1];
    const end = this.end.copy(last).applyMatrix4(worldCamera.matrixWorldInverse);
    const near = -worldCamera.near * 1.01;

    // An overhead throw can land behind the camera. Follow the last visible leg
    // to the near plane instead of projecting a point behind the viewer.
    if (end.z >= near) {
      let i = points.length - 2;
      while (i >= 0 && this.viewPoint.copy(points[i]).applyMatrix4(worldCamera.matrixWorldInverse).z >= near) i--;
      if (i < 0) return;
      end.copy(points[i + 1]).applyMatrix4(worldCamera.matrixWorldInverse);
      end.lerp(this.viewPoint, (near - end.z) / (this.viewPoint.z - end.z));
    }
    end.applyMatrix4(worldCamera.projectionMatrix);
    // Preserve the direction to offscreen impacts, even close to the near plane.
    const scale = Math.max(1, Math.abs(end.x) / 3, Math.abs(end.y) / 3);
    end.x /= scale; end.y /= scale;
    const range = Math.hypot(last.x - first.x, last.z - first.z);
    let bow = 0;
    if (range > .001) {
      for (const point of points) {
        const t = Math.hypot(point.x - first.x, point.z - first.z) / range;
        bow = Math.max(bow, point.y - first.y - (last.y - first.y) * t);
      }
    }
    // Physical samples set the altitude of this screen-space arc. Spreading the
    // hand-camera offset over the entire flight prevents a vertical seam at the apex.
    const span = Math.abs(end.x - hand.x) * width / 2;
    const liftPixels = Math.min(height * .43, (span * .38 + height * .76 * bow / Math.max(5, range))
      * Math.min(1, range / 8) * Math.min(1, bow / .6));
    const lift = 2 * liftPixels / height;
    this.segments = 0;
    this.pixelDistance = 0;
    this.material.uniforms.pixelScale.value = T.MathUtils.clamp(Math.min(width, height) / 420, .95, 1.5);
    this.previousPoint.set(hand.x, hand.y);
    const steps = Math.max(12, Math.min(CAPACITY, Math.ceil((span + liftPixels*2 + Math.abs(end.y-hand.y)*height*.5) / 8)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const lateral = t * (1.65 - .65*t);
      this.nextPoint.set(hand.x + (end.x-hand.x)*lateral, hand.y + (end.y-hand.y)*t + 4*t*(1-t)*lift);
      this.writeSegment(this.previousPoint, this.nextPoint, width, height);
      this.previousPoint.copy(this.nextPoint);
    }
    this.geometry.setDrawRange(0, this.segments * 6);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
  }

  writeSegment(a, b, width, height) {
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
