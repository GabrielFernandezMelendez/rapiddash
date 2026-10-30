import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { isGuest, Profile } from '../../../core/domain/profile/profile';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Flag } from '../../atoms/flag/flag';

/** Bandera y apodo del piloto; «Invitado» si juega sin cuenta. Al tocarlo abre el perfil. */
@Component({
  selector: 'rd-pilot-chip',
  imports: [Flag, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="open.emit()">
      <rd-flag [country]="profile().country" />
      <span class="name">{{ profile().nickname }}</span>
      @if (guest()) {
        <span class="badge">{{ 'chip.guest' | t }}</span>
      }
    </button>
  `,
  styles: `
    button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      max-width: 100%;
      padding: 0 12px 0 10px;
      border: 0;
      border-radius: 999px;
      background: rgb(10 12 15 / 0.55);
      box-shadow: inset 0 0 0 1px var(--rd-line);
      color: var(--rd-chalk);
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.04em;
      cursor: pointer;
    }
    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .badge {
      flex: none;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--rd-muted);
      color: var(--rd-asphalt);
      font-family: var(--rd-font-body);
      font-style: normal;
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
  `,
})
export class PilotChip {
  readonly profile = input.required<Profile>();
  readonly open = output<void>();
  protected readonly guest = computed(() => isGuest(this.profile().kind));
}
