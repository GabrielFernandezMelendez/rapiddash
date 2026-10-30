import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CountryCode } from '../../../core/domain/profile/country';
import { checkNickname, NICKNAME_MAX } from '../../../core/domain/profile/nickname';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { TextInput } from '../../atoms/text-input/text-input';
import { CountryPicker } from '../../molecules/country-picker/country-picker';
import { Field, FieldTone } from '../../molecules/field/field';

export type NicknameAvailability = 'idle' | 'checking' | 'free' | 'taken';

export interface PilotData {
  readonly nickname: string;
  readonly country: CountryCode | null;
}

/** «Tu piloto»: apodo único y país con bandera. */
@Component({
  selector: 'rd-pilot-form',
  imports: [Button, TextInput, Field, CountryPicker, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="title">{{ 'pilot.title' | t }}</h1>
    <form class="fields" (submit)="submit($event)" novalidate>
      <rd-field [label]="'pilot.nickname' | t" for="nickname" [hint]="hint() | t" [tone]="tone()">
        <input
          rdInput
          id="nickname"
          autocomplete="nickname"
          autocapitalize="off"
          spellcheck="false"
          [attr.maxlength]="maxLength + 4"
          [invalid]="tone() === 'error'"
          [value]="nickname()"
          (input)="type($event)"
        />
      </rd-field>
      <rd-field [label]="'pilot.country' | t" for="country" [hint]="countryHint() | t">
        <rd-country-picker
          selectId="country"
          [value]="country()"
          [language]="language()"
          (changed)="pickCountry($event)"
        />
      </rd-field>
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }
      <div class="actions">
        <button rdButton type="submit" class="go" [block]="true" [disabled]="!valid() || busy()">
          {{ submitLabel() | t }}
        </button>
      </div>
    </form>
  `,
  styleUrl: '../account-screen.scss',
  styles: `
    .go {
      min-height: 58px;
      font-size: 23px;
    }
  `,
})
export class PilotForm {
  readonly initialNickname = input('');
  readonly initialCountry = input<CountryCode | null>(null);
  /** El país se ha sacado del móvil: se explica debajo hasta que el jugador lo cambie. */
  readonly detected = input(false);
  readonly availability = input<NicknameAvailability>('idle');
  readonly language = input('es');
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly submitLabel = input('pilot.submit');
  readonly nicknameChange = output<string>();
  readonly submitted = output<PilotData>();

  protected readonly maxLength = NICKNAME_MAX;
  protected readonly nickname = signal('');
  protected readonly country = signal<CountryCode | null>(null);
  private readonly countryTouched = signal(false);

  private readonly check = computed(() => checkNickname(this.nickname()));

  constructor() {
    // Valores iniciales (perfil existente o país detectado)
    effect(() => {
      const nickname = this.initialNickname();
      const country = this.initialCountry();
      untracked(() => {
        this.nickname.set(nickname);
        this.country.set(country);
      });
    });
  }

  protected readonly hint = computed(() => {
    if (!this.nickname()) return 'pilot.hint';
    const check = this.check();
    if (!check.ok) return `pilot.${check.problem}`;
    switch (this.availability()) {
      case 'checking':
        return 'pilot.checking';
      case 'free':
        return 'pilot.free';
      case 'taken':
        return 'pilot.taken';
      default:
        return 'pilot.hint';
    }
  });

  protected readonly tone = computed<FieldTone>(() => {
    if (!this.nickname()) return 'neutral';
    if (!this.check().ok || this.availability() === 'taken') return 'error';
    return this.availability() === 'free' ? 'ok' : 'neutral';
  });

  protected readonly countryHint = computed(() =>
    this.detected() && !this.countryTouched() && this.country() ? 'pilot.detected' : '',
  );

  protected readonly valid = computed(
    () => this.check().ok && this.availability() !== 'taken' && this.availability() !== 'checking',
  );

  protected type(event: Event): void {
    this.nickname.set((event.target as HTMLInputElement).value);
    this.nicknameChange.emit(this.nickname());
  }

  protected pickCountry(country: CountryCode | null): void {
    this.countryTouched.set(true);
    this.country.set(country);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.valid() && !this.busy()) {
      this.submitted.emit({ nickname: this.nickname(), country: this.country() });
    }
  }
}
