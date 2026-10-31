import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

export type TournamentCardStatus = 'running' | 'waiting' | 'finished';

/** Lo que hay que deslizar a la izquierda para dejar ver la papelera (px). */
const REVEAL = 84;
/** A partir de cuánto deslizamiento se queda abierta al soltar. */
const OPEN_AT = REVEAL / 2;

/**
 * Un torneo en «Mis torneos»: nombre, estado y una línea de detalle. Si se puede eliminar,
 * deslizando a la izquierda aparece una papelera detrás, a la derecha (deslizar a la derecha o
 * tocar la tarjeta la vuelve a tapar). La papelera es un botón normal: también se llega con el teclado.
 */
@Component({
  selector: 'rd-tournament-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.removable]': 'removable()' },
  template: `
    @if (removable()) {
      <button
        type="button"
        class="trash"
        [attr.aria-label]="removeLabel()"
        [tabindex]="revealed() ? 0 : -1"
        (click)="remove.emit()"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"></path>
        </svg>
      </button>
    }
    <button
      type="button"
      class="card"
      [class]="status()"
      [class.dragging]="dragging()"
      [style.transform]="'translateX(' + offset() + 'px)'"
      (pointerdown)="down($event)"
      (pointermove)="move($event)"
      (pointerup)="up()"
      (pointercancel)="up()"
      (click)="tap($event)"
      (keydown.delete)="removable() && remove.emit()"
    >
      <span class="top">
        <span class="name">{{ name() }}</span>
        <span class="badge">{{ statusLabel() }}</span>
      </span>
      <span class="detail">{{ detail() }}</span>
      @if (extra()) {
        <span class="extra">{{ extra() }}</span>
      }
    </button>
  `,
  styles: `
    :host {
      position: relative;
      display: block;
      border-radius: 12px;
    }
    :host(.removable) {
      overflow: hidden;
      background: var(--rd-kerb);
    }
    .trash {
      position: absolute;
      inset: 0 0 0 auto;
      width: 84px;
      display: grid;
      place-items: center;
      border: 0;
      background: var(--rd-kerb);
      color: #fff;
      cursor: pointer;
    }
    .card {
      position: relative;
      transition: transform 0.2s ease;
      touch-action: pan-y;
    }
    .card.dragging {
      transition: none;
    }
    button.card {
      display: grid;
      gap: 6px;
      width: 100%;
      padding: 12px 14px;
      border: 0;
      border-radius: 12px;
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-chalk);
      text-align: left;
      cursor: pointer;
    }
    button.card.running {
      box-shadow: inset 0 0 0 2px var(--rd-go);
    }
    button.card.finished {
      opacity: 0.75;
    }
    .top {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 800;
      font-size: 22px;
      text-transform: uppercase;
    }
    .badge {
      margin-left: auto;
      flex: none;
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--rd-line);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .running .badge {
      background: var(--rd-go);
      color: var(--rd-asphalt);
    }
    .waiting .badge {
      background: var(--rd-ghost);
      color: var(--rd-asphalt);
    }
    .detail,
    .extra {
      font-size: 14px;
      color: var(--rd-muted);
    }
    .extra {
      color: var(--rd-chalk);
    }
  `,
})
export class TournamentCard {
  readonly name = input.required<string>();
  readonly status = input.required<TournamentCardStatus>();
  readonly statusLabel = input.required<string>();
  readonly detail = input('');
  readonly extra = input('');
  /** El creador puede eliminarlo: deslizar a la izquierda deja ver la papelera. */
  readonly removable = input(false);
  readonly removeLabel = input('');
  readonly open = output<void>();
  readonly remove = output<void>();

  protected readonly offset = signal(0);
  protected readonly revealed = signal(false);
  protected readonly dragging = signal(false);
  private start: { x: number; y: number; base: number } | null = null;
  /** Hubo arrastre: el clic que llega al soltar no abre el torneo. */
  private moved = false;

  protected down(e: PointerEvent): void {
    if (!this.removable()) return;
    this.start = { x: e.clientX, y: e.clientY, base: this.offset() };
    this.moved = false;
  }

  protected move(e: PointerEvent): void {
    const s = this.start;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // Gesto vertical: es scroll de la lista, no un deslizamiento
    if (!this.moved && Math.abs(dy) > Math.abs(dx)) {
      if (Math.abs(dy) > 8) this.start = null;
      return;
    }
    if (Math.abs(dx) < 8 && !this.moved) return;
    this.moved = true;
    this.dragging.set(true);
    this.offset.set(Math.min(0, Math.max(-REVEAL, s.base + dx)));
  }

  protected up(): void {
    if (!this.start) return;
    this.start = null;
    this.dragging.set(false);
    if (this.moved) this.setRevealed(this.offset() < -OPEN_AT);
  }

  protected tap(e: Event): void {
    if (this.moved) {
      this.moved = false;
      e.preventDefault();
      return;
    }
    // Con la papelera a la vista, tocar la tarjeta solo la tapa
    if (this.revealed()) this.setRevealed(false);
    else this.open.emit();
  }

  private setRevealed(open: boolean): void {
    this.revealed.set(open);
    this.offset.set(open ? -REVEAL : 0);
  }
}
