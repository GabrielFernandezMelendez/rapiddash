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
  TOURNAMENT_MAX_MEMBERS,
} from '../../../core/domain/tournament/tournament';
import { CIRCUIT_MAPS, findMap } from '../../../core/domain/track/race-map';
import { TournamentService } from '../../../shared/account/tournament.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { DayCard, DayCards } from '../../molecules/day-cards/day-cards';
import { StandingsTable } from '../../molecules/standings-table/standings-table';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';
import { describeTournament } from './tournament-view';
import { leaderOf, shouldOfferPhoto } from '../../../core/domain/tournament/leader-photo';
import { LeaderPhoto } from '../../organisms/leader-photo/leader-photo';

/** Un torneo: sala de espera antes de empezar; días y clasificación después. */
@Component({
  selector: 'rd-tournament-page',
  imports: [MenuLayout, Button, Flag, DayCards, StandingsTable, LeaderPhoto, TranslatePipe],
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
          <span class="sub">{{ t()!.members.length }} / {{ maxMembers }}</span>
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
          <!-- Se puede seguir entrando con el enlace mientras dure el torneo -->
          @if (t()!.members.length < maxMembers) {
            <div class="code invite-more">
              <span class="code-label">{{ 'tournament.inviteMore' | t }}</span>
              <span class="code-value">{{ t()!.code }}</span>
              <div class="share">
                <button rdButton variant="secondary" type="button" (click)="copy()">
                  {{ (copied() ? 'tournament.copied' : 'tournament.copy') | t }}
                </button>
                <button rdButton variant="secondary" type="button" (click)="share()">{{ 'tournament.share' | t }}</button>
              </div>
            </div>
          }
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
          <div class="race-row">
            @if (isLeader()) {
              <!-- Solo el líder: cambiar (o quitar) su foto del cartel. Parece una medalla. -->
              <span class="medal">
              <button
                rdButton
                variant="secondary"
                type="button"
                class="camera"
                [attr.aria-label]="'photo.button' | t"
                [title]="'photo.button' | t"
                (click)="photoOpen.set(true)"
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z"></path><circle cx="12" cy="13" r="3.5"></circle>
                </svg>
              </button>
              </span>
            }
            <button rdButton type="button" [block]="true" class="go" (click)="race()">
              {{ 'tournament.raceToday' | t }}
            </button>
          </div>
        }
      </div>
    </rd-menu-layout>

    @if (photoOpen()) {
      <rd-leader-photo
        [current]="myPhoto()"
        [busy]="photoBusy()"
        [error]="photoError()"
        (save)="savePhoto($event)"
        (remove)="removePhoto()"
        (declined)="declinePhoto()"
        (closed)="closePhoto()"
      />
    }
  `,
  styleUrl: './tournaments.page.scss',
  styles: `
    /* Botón de la cámara justo encima del de correr, a la izquierda */
    .race-row {
      display: grid;
      gap: 10px;
    }
    /* Medalla: roseta dorada y botón de oro; late suavemente cada 5,5 s */
    .medal {
      position: relative;
      justify-self: start;
      display: grid;
      place-items: center;
      width: 88px;
      height: 88px;
      margin-left: -16px;
      margin-block: -6px;
      filter: drop-shadow(0 3px 6px rgb(0 0 0 / 0.45));
      animation: medal 5.5s ease-in-out infinite;
    }
    /* Roseta de cinta plisada (22 pliegues con luz y sombra) que gira despacio en el sentido de las agujas del reloj */
    .medal::before {
      content: '';
      position: absolute;
      inset: 0;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3CradialGradient id='l' cx='50' cy='50' r='50' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='.62' stop-color='%23ffe680'/%3E%3Cstop offset='1' stop-color='%23f0bc35'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='50' cy='50' r='50' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='.62' stop-color='%23d9a21c'/%3E%3Cstop offset='1' stop-color='%23b5850f'/%3E%3C/radialGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='45' fill='%23c9931a'/%3E%3Cpath d='M50.00 50.00L50.00 6.00Q52.80 1.08 57.12 0.51Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L57.12 0.51Q61.10 2.27 62.40 7.78Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L62.40 7.78Q66.47 3.85 70.77 4.52Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L70.77 4.52Q74.09 7.33 73.79 12.98Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L73.79 12.98Q78.80 10.36 82.74 12.21Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L82.74 12.21Q85.14 15.85 83.25 21.19Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L83.25 21.19Q88.80 20.08 92.06 22.97Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L92.06 22.97Q93.34 27.13 90.02 31.72Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L90.02 31.72Q95.66 32.22 97.97 35.91Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L97.97 35.91Q98.02 40.27 93.55 43.74Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L93.55 43.74Q98.82 45.81 100.00 50.00Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L100.00 50.00Q98.82 54.19 93.55 56.26Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L93.55 56.26Q98.02 59.73 97.97 64.09Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L97.97 64.09Q95.66 67.78 90.02 68.28Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L90.02 68.28Q93.34 72.87 92.06 77.03Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L92.06 77.03Q88.80 79.92 83.25 78.81Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L83.25 78.81Q85.14 84.15 82.74 87.79Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L82.74 87.79Q78.80 89.64 73.79 87.02Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L73.79 87.02Q74.09 92.67 70.77 95.48Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L70.77 95.48Q66.47 96.15 62.40 92.22Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L62.40 92.22Q61.10 97.73 57.12 99.49Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L57.12 99.49Q52.80 98.92 50.00 94.00Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L50.00 94.00Q47.20 98.92 42.88 99.49Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L42.88 99.49Q38.90 97.73 37.60 92.22Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L37.60 92.22Q33.53 96.15 29.23 95.48Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L29.23 95.48Q25.91 92.67 26.21 87.02Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L26.21 87.02Q21.20 89.64 17.26 87.79Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L17.26 87.79Q14.86 84.15 16.75 78.81Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L16.75 78.81Q11.20 79.92 7.94 77.03Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L7.94 77.03Q6.66 72.87 9.98 68.28Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L9.98 68.28Q4.34 67.78 2.03 64.09Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L2.03 64.09Q1.98 59.73 6.45 56.26Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L6.45 56.26Q1.18 54.19 0.00 50.00Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L0.00 50.00Q1.18 45.81 6.45 43.74Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L6.45 43.74Q1.98 40.27 2.03 35.91Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L2.03 35.91Q4.34 32.22 9.98 31.72Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L9.98 31.72Q6.66 27.13 7.94 22.97Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L7.94 22.97Q11.20 20.08 16.75 21.19Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L16.75 21.19Q14.86 15.85 17.26 12.21Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L17.26 12.21Q21.20 10.36 26.21 12.98Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L26.21 12.98Q25.91 7.33 29.23 4.52Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L29.23 4.52Q33.53 3.85 37.60 7.78Z' fill='url%28%23d%29'/%3E%3Cpath d='M50.00 50.00L37.60 7.78Q38.90 2.27 42.88 0.51Z' fill='url%28%23l%29'/%3E%3Cpath d='M50.00 50.00L42.88 0.51Q47.20 1.08 50.00 6.00Z' fill='url%28%23d%29'/%3E%3C/svg%3E") center / contain no-repeat;
      animation: medal-spin 18s linear infinite;
    }
    .camera {
      position: relative;
      width: 56px;
      min-height: 56px;
      padding: 0;
      border-radius: 50%;
      display: grid;
      place-items: center;
    }
    /* Todo el botón de oro, igual en todas las estéticas */
    .medal > .camera.camera {
      background: radial-gradient(circle at 35% 30%, #fff6c4, #f3c13a 48%, #c99412);
      color: #3a2900;
      box-shadow:
        inset 0 0 0 2px rgb(255 255 255 / 0.4),
        0 0 0 2px #a87908;
    }
    /* Un latido suave cada 5,5 s: crece un poco, baja y se asienta (sin cansar la vista) */
    @keyframes medal {
      0%,
      76%,
      100% {
        transform: translateY(0) scale(1);
      }
      85% {
        transform: translateY(-4px) scale(1.08);
      }
      93% {
        transform: translateY(0) scale(0.98);
      }
    }
    @keyframes medal-spin {
      to {
        transform: rotate(360deg);
      }
    }
    /* Accesibilidad: quien pide menos movimiento ve la medalla quieta */
    @media (prefers-reduced-motion: reduce) {
      .medal,
      .medal::before {
        animation: none;
      }
    }
    .invite-more .code-value {
      font-size: 30px;
    }
    .invite-more .code-label {
      text-transform: none;
      letter-spacing: 0;
    }
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
  protected readonly maxMembers = TOURNAMENT_MAX_MEMBERS;
  protected readonly t = signal<Tournament | null>(null);
  protected readonly board = signal<TournamentBoard | null>(null);
  protected readonly missing = signal(false);
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly now = signal(Date.now());
  /** Foto del cartel del líder. */
  protected readonly myPhoto = signal<string | null>(null);
  protected readonly photoOpen = signal(false);
  protected readonly photoBusy = signal(false);
  protected readonly photoError = signal<string | null>(null);
  private photoChecked = false;

  protected readonly status = computed(() => {
    const t = this.t();
    return t ? statusAt(t, this.now()) : null;
  });
  protected readonly today = computed(() => {
    const t = this.t();
    const day = t ? dayIndex(t, this.now()) : null;
    return day !== null && day < TOURNAMENT_DAYS ? day : null;
  });
  /** Voy 1.º en un torneo en curso. */
  protected readonly isLeader = computed(
    () => this.status() === 'running' && leaderOf(this.board()?.rows ?? [])?.member.uid === this.myUid,
  );
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
      // Los tres días de un torneo salen de los circuitos por vueltas
      await this.tournaments.start(
        t,
        CIRCUIT_MAPS.map((m) => m.id),
      );
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

  /** Al ir 1.º sin foto se ofrece una vez por torneo (y siempre desde el botón de la cámara). */
  private async offerPhoto(): Promise<void> {
    const t = this.t();
    if (!t || !this.myUid || !this.isLeader() || this.photoChecked) return;
    this.photoChecked = true;
    this.myPhoto.set(await this.tournaments.photoOf(t.code, this.myUid));
    if (shouldOfferPhoto(true, !!this.myPhoto(), this.tournaments.photoDeclined(t.code))) {
      this.photoOpen.set(true);
    }
  }

  protected async savePhoto(dataUrl: string): Promise<void> {
    const t = this.t();
    if (!t) return;
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      await this.tournaments.savePhoto(t.code, dataUrl);
      this.myPhoto.set(dataUrl);
      this.photoOpen.set(false);
    } catch (e) {
      console.error('[foto]', e);
      this.photoError.set('photo.error.save');
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected async removePhoto(): Promise<void> {
    const t = this.t();
    if (!t) return;
    this.photoBusy.set(true);
    this.photoError.set(null);
    try {
      await this.tournaments.removePhoto(t.code);
      this.myPhoto.set(null);
      this.photoOpen.set(false);
    } catch (e) {
      console.error('[foto]', e);
      this.photoError.set('photo.error.save');
    } finally {
      this.photoBusy.set(false);
    }
  }

  protected declinePhoto(): void {
    const t = this.t();
    if (t) this.tournaments.declinePhoto(t.code);
  }

  protected closePhoto(): void {
    this.photoOpen.set(false);
    this.photoError.set(null);
  }

  private async load(): Promise<void> {
    try {
      const t = await this.tournaments.find(this.code());
      this.missing.set(!t);
      this.t.set(t);
      this.now.set(Date.now());
      if (t && statusAt(t, Date.now()) !== 'waiting') this.board.set(await this.tournaments.board(t));
      await this.offerPhoto();
    } catch {
      this.error.set('auth.error.network');
    }
  }
}
