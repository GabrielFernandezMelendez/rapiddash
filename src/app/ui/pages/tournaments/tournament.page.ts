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
    /* Medalla: roseta dorada de 16 puntas y botón de oro; late y rebota cada 2,3 s */
    .medal {
      position: relative;
      justify-self: start;
      display: grid;
      place-items: center;
      width: 76px;
      height: 76px;
      margin-left: -10px;
      filter: drop-shadow(0 3px 6px rgb(0 0 0 / 0.45));
      animation: medal 2.3s ease-in-out infinite;
    }
    .medal::before {
      content: '';
      position: absolute;
      inset: 0;
      clip-path: polygon(50.0% 0.0%, 57.8% 10.8%, 69.1% 3.8%, 72.2% 16.7%, 85.4% 14.6%, 83.3% 27.8%, 96.2% 30.9%, 89.2% 42.2%, 100.0% 50.0%, 89.2% 57.8%, 96.2% 69.1%, 83.3% 72.2%, 85.4% 85.4%, 72.2% 83.3%, 69.1% 96.2%, 57.8% 89.2%, 50.0% 100.0%, 42.2% 89.2%, 30.9% 96.2%, 27.8% 83.3%, 14.6% 85.4%, 16.7% 72.2%, 3.8% 69.1%, 10.8% 57.8%, 0.0% 50.0%, 10.8% 42.2%, 3.8% 30.9%, 16.7% 27.8%, 14.6% 14.6%, 27.8% 16.7%, 30.9% 3.8%, 42.2% 10.8%);
      background: radial-gradient(circle at 35% 30%, #fff3b8, #f3c13a 45%, #a87908);
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
    @keyframes medal {
      0%,
      62%,
      100% {
        transform: translateY(0) scale(1);
      }
      72% {
        transform: translateY(-7px) scale(1.14);
      }
      80% {
        transform: translateY(0) scale(0.94);
      }
      87% {
        transform: translateY(-2px) scale(1.05);
      }
      94% {
        transform: translateY(0) scale(0.99);
      }
    }
    /* Accesibilidad: quien pide menos movimiento ve la medalla quieta */
    @media (prefers-reduced-motion: reduce) {
      .medal {
        animation: none;
      }
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
