import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { normalizeCode, Tournament } from '../../../core/domain/tournament/tournament';
import { TournamentService } from '../../../shared/account/tournament.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { TextInput } from '../../atoms/text-input/text-input';
import { Field } from '../../molecules/field/field';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

/** Unirse con código, o al abrir un enlace de invitación (/t/K7RQ2M) con el código ya puesto. */
@Component({
  selector: 'rd-join-tournament-page',
  imports: [MenuLayout, Button, Flag, TextInput, Field, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="back()">← {{ 'tournament.title' | t }}</button>
        <h1>{{ 'tournament.joinTitle' | t }}</h1>
      </div>

      <rd-field [label]="'tournament.code' | t" for="t-code" [hint]="'tournament.codeHint' | t">
        <input
          rdInput
          id="t-code"
          class="code-input"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          maxlength="8"
          [value]="typed()"
          (input)="type($any($event.target).value)"
        />
      </rd-field>

      @if (found(); as t) {
        <div class="invite">
          <span class="invite-label">{{ 'tournament.invited' | t }}</span>
          <span class="invite-name">{{ t.name }}</span>
          <span class="sub">{{ inviteDetail(t) }}</span>
          <span class="flags">
            @for (m of t.members; track m.uid) {
              <rd-flag [country]="m.country" />
            }
          </span>
        </div>
      }
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }

      <div menu-footer>
        <button rdButton type="button" [block]="true" class="go" [disabled]="!found() || busy()" (click)="join()">
          {{ 'tournament.joinGo' | t }}
        </button>
      </div>
    </rd-menu-layout>
  `,
  styleUrl: './tournaments.page.scss',
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
export class JoinTournamentPage implements OnInit {
  /** /t/:code (withComponentInputBinding). */
  readonly code = input<string | undefined>();

  private readonly router = inject(Router);
  private readonly tournaments = inject(TournamentService);
  private readonly i18nKeys = { notFound: 'tournament.error.not-found' };

  protected readonly typed = signal('');
  protected readonly found = signal<Tournament | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  ngOnInit(): void {
    const code = this.code();
    if (code) this.type(code);
  }

  protected async type(value: string): Promise<void> {
    this.typed.set(value.toUpperCase());
    this.error.set(null);
    this.found.set(null);
    const code = normalizeCode(value);
    if (!code) return;
    try {
      const t = await this.tournaments.find(code);
      if (normalizeCode(this.typed()) !== code) return;
      if (!t) this.error.set(this.i18nKeys.notFound);
      this.found.set(t);
    } catch {
      this.error.set('auth.error.network');
    }
  }

  protected inviteDetail(t: Tournament): string {
    const owner = t.members.find((m) => m.uid === t.ownerUid)?.nickname ?? '';
    return `${owner} · ${t.members.length}/10`;
  }

  protected async join(): Promise<void> {
    const t = this.found();
    if (!t) return;
    this.busy.set(true);
    try {
      const result = await this.tournaments.join(t.code);
      if (result === 'joined' || result === 'already') {
        await this.router.navigate(['/tournaments', t.code], { replaceUrl: true });
      } else {
        this.error.set(`tournament.error.${result}`);
      }
    } catch (e) {
      console.error('[torneos]', e);
      this.error.set('auth.error.unknown');
    } finally {
      this.busy.set(false);
    }
  }

  protected back(): void {
    void this.router.navigate(['/tournaments']);
  }
}
