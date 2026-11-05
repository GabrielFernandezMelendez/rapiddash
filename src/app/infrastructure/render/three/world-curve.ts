import { Camera, Line, Material, Mesh, Object3D, Points, Vector2 } from 'three';
import { WorldCurve } from '../../../core/domain/track/terrain';

/**
 * Mundo curvado alrededor de la cámara (solo visual): se dobla cada vértice en el shader, así
 * que la física y las posiciones de la escena siguen siendo las del llano.
 * - planeta: el suelo cae como una esfera; el horizonte se curva hacia abajo.
 * - tubo: lo que queda a los lados sube por las paredes y por encima, enrollado alrededor de la
 *   dirección en la que mira la cámara.
 */
export class WorldBend {
  private readonly uniforms = {
    rdCurveMode: { value: 0 },
    rdCurveR: { value: 1 },
    rdCurveFwd: { value: new Vector2(0, -1) },
  };
  private readonly patched = new WeakSet<Material>();

  constructor(curve: WorldCurve) {
    this.uniforms.rdCurveMode.value = curve.kind === 'planet' ? 1 : 2;
    this.uniforms.rdCurveR.value = curve.radius;
  }

  /** Dobla todo lo que cuelga de `root` menos lo marcado con `userData.terrain = 'skip'` (el cielo). */
  apply(root: Object3D): void {
    const visit = (o: Object3D) => {
      if (o.userData['terrain'] === 'skip') return;
      if (o instanceof Mesh || o instanceof Line || o instanceof Points) {
        // Lo doblado ya no está donde dice su caja: sin recortar por la vista
        o.frustumCulled = false;
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) this.patch(m);
      }
      for (const child of o.children) visit(child);
    };
    visit(root);
  }

  /** Rumbo de la cámara (el tubo se enrolla alrededor de él). */
  update(camera: Camera): void {
    const e = camera.matrixWorld.elements;
    // La cámara mira hacia su -z local
    const fx = -e[8];
    const fz = -e[10];
    const len = Math.hypot(fx, fz);
    if (len > 1e-6) this.uniforms.rdCurveFwd.value.set(fx / len, fz / len);
  }

  private patch(material: Material): void {
    if (this.patched.has(material)) return;
    this.patched.add(material);
    const previous = material.onBeforeCompile;
    const previousKey = material.customProgramCacheKey;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      if (!shader.vertexShader.includes('#include <project_vertex>')) return;
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${CURVE_GLSL}`)
        .replace('#include <project_vertex>', `#include <project_vertex>\n${PROJECT_GLSL}`);
    };
    material.customProgramCacheKey = () => `${previousKey.call(material)}|rd-curve`;
    material.needsUpdate = true;
  }
}

const CURVE_GLSL = /* glsl */ `
uniform float rdCurveMode;
uniform float rdCurveR;
uniform vec2 rdCurveFwd;
vec3 rdCurve(vec3 p) {
  vec2 d = p.xz - cameraPosition.xz;
  if (rdCurveMode < 1.5) {
    // Planeta: centro a R bajo el suelo, justo debajo de la cámara
    float r = length(d);
    vec2 dir = r > 1e-4 ? d / r : vec2(0.0);
    float a = r / rdCurveR;
    float h = rdCurveR + p.y;
    vec2 xz = cameraPosition.xz + dir * (h * sin(a));
    return vec3(xz.x, h * cos(a) - rdCurveR, xz.y);
  }
  // Tubo: eje a R sobre el suelo, en la dirección de la cámara
  vec2 right = vec2(-rdCurveFwd.y, rdCurveFwd.x);
  float f = dot(d, rdCurveFwd);
  float u = dot(d, right);
  // Hasta 160° a cada lado: más allá se daría la vuelta y se montaría sobre el otro lado
  float a = clamp(u / rdCurveR, -2.8, 2.8);
  float h = rdCurveR - p.y;
  vec2 xz = cameraPosition.xz + rdCurveFwd * f + right * (h * sin(a));
  return vec3(xz.x, rdCurveR - h * cos(a), xz.y);
}
`;

const PROJECT_GLSL = /* glsl */ `
{
  vec4 rdW = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    rdW = batchingMatrix * rdW;
  #endif
  #ifdef USE_INSTANCING
    rdW = instanceMatrix * rdW;
  #endif
  rdW = modelMatrix * rdW;
  rdW.xyz = rdCurve(rdW.xyz);
  mvPosition = viewMatrix * rdW;
  gl_Position = projectionMatrix * mvPosition;
}
`;
