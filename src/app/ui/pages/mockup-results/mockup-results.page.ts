import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ResultsPanel } from '../../organisms/results-panel/results-panel';

/** MOCKUP: resultados con la medalla nueva junto al puesto mundial (sin correr la carrera). */
@Component({
  selector: 'rd-mockup-results-page',
  imports: [ResultsPanel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg"></div>
    <rd-results-panel
      [result]="result"
      [standing]="standing"
      passedLabel="Has adelantado a 3 pilotos"
      [medal]="medal"
    />
  `,
  styles: `
    .bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 50% 30%, #ffd319 0 12%, transparent 13%),
        linear-gradient(#3a0a5a, #0d0420 55%, #1a0838);
      filter: blur(2px);
    }
  `,
})
export class MockupResultsPage {
  protected readonly result = {
    time: 48.732,
    previousBest: 50.104,
    isRecord: true,
    lapTimes: [16.902, 15.871, 15.959],
  };
  protected readonly standing = {
    rank: 7,
    gained: 3,
    total: 42,
    next: {
      rank: 6,
      record: { mapId: 'canyon-ring', uid: 'x', nickname: 'NeonKid', country: 'AR', time: 48.401, physicsVersion: 1 },
    },
  } as never;
  protected readonly medal = {
    medal: 'gold' as const,
    fresh: true,
    targets: { platinum: 47.644, gold: 49.117, silver: 53.046, bronze: 57.958 },
    best: 48.732,
  };
}
