import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { TournamentBoard } from '../../../core/application/use-cases/tournaments';
import {
  dayIndex,
  statusAt,
  Tournament,
  TOURNAMENT_DAYS,
} from '../../../core/domain/tournament/tournament';
import { ALL_MAPS, findMap } from '../../../core/domain/track/race-map';
import { TournamentService } from '../../../shared/account/tournament.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { DayCard, DayCards } from '../../molecules/day-cards/day-cards';
import { StandingsTable } from '../../molecules/standings-table/standings-table';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';
import { describeTournament } from './tournament-view';

/** Un torneo: sala de espera antes de empezar; días y clasificación después. */
@Component({
  selector: 'rd-tournament-page',
  imports: [MenuLayout, Button, Flag, DayCards, StandingsTable, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="back()">← {{ 'tournament.title' | t }}</button>
        @if (t(); as t) {
          <h1>{{ t.name }}</h1>
          <span class="sub">{{ subtitle() }}</span>
        }
      </div>

      @if (!t()) {
        <p class="note">{{ (missing() ? 'tournament.error.not-found' : 'daily.loading') | t }}</p>
      } @else if (status() === 'waiting') {
        <div class="code">
          <span class="code-label">{{ 'tournament.code' | t }}</span>
          <span class="code-value">{{ t()!.code }}</span>
          <div class="share">
            <button rdButton variant="secondary" type="button" (click)="copy()">
              {{ (copied() ? 'tournament.copied' : 'tournament.copy') | t }}
            </button>
            <button rdButton variant="secondary" type="button" (click)="share()">{{ 'tournament.share' | t }}</button>
          </div>
        </div>
        <div class="row-head">
          <h2>{{ 'tournament.drivers' | t }}</h2>
          <span class="sub">{{ t()!.members.length }} / 10</span>
        </div>
        <ul class="members">
          @for (m of t()!.members; track m.uid) {
            <li>
              <rd-flag [country]="m.country" />
              <span>{{ m.nickname }}{{ m.uid === myUid ? ' ' + ('leaderboard.you' | t) : '' }}</span>
              @if (m.uid === t()!.ownerUid) {
                <span class="tag">{{ 'tournament.owner' | t }}</span>
              }
            </li>
          }
        </ul>
        <p class="note">{{ 'tournament.rules' | t }}</p>
      } @else {
        <rd-day-cards [days]="dayCards()" />
        <h2>{{ 'tournament.standings' | t }}</h2>
        <rd-standings-table [rows]="board()?.rows ?? []" [myUid]="myUid" [today]="today()" />
        @if (status() === 'running') {
          <p class="note">{{ 'tournament.provisional' | t }}</p>
        }
      }
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }

      <div menu-footer>
        @if (status() === 'waiting') {
          @if (isOwner()) {
            <button rdButton type="button" [block]="true" class="go" [disabled]="busy() || t()!.members.length < 2" (click)="start()">
              {{ 'tournament.start' | t }}
            </button>
            @if (t()!.members.length < 2) {
              <p class="note center">{{ 'tournament.needTwo' | t }}</p>
            }
          } @else {
            <p class="note center">{{ waitingFor() }}</p>
          }
        } @else if (status() === 'running') {
          <button rdButton type="button" [block]="true" class="go" (click)="race()">
            {{ 'tournament.raceToday' | t }}
          </button>
        }
      </div>
    </rd-menu-layout>
  `,
  styleUrl: './tournaments.page.scss',
  styles: `
    .center {
      text-align: center;
      margin-top: 8px;
    }
  `,
})
export class TournamentPage implements OnInit {
  /** /tournaments/:code (withComponentInputBinding). */
  readonly code = input.required<string>();

  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly tournaments = inject(TournamentService);

  protected readonly myUid = this.tournaments.uid();
  protected readonly t = signal<Tournament | null>(null);
  protected readonly board = signal<TournamentBoard | null>(null);
  protected readonly missing = signal(false);
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly now = signal(Date.now());

  protected readonly status = computed(() => {
    const t = this.t();
    return t ? statusAt(t, this.now()) : null;
  });
  protected readonly today = computed(() => {
    const t = this.t();
    const day = t ? dayIndex(t, this.now()) : null;
    return day !== null && day < TOURNAMENT_DAYS ? day : null;
  });
  protected readonly isOwner = computed(() => this.t()?.ownerUid === this.myUid);
  protected readonly subtitle = computed(() => {
    const t = this.t();
    return t ? describeTournament(t, this.i18n, this.now()).detail : '';
  });
  protected readonly waitingFor = computed(() => {
    const t = this.t();
    const owner = t?.members.find((m) => m.uid === t.ownerUid)?.nickname ?? '';
    return this.i18n.t('tournament.waitingFor').replace('{owner}', owner);
  });
  protected readonly dayCards = computed<DayCard[]>(() => {
    const t = this.t();
    if (!t) return [];
    const today = dayIndex(t, this.now()) ?? 0;
    const winners = this.board()?.dayWinners ?? [];
    return Array.from({ length: TOURNAMENT_DAYS }, (_, day) => {
      const state = day < today ? 'done' : day === today ? 'today' : 'future';
      const winnerUid = winners[day];
      const winner = winnerUid ? t.members.find((m) => m.uid === winnerUid) ?? null : null;
      const label =
        state === 'today'
          ? this.i18n.t('tournament.today')
          : `${this.i18n.t('tournament.day')} ${day + 1}`;
      return {
        label,
        // El mapa de mañana no se desvela hasta que llegue su día
        mapKey: state === 'future' ? null : findMap(t.mapIds[day] ?? '')?.nameKey ?? null,
        state,
        winner,
      };
    });
  });

  constructor() {
    // La sala de espera se refresca sola: así se ve quién entra y cuándo empieza
    const timer = setInterval(() => {
      this.now.set(Date.now());
      if (this.status() === 'waiting') void this.load();
    }, 10_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected back(): void {
    void this.router.navigate(['/tournaments']);
  }

  protected async copy(): Promise<void> {
    const t = this.t();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(this.tournaments.inviteLink(t.code));
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set('tournament.error.copy');
    }
  }

  /** Compartir del móvil (WhatsApp, etc.); si no lo hay, copia el enlace. */
  protected async share(): Promise<void> {
    const t = this.t();
    if (!t) return;
    const url = this.tournaments.inviteLink(t.code);
    if (navigator.share) {
      await navigator
        .share({ title: t.name, text: this.i18n.t('tournament.shareText').replace('{name}', t.name), url })
        .catch(() => undefined);
    } else {
      await this.copy();
    }
  }

  protected async start(): Promise<void> {
    const t = this.t();
    if (!t) return;
    this.busy.set(true);
    try {
      await this.tournaments.start(t, ALL_MAPS.map((m) => m.id));
      await this.load();
    } catch (e) {
      console.error('[torneos]', e);
      this.error.set('auth.error.unknown');
    } finally {
      this.busy.set(false);
    }
  }

  protected race(): void {
    const t = this.t();
    const day = this.today();
    if (!t || day === null) return;
    void this.router.navigate(['/race', t.mapIds[day]], { queryParams: { t: t.code } });
  }

  private async load(): Promise<void> {
    try {
      const t = await this.tournaments.find(this.code());
      this.missing.set(!t);
      this.t.set(t);
      this.now.set(Date.now());
      if (t && statusAt(t, Date.now()) !== 'waiting') this.board.set(await this.tournaments.board(t));
    } catch {
      this.error.set('auth.error.network');
    }
  }
}
