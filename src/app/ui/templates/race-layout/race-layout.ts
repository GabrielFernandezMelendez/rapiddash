import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Plantilla de carrera: el lienzo 3D ocupa todo y encima se apilan las capas de interfaz.
 * Huecos: [race-scene] y contenido por defecto (HUD, semáforo, resultados).
 */
@Component({
  selector: 'rd-race-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="scene"><ng-content select="[race-scene]" /></div>
    <ng-content />
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background: #000;
      touch-action: none;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    }
    .scene {
      position: absolute;
      inset: 0;
    }
  `,
})
export class RaceLayout {}
