import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Ventana emergente genérica.
 * Huecos: [modal-title], contenido por defecto y [modal-actions].
 */
@Component({
  selector: 'rd-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="backdrop" (click)="dismiss.emit()"></div>
    <section class="panel" role="dialog" aria-modal="true" [attr.aria-label]="label()">
      <header class="title"><ng-content select="[modal-title]" /></header>
      <div class="body"><ng-content /></div>
      <footer class="actions"><ng-content select="[modal-actions]" /></footer>
    </section>
  `,
  host: { '(document:keydown.escape)': 'dismiss.emit()', '[class.centered]': 'centered()' },
  styles: `
    :host {
      position: absolute;
      inset: 0;
      z-index: 20;
      display: grid;
      align-items: end;
      padding: 16px;
    }
    /* Ventana en medio de la pantalla (avisos que piden una decisión) */
    :host(.centered) {
      align-items: center;
    }
    :host(.centered) .panel {
      padding-bottom: 18px;
    }
    .backdrop {
      position: absolute;
      inset: 0;
      background: rgb(5 7 9 / 0.65);
      backdrop-filter: blur(3px);
      animation: fade 0.18s ease;
    }
    .panel {
      position: relative;
      display: grid;
      gap: 16px;
      max-height: 100%;
      padding: 18px 18px calc(18px + env(safe-area-inset-bottom, 0px));
      border-radius: 16px;
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      padding-top: 26px;
      animation: rise 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
      overflow: auto;
    }
    /* Franja de bordillo dentro de la esquina redondeada */
    .panel::before {
      content: '';
      position: absolute;
      inset: 0 0 auto;
      height: 6px;
      background: var(--rd-kerb-stripe);
    }
    .title {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 30px;
      line-height: 1;
      text-transform: uppercase;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .actions:empty {
      display: none;
    }
    @keyframes fade {
      from {
        opacity: 0;
      }
    }
    @keyframes rise {
      from {
        transform: translateY(30px);
        opacity: 0;
      }
    }
  `,
})
export class Modal {
  readonly label = input('');
  readonly centered = input(false);
  readonly dismiss = output<void>();
}
