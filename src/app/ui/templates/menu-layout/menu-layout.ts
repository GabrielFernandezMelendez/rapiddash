import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Plantilla de las pantallas de menú: fondo de carretera en perspectiva y tres huecos.
 * [menu-header], contenido por defecto y [menu-footer].
 */
@Component({
  selector: 'rd-menu-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="road" aria-hidden="true"><div class="lanes"></div></div>
    <header><ng-content select="[menu-header]" /></header>
    <div class="content"><ng-content /></div>
    <footer><ng-content select="[menu-footer]" /></footer>
  `,
  styleUrl: './menu-layout.scss',
})
export class MenuLayout {}
