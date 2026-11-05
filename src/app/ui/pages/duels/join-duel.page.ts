import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Duel, duelJoinProblem } from '../../../core/domain/duel/duel';
import { findMap } from '../../../core/domain/track/race-map';
import { normalizeCode } from '../../../core/domain/tournament/tournament';
import { DuelService } from '../../../shared/account/duel.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { TextInput } from '../../atoms/text-input/text-input';
import { Field } from '../../molecules/field/field';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

/** Unirse con código, o al abrir un enlace de reto (/d/K7RQ2M) con el código ya puesto. */
@Component({
  selector: 'rd-join-duel-page',
  imports: [MenuLayout, Button, Flag, TextInput, Field, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="back()">← {{ 'duel.short' | t }}</button>
        <h1>{{ 'duel.joinTitle' | t }}</h1>
      </div>

      <rd-field [label]="'tournament.code' | t" for="d-code" [hint]="'duel.codeHint' | t">
        <input
          rdInput
          id="d-code"
          class="code-input"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          maxlength="8"
          [value]="typed()"
          (input)="type($any($event.target).value)"
        />
      </rd-field>

      @if (found(); as d) {
        <div class="invite">
          <span class="invite-label">{{ 'duel.invited' | t }}</span>
          <span class="invite-name">
            <rd-flag [country]="d.members[0].country" />
            {{ d.members[0].nickname }}
          </span>
          <span class="sub">{{ mapName() }}</span>
        </div>
      }
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }

      <div menu-footer>
        <button rdButton type="button" [block]="true" class="go" [disabled]="!canJoin() || busy()" (click)="join()">
          {{ 'duel.joinGo' | t }}
        </button>
      </div>
    </rd-menu-layout>
  `,
  styleUrl: '../tournaments/tournaments.page.scss',
  styles: `
    .code-input {
      font-family: var(--rd-font-display);
      font-weight: 800;
      font-size: 30px;
      letter-spacing: 0.3em;
      text-align: center;
      text-transform: uppercase;
    }
  `,
})
export class JoinDuelPage implements OnInit {
  /** /d/:code (withComponentInputBinding). */
  readonly code = input<string | undefined>();

  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly duels = inject(DuelService);

  protected readonly typed = signal('');
  protected readonly found = signal<Duel | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly canJoin = computed(() => this.found() !== null && this.error() === null);
  protected readonly mapName = computed(() => {
    const map = findMap(this.found()?.mapId ?? '');
    return map ? this.i18n.t(map.nameKey) : '';
  });

  ngOnInit(): void {
    const code = this.code();
    if (code) void this.type(code);
  }

  protected async type(value: string): Promise<void> {
    this.typed.set(value.toUpperCase());
    this.error.set(null);
    this.found.set(null);
    const code = normalizeCode(value);
    if (!code) return;
    try {
      const duel = await this.duels.find(code);
      if (normalizeCode(this.typed()) !== code) return;
      if (!duel) {
        this.error.set('duel.error.not-found');
        return;
      }
      const problem = duelJoinProblem(duel, this.duels.uid() ?? '');
      // Ya estoy dentro (mi propio código o un enlace que abro otra vez): directo al duelo
      if (problem === 'already') {
        await this.router.navigate(['/duels', duel.code], { replaceUrl: true });
        return;
      }
      if (problem) this.error.set(`duel.error.${problem}`);
      this.found.set(duel);
    } catch {
      this.error.set('auth.error.network');
    }
  }

  protected async join(): Promise<void> {
    const duel = this.found();
    if (!duel) return;
    this.busy.set(true);
    try {
      const result = await this.duels.join(duel.code);
      if (result === 'joined' || result === 'already') {
        await this.router.navigate(['/duels', duel.code], { replaceUrl: true });
      } else {
        this.error.set(`duel.error.${result}`);
      }
    } catch (e) {
      console.error('[1 vs 1]', e);
      this.error.set('auth.error.network');
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    void this.router.navigate(['/duels']);
  }
}
