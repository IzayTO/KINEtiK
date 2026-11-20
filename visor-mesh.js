import * as T from './three.module.min.js';
import {COLS, ROWS, BOTS} from './visor-designs.js';

// Both the soldier rig and the inspection stand build the same head, facing -Z.
export function helmetParts(add) {
  add('armor', [.31,.33,.29], [0,.04,0], 0x354d49);
  add('box', [.33,.118,.026], [0,.055,-.151], 0x263c39);
  add('screen', [.26,.26*ROWS/COLS,.009], [0,.055,-.166], 0x18292d);
  for (const side of [-1,1]) add('armor', [.04,.12,.09], [side*.162,.04,0], 0xe97b31);
}

export class VisorAtlas {
  constructor(library) {
    this.count = library ? BOTS + 1 : 1;
    this.data = new Uint8Array(COLS * ROWS * this.count * 4);
    this.texture = new T.DataTexture(this.data, COLS, ROWS * this.count, T.RGBAFormat);
    this.texture.magFilter = this.texture.minFilter = T.NearestFilter;
    this.texture.colorSpace = T.SRGBColorSpace;
    this.texture.generateMipmaps = false;
    if (library) {
      for (let slot = 0; slot < this.count; slot++) this.write(slot, library.get(slot));
      this.unsubscribe = library.subscribe((slot, pixels) => this.write(slot, pixels));
    }
  }
  write(slot, pixels) {
    let at = slot * COLS * ROWS * 4;
    for (const value of pixels) {
      const rgb = value ? value - 1 : 0x17232c;
      this.data[at++] = rgb >> 16;
      this.data[at++] = (rgb >> 8) & 255;
      this.data[at++] = rgb & 255;
      this.data[at++] = value ? 255 : 0;
    }
    this.texture.needsUpdate = true;
  }
  dispose() { this.unsubscribe?.(); this.texture.dispose(); }
}

// All box instances still share a draw call. Only the outward visor face samples the atlas.
export function visorMaterial(atlas, instanced) {
  const material = new T.MeshLambertMaterial({color: 0xffffff, flatShading: true});
  material.onBeforeCompile = shader => {
    shader.uniforms.ledAtlas = {value: atlas.texture};
    shader.uniforms.ledSlots = {value: atlas.count};
    const varyings = 'varying vec2 ledUV; varying float ledRow;';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + varyings + (instanced ? '\nattribute float visorSlot;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nledUV=vec2(uv.x,1.-uv.y); ledRow=normal.z < -.9 ? ' + (instanced ? 'visorSlot' : '0.') + ' : -1.;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + varyings + '\nuniform sampler2D ledAtlas; uniform float ledSlots;')
      .replace('#include <opaque_fragment>', [
        'if (ledRow >= 0.) {',
        '  vec2 dims = vec2(22.,8.);',
        '  vec2 cell = clamp(ledUV,vec2(0.),vec2(.99999))*dims;',
        '  vec2 address = (floor(cell)+vec2(.5, .5+8.*ledRow))/vec2(22.,8.*ledSlots);',
        '  vec4 led = texture2D(ledAtlas,address);',
        '  vec2 margin = .5-abs(fract(cell)-.5);',
        '  vec2 footprint = max(fwidth(cell),vec2(.0001));',
        '  vec2 grid = smoothstep(vec2(.055)-footprint*.45,vec2(.055)+footprint*.45,margin);',
        '  float mask = mix(grid.x*grid.y, .86, smoothstep(.3,1.,max(footprint.x,footprint.y)));',
        '  outgoingLight = mix(vec3(.004,.008,.012),led.rgb*mix(.76,1.,led.a),mask);',
        '}',
        '#include <opaque_fragment>'
      ].join('\n'));
  };
  material.customProgramCacheKey = () => instanced ? 'kinetik-visor-instances-v1' : 'kinetik-visor-preview-v1';
  return material;
}

export function armorGeometry(){const p=[],ring=[[-.32,-.5],[.32,-.5],[.5,-.32],[.5,.32],[.32,.5],[-.32,.5],[-.5,.32],[-.5,-.32]];const tri=(a,b,c)=>p.push(...a,...b,...c);for(let i=0;i<8;i++){const j=(i+1)%8,a=[ring[i][0]*.86,.5,ring[i][1]*.86],b=[ring[j][0]*.86,.5,ring[j][1]*.86],c=[ring[i][0],-.5,ring[i][1]],d=[ring[j][0],-.5,ring[j][1]];tri(a,c,b);tri(b,c,d);tri([0,.5,0],a,b);tri([0,-.5,0],d,c);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;}
