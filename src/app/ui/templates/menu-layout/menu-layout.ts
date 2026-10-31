import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Plantilla de las pantallas de menú: fondo de carretera en perspectiva y tres huecos.
 * [menu-header], contenido por defecto y [menu-footer]. [menu-backdrop] (opcional) cubre el
 * fondo, por ejemplo con la escena 3D de las estéticas synthwave.
 */
@Component({
  selector: 'rd-menu-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="road" aria-hidden="true"><div class="lanes"></div></div>
    <ng-content select="[menu-backdrop]" />
    <header><ng-content select="[menu-header]" /></header>
    <div class="content" [class.start]="align() === 'start'"><ng-content /></div>
    <footer><ng-content select="[menu-footer]" /></footer>
  `,
  styleUrl: './menu-layout.scss',
})
export class MenuLayout {
  /** Contenido centrado en su hueco (por defecto) o pegado arriba, bajo la cabecera. */
  readonly align = input<'center' | 'start'>('center');
}
