import {
  BufferGeometry,
  InstancedMesh,
  Line,
  Matrix4,
  Mesh,
  Object3D,
  PlaneGeometry,
  Sprite,
  Vector3,
} from 'three';
import { Terrain } from '../../../core/domain/track/terrain';

/** Separación máxima entre vértices de los planos grandes (suelo, rejilla) para que se vean las lomas. */
const PLANE_STEP = 6;
const MAX_SEGMENTS = 180;
/** A partir de este tamaño (o si es plano, como una pintura en el asfalto) se deforma vértice a vértice. */
const BIG = 14;
const FLAT = 0.3;

/**
 * Pone el mundo estático sobre el relieve: lo grande o plano (carretera, muros, suelo, rejilla,
 * marcas pintadas) se deforma vértice a vértice; lo pequeño y de pie (árboles, postes, carteles)
 * se sube entero a la altura del suelo, sin torcerse. `userData.terrain = 'skip'` deja fuera un
 * grupo (el cielo), `'rigid'` lo sube entero (los carteles grandes con la foto) y `'ground'`
 * marca el plano del suelo.
 */
export function applyTerrain(root: Object3D, terrain: Terrain): void {
  root.updateMatrixWorld(true);
  const todo: Object3D[] = [];
  const collect = (o: Object3D) => {
    if (o.userData['terrain'] === 'skip') return;
    if (
      o.userData['terrain'] === 'rigid' ||
      o instanceof Mesh ||
      o instanceof Line ||
      o instanceof Sprite
    ) {
      todo.push(o);
      if (o.userData['terrain'] === 'rigid') return;
    }
    for (const child of o.children) collect(child);
  };
  collect(root);
  for (const o of todo) place(o, terrain);
}

function place(o: Object3D, terrain: Terrain): void {
  const world = new Vector3();
  if (o.userData['terrain'] === 'rigid' || o instanceof Sprite) {
    o.getWorldPosition(world);
    o.position.y += terrain.height(world.x, world.z);
    return;
  }
  if (o instanceof InstancedMesh) {
    const m = new Matrix4();
    const p = new Vector3();
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, m);
      p.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);
      m.elements[13] += terrain.height(p.x, p.z);
      o.setMatrixAt(i, m);
    }
    o.instanceMatrix.needsUpdate = true;
    o.computeBoundingSphere();
    return;
  }
  const mesh = o as Mesh | Line;
  const geometry = mesh.geometry as BufferGeometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
  const sizeXZ = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const flat = box.max.y - box.min.y < FLAT;
  if (sizeXZ < BIG && !flat) {
    // De pie y pequeño: entero, a la altura del suelo en su centro
    mesh.position.y += terrain.height((box.min.x + box.max.x) / 2, (box.min.z + box.max.z) / 2);
    return;
  }
  // El suelo va un poco hundido junto a la carretera (para que no asome entre sus vértices)
  const groundPlane = mesh.userData['terrain'] === 'ground';
  const heightAt = groundPlane ? terrain.ground.bind(terrain) : terrain.height.bind(terrain);
  mesh.geometry = displaced(tessellated(geometry), mesh.matrixWorld, heightAt);
}

/** Los planos grandes tienen muy pocos vértices: se rehacen con más para que sigan el relieve. */
function tessellated(geometry: BufferGeometry): BufferGeometry {
  if (!(geometry instanceof PlaneGeometry)) return geometry.clone();
  const { width, height, widthSegments, heightSegments } = geometry.parameters;
  const ws = Math.min(MAX_SEGMENTS, Math.max(widthSegments, Math.ceil(width / PLANE_STEP)));
  const hs = Math.min(MAX_SEGMENTS, Math.max(heightSegments, Math.ceil(height / PLANE_STEP)));
  return ws === widthSegments && hs === heightSegments
    ? geometry.clone()
    : new PlaneGeometry(width, height, ws, hs);
}

function displaced(
  geometry: BufferGeometry,
  matrixWorld: Matrix4,
  heightAt: (x: number, z: number) => number,
): BufferGeometry {
  const inverse = matrixWorld.clone().invert();
  const pos = geometry.attributes['position'];
  const v = new Vector3();
  // La rejilla y el suelo comparten muchos puntos: se recuerdan las alturas ya calculadas
  const cache = new Map<string, number>();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).applyMatrix4(matrixWorld);
    const key = `${Math.round(v.x * 10)},${Math.round(v.z * 10)}`;
    let h = cache.get(key);
    if (h === undefined) {
      h = heightAt(v.x, v.z);
      cache.set(key, h);
    }
    v.y += h;
    v.applyMatrix4(inverse);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
