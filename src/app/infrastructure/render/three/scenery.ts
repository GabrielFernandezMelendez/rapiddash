import {
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  PlaneGeometry,
} from 'three';
import { TRACK_HALF_WIDTH } from '../../../core/domain/track/track-constants';
import { Track } from '../../../core/domain/track/track';
import { flat } from './track-mesh';
import { ScenePalette, seededRandom } from './themes';

const MAX_PROPS = 320;

/** Suelo, árboles y rocas instanciados alrededor de la pista. */
export function buildScenery(track: Track, palette: ScenePalette): Group {
  const group = new Group();
  const s = track.samples;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of s) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  const ground = new Mesh(
    new PlaneGeometry(maxX - minX + 400, maxZ - minZ + 400),
    flat(palette.ground),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((minX + maxX) / 2, -0.05, (minZ + maxZ) / 2);
  group.add(ground);

  // Posiciones aleatorias pero reproducibles, fuera de la pista y no demasiado lejos de ella
  const rand = seededRandom(palette.seed);
  const spots: { x: number; z: number; scale: number; spin: number; tree: boolean }[] = [];
  const margin = 40;
  for (let tries = 0; tries < MAX_PROPS * 12 && spots.length < MAX_PROPS; tries++) {
    const x = minX - margin + rand() * (maxX - minX + margin * 2);
    const z = minZ - margin + rand() * (maxZ - minZ + margin * 2);
    let best = Infinity;
    for (let i = 0; i < s.length; i += 4)
      best = Math.min(best, (s[i].x - x) ** 2 + (s[i].z - z) ** 2);
    const d = Math.sqrt(best);
    if (d > TRACK_HALF_WIDTH + 2.5 && d < TRACK_HALF_WIDTH + 36) {
      spots.push({
        x,
        z,
        scale: 0.7 + rand() * 0.8,
        spin: rand(),
        tree: rand() < palette.treeRatio,
      });
    }
  }

  const trees = spots.filter((p) => p.tree);
  const rocks = spots.filter((p) => !p.tree);
  const leaves = new InstancedMesh(new ConeGeometry(1.3, 3.2, 6), flat(palette.leaf), trees.length);
  const trunks = new InstancedMesh(
    new CylinderGeometry(0.22, 0.28, 1, 5),
    flat(palette.trunk),
    trees.length,
  );
  const stones = new InstancedMesh(
    new DodecahedronGeometry(0.9, 0),
    flat(palette.rock),
    rocks.length,
  );

  const m = new Object3D();
  trees.forEach((t, i) => {
    m.rotation.set(0, t.spin * 6, 0);
    m.scale.setScalar(t.scale);
    m.position.set(t.x, 0.5 * t.scale, t.z);
    m.updateMatrix();
    trunks.setMatrixAt(i, m.matrix);
    m.position.set(t.x, 2.6 * t.scale, t.z);
    m.updateMatrix();
    leaves.setMatrixAt(i, m.matrix);
  });
  rocks.forEach((r, i) => {
    m.rotation.set(r.spin, r.spin * 5, 0);
    m.scale.set(r.scale * 1.4, r.scale, r.scale * 1.4);
    m.position.set(r.x, 0.3 * r.scale, r.z);
    m.updateMatrix();
    stones.setMatrixAt(i, m.matrix);
  });
  group.add(leaves, trunks, stones);
  return group;
}
