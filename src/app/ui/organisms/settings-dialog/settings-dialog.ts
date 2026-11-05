import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { APP_VERSION } from '../../../core/domain/settings/app-version';
import { Language } from '../../../core/domain/settings/language';
import { VolumeChannel, Volumes } from '../../../core/domain/settings/volume';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { LanguageSwitch } from '../../molecules/language-switch/language-switch';
import { Modal } from '../../molecules/modal/modal';
import { VolumeSlider } from '../../molecules/volume-slider/volume-slider';

@Component({
  selector: 'rd-settings-dialog',
  imports: [Modal, LanguageSwitch, VolumeSlider, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-modal [label]="'settings.title' | t" (dismiss)="closed.emit()">
      <span modal-title>{{ 'settings.title' | t }}</span>
      <div class="field">
        <span class="label">{{ 'settings.sound' | t }}</span>
        <rd-volume-slider
          inputId="vol-music"
          [label]="'settings.music' | t"
          [value]="volumes().music"
          (changed)="setVolume('music', $event)"
          (released)="preview.emit('music')"
        />
        <rd-volume-slider
          inputId="vol-effects"
          [label]="'settings.effects' | t"
          [value]="volumes().effects"
          (changed)="setVolume('effects', $event)"
          (released)="preview.emit('effects')"
        />
      </div>
      <div class="field">
        <span class="label">{{ 'settings.language' | t }}</span>
        <rd-language-switch [value]="language()" (changed)="languageChange.emit($event)" />
      </div>
      <div class="field">
        <span class="label">{{ 'settings.help' | t }}</span>
        <button type="button" class="help" (click)="tutorial.emit()">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M10 9.5a2.2 2.2 0 1 1 3.2 2c-.8.4-1.2 1-1.2 1.8"></path>
            <path d="M12 16.5v.1"></path>
          </svg>
          <span class="help-text">
            <b>{{ 'settings.tutorial' | t }}</b>
            <small>{{ 'settings.tutorialHint' | t }}</small>
          </span>
        </button>
      </div>
      @if (debug()) {
        <div class="field debug">
          <span class="label">{{ 'settings.debug' | t }}</span>
          <small class="hint">{{ 'settings.debugHint' | t }}</small>
          <button rdButton type="button" class="full" (click)="allMaps.emit()">
            {{ 'settings.allMaps' | t }}
          </button>
          <button rdButton variant="ghost" type="button" class="full" (click)="debugOff.emit()">
            {{ 'settings.debugOff' | t }}
          </button>
        </div>
      }
      <!-- Tocarla 7 veces seguidas activa el modo debug -->
      <button type="button" class="version" (click)="versionTap.emit()">
        RapidDash · {{ 'settings.version' | t }} {{ version }}
      </button>
      <ng-container modal-actions>
        <button rdButton variant="secondary" type="button" class="full" (click)="closed.emit()">
          {{ 'settings.close' | t }}
        </button>
      </ng-container>
    </rd-modal>
  `,
  styles: `
    .field {
      display: grid;
      gap: 8px;
    }
    .label {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--rd-signal);
    }
    .help {
      display: flex;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 0 14px;
      border: 0;
      border-radius: var(--rd-radius);
      background: var(--rd-asphalt-3);
      box-shadow: inset 0 0 0 2px var(--rd-ghost);
      color: var(--rd-ghost);
      text-align: left;
      cursor: pointer;
    }
    .help-text {
      display: grid;
      gap: 2px;
      color: var(--rd-chalk);
    }
    .help-text b {
      font-family: var(--rd-font-display);
      font-style: var(--rd-display-style);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .help-text small {
      font-size: 13px;
      color: var(--rd-muted);
    }
    .full {
      grid-column: 1 / -1;
    }
    .debug {
      padding: 12px;
      border-radius: var(--rd-radius);
      box-shadow: inset 0 0 0 2px var(--rd-kerb);
    }
    .debug .label {
      color: var(--rd-kerb);
    }
    .hint {
      font-size: 13px;
      color: var(--rd-muted);
    }
    .version {
      justify-self: center;
      padding: 6px 10px;
      border: 0;
      background: none;
      font-size: 12px;
      color: var(--rd-muted);
      cursor: default;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
  `,
})
export class SettingsDialog {
  readonly language = input.required<Language>();
  readonly languageChange = output<Language>();
  readonly closed = output<void>();
  readonly tutorial = output<void>();
  readonly volumes = input.required<Volumes>();
  readonly volumesChange = output<Volumes>();
  /** Al soltar un slider: que suene un ejemplo de ese canal. */
  readonly preview = output<VolumeChannel>();
  /** Modo debug activado: se ve su sección. */
  readonly debug = input(false);
  readonly versionTap = output<void>();
  readonly debugOff = output<void>();
  readonly allMaps = output<void>();
  protected readonly version = APP_VERSION;

  protected setVolume(channel: VolumeChannel, value: number): void {
    this.volumesChange.emit({ ...this.volumes(), [channel]: value });
  }
}
