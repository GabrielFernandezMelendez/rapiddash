import { CloudRecord } from './cloud-record';
import {
  defaultRival,
  ghostLabelOpacity,
  nearRows,
  placesGained,
  RankedRecord,
  RankingView,
  rivalOptions,
} from './ranking';

const ranked = (rank: number, uid: string, time = 50 + rank): RankedRecord => ({
  rank,
  record: { mapId: 'bay', uid, nickname: uid, country: 'ES', time, physicsVersion: 3 } as CloudRecord,
});
const top10 = Array.from({ length: 10 }, (_, i) => ranked(i + 1, `p${i + 1}`));

describe('Ranking y rival', () => {
  it('con puesto fuera del top: el rival por defecto es el de justo encima', () => {
    const view: RankingView = { top: top10, me: ranked(23, 'me'), above: ranked(22, 'nico'), total: 148 };
    const options = rivalOptions(view, 'me', true);
    expect(options.top?.record.uid).toBe('p1');
    expect(options.above?.record.uid).toBe('nico');
    expect(defaultRival(options, null)).toBe('above');
    expect(nearRows(view).map((r) => r.rank)).toEqual([22, 23]);
  });

  it('sin tiempo: el de arriba es el 10.º', () => {
    const view: RankingView = { top: top10, me: null, above: null, total: 10 };
    const options = rivalOptions(view, 'me', false);
    expect(options.above?.rank).toBe(10);
    expect(defaultRival(options, null)).toBe('above');
    expect(nearRows(view)).toEqual([]);
  });

  it('si soy el 1.º, contra mi mejor vuelta', () => {
    const view: RankingView = { top: [ranked(1, 'me'), ...top10.slice(1)], me: ranked(1, 'me'), above: null, total: 10 };
    const options = rivalOptions(view, 'me', true);
    expect(options.top).toBeNull();
    expect(options.above).toBeNull();
    expect(defaultRival(options, null)).toBe('mine');
  });

  it('recuerda la última elección si sigue disponible', () => {
    const view: RankingView = { top: top10, me: ranked(5, 'me'), above: top10[3], total: 10 };
    const options = rivalOptions(view, 'me', true);
    expect(defaultRival(options, 'top')).toBe('top');
    expect(defaultRival({ ...options, top: null }, 'top')).toBe('above');
    expect(nearRows(view)).toEqual([]);
  });

  it('mapa sin tiempos y sin récord propio: contra el reloj', () => {
    const view: RankingView = { top: [], me: null, above: null, total: 0 };
    expect(defaultRival(rivalOptions(view, 'me', false), null)).toBeNull();
  });

  it('puestos que se suben', () => {
    expect(placesGained(23, 19)).toBe(4);
    expect(placesGained(null, 19)).toBeNull();
    expect(placesGained(5, 5)).toBe(0);
  });

  it('la etiqueta del fantasma se desvanece a los 3 s', () => {
    expect(ghostLabelOpacity(0)).toBe(1);
    expect(ghostLabelOpacity(2.5)).toBe(1);
    expect(ghostLabelOpacity(2.75)).toBeCloseTo(0.5);
    expect(ghostLabelOpacity(3.2)).toBe(0);
  });
});
