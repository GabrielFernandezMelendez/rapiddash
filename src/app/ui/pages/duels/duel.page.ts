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
import {
  attemptsLeft,
  canRaceDuel,
  Duel,
  DUEL_ATTEMPTS,
  duelRemaining,
  duelStatus,
  isDuelMember,
} from '../../../core/domain/duel/duel';
import { CloudRecord } from '../../../core/domain/race/cloud-record';
import { findMap } from '../../../core/domain/track/race-map';
import { DuelService } from '../../../shared/account/duel.service';
import { formatTime, NO_TIME } from '../../../shared/format-time';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { Flag } from '../../atoms/flag/flag';
import { ConfirmDialog } from '../../organisms/confirm-dialog/confirm-dialog';
import { formatClock } from '../../organisms/more-attempts/more-attempts';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

/** Cada cuánto se mira si ha entrado el rival o ha mejorado su tiempo (ms). */
const REFRESH_MS = 6000;

/** Un duelo: sala con el código mientras se espera; tiempos e intentos después. */
@Component({
  selector: 'rd-duel-page',
  imports: [MenuLayout, Button, Flag, ConfirmDialog, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="back()">← {{ 'duel.short' | t }}</button>
        @if (duel()) {
          <h1>{{ mapName() }}</h1>
          @if (status() === 'running') {
            <span class="sub">{{ leftLabel() }}</span>
          }
        }
      </div>

      @if (!duel()) {
        <p class="note">{{ (missing() ? 'duel.error.not-found' : 'daily.loading') | t }}</p>
      } @else if (status() === 'waiting') {
        <div class="code">
          <span class="code-label">{{ 'tournament.code' | t }}</span>
          <span class="code-value">{{ duel()!.code }}</span>
          <div class="share">
            <button rdButton variant="secondary" type="button" (click)="copy()">
              {{ (copied() ? 'tournament.copied' : 'tournament.copy') | t }}
            </button>
            <button rdButton variant="secondary" type="button" (click)="share()">{{ 'tournament.share' | t }}</button>
          </div>
        </div>
        <p class="waiting"><i aria-hidden="true"></i> {{ 'duel.waiting' | t }}</p>
        <p class="note">{{ 'duel.waitingNote' | t }}</p>
      } @else {
        @for (p of rows(); track p.uid) {
          <div class="player" [class.lead]="p.lead">
            <div class="player-top">
              <span class="who">
                <rd-flag [country]="p.country" />
                {{ p.nickname }}{{ p.uid === myUid ? ' ' + ('leaderboard.you' | t) : '' }}
              </span>
              <span class="time">{{ p.time }}</span>
            </div>
            <div class="pips" [attr.aria-label]="p.attemptsLabel">
              @for (used of p.pips; track $index) {
                <i [class.on]="used"></i>
              }
              <span aria-hidden="true">{{ p.attemptsLabel }}</span>
            </div>
          </div>
        }
        <p class="note">{{ 'duel.note' | t }}</p>
      }
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }

      <div menu-footer>
        @if (status() === 'waiting' && isOwner()) {
          <button rdButton variant="ghost" type="button" [block]="true" (click)="cancelling.set(true)">
            {{ 'duel.cancel' | t }}
          </button>
        } @else if (status() === 'running') {
          @if (canRace()) {
            <button rdButton type="button" [block]="true" class="go" (click)="race()">{{ raceLabel() }}</button>
          } @else if (isMember()) {
            <p class="note center">{{ 'duel.noAttempts' | t }}</p>
          }
        }
      </div>
    </rd-menu-layout>

    @if (cancelling()) {
      <rd-confirm-dialog
        [title]="'duel.cancelTitle' | t"
        [text]="'duel.cancelText' | t"
        [confirmLabel]="'duel.cancelGo' | t"
        [busy]="busy()"
        [error]="cancelError()"
        (confirm)="cancel()"
        (cancel)="cancelling.set(false)"
      />
    }
  `,
  styleUrl: '../tournaments/tournaments.page.scss',
  styles: `
    .center {
      text-align: center;
    }
    .waiting {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      color: var(--rd-neon-cyan);
    }
    .waiting i {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--rd-neon-cyan);
      box-shadow: 0 0 10px var(--rd-neon-cyan);
      animation: pulse 1.2s ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }
    .player {
      display: grid;
      gap: 8px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--rd-asphalt-2);
      box-shadow: inset 0 0 0 1px var(--rd-line);
    }
    .player.lead {
      box-shadow: inset 0 0 0 2px var(--rd-signal);
    }
    .player-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .who {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .time {
      flex: none;
      font-family: var(--rd-font-hud-time);
      font-size: 22px;
      font-variant-numeric: tabular-nums;
    }
    .pips {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--rd-muted);
    }
    .pips i {
      width: 20px;
      height: 7px;
      border-radius: 2px;
      background: var(--rd-line);
    }
    .pips i.on {
      background: var(--rd-neon-cyan);
      box-shadow: 0 0 6px var(--rd-neon-cyan);
    }
    .pips span {
      margin-left: 4px;
    }
  `,
})
export class DuelPage implements OnInit {
  /** /duels/:code (withComponentInputBinding). */
  readonly code = input.required<string>();

  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly duels = inject(DuelService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly myUid = this.duels.uid() ?? '';
  protected readonly duel = signal<Duel | null>(null);
  protected readonly missing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copied = signal(false);
  protected readonly busy = signal(false);
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal<string | null>(null);
  private readonly scores = signal<CloudRecord[]>([]);
  /** La hora avanza con cada actualización: el plazo se recalcula sin tocar la red a cada segundo. */
  private readonly now = signal(Date.now());

  protected readonly status = computed(() => {
    const duel = this.duel();
    return duel ? duelStatus(duel, this.now()) : 'waiting';
  });
  protected readonly isOwner = computed(() => this.duel()?.ownerUid === this.myUid);
  protected readonly isMember = computed(() => {
    const duel = this.duel();
    return !!duel && isDuelMember(duel, this.myUid);
  });
  protected readonly canRace = computed(() => {
    const duel = this.duel();
    return !!duel && canRaceDuel(duel, this.myUid, this.now());
  });
  protected readonly mapName = computed(() => {
    const map = findMap(this.duel()?.mapId ?? '');
    return map ? this.i18n.t(map.nameKey) : '';
  });
  protected readonly leftLabel = computed(() => {
    const duel = this.duel();
    const clock = formatClock(duel ? duelRemaining(duel, this.now()) : 0);
    return this.i18n.t('duel.left').replace('{time}', clock);
  });
  protected readonly raceLabel = computed(() => {
    const duel = this.duel();
    const next = duel ? DUEL_ATTEMPTS - attemptsLeft(duel, this.myUid) + 1 : 1;
    return this.i18n
      .t('duel.race')
      .replace('{n}', String(next))
      .replace('{total}', String(DUEL_ATTEMPTS));
  });
  protected readonly rows = computed(() => {
    const duel = this.duel();
    if (!duel) return [];
    const best = this.scores()[0]?.uid;
    return duel.members.map((m) => {
      const left = attemptsLeft(duel, m.uid);
      const score = this.scores().find((s) => s.uid === m.uid);
      return {
        ...m,
        lead: m.uid === best,
        time: score ? formatTime(score.time) : NO_TIME,
        pips: Array.from({ length: DUEL_ATTEMPTS }, (_, i) => i < DUEL_ATTEMPTS - left),
        attemptsLabel: this.i18n
          .t(left === 1 ? 'duel.attemptsOne' : 'duel.attempts')
          .replace('{n}', String(left)),
      };
    });
  });

  ngOnInit(): void {
    void this.load();
    const timer = setInterval(() => void this.load(), REFRESH_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  private async load(): Promise<void> {
    try {
      const duel = await this.duels.find(this.code());
      this.now.set(Date.now());
      this.error.set(null);
      this.duel.set(duel);
      this.missing.set(!duel);
      if (!duel) return;
      // Un enlace a un duelo que aún espera rival y en el que no estoy: a aceptar el reto
      if (duel.startedAt === null && !isDuelMember(duel, this.myUid)) {
        void this.router.navigate(['/d', duel.code], { replaceUrl: true });
        return;
      }
      if (duelStatus(duel, Date.now()) === 'finished') {
        void this.router.navigate(['/duels', duel.code, 'victory'], { replaceUrl: true });
        return;
      }
      if (duel.startedAt !== null) this.scores.set(await this.duels.scores(duel));
    } catch (e) {
      console.warn('[1 vs 1]', e);
      this.error.set('auth.error.network');
    }
  }

  protected back(): void {
    void this.router.navigate(['/duels']);
  }

  protected race(): void {
    const duel = this.duel();
    if (duel) void this.router.navigate(['/race', duel.mapId], { queryParams: { duel: duel.code } });
  }

  protected async cancel(): Promise<void> {
    const duel = this.duel();
    if (!duel) return;
    this.busy.set(true);
    this.cancelError.set(null);
    try {
      await this.duels.remove(duel);
      this.back();
    } catch (e) {
      console.error('[1 vs 1]', e);
      this.cancelError.set('auth.error.network');
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(): Promise<void> {
    const duel = this.duel();
    if (!duel) return;
    try {
      await navigator.clipboard.writeText(this.duels.inviteLink(duel.code));
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      this.error.set('tournament.error.copy');
    }
  }

  /** Compartir del móvil (WhatsApp, etc.); si no lo hay, copia el enlace. */
  protected async share(): Promise<void> {
    const duel = this.duel();
    if (!duel) return;
    if (navigator.share) {
      await navigator
        .share({
          title: this.i18n.t('duel.title'),
          text: this.i18n.t('duel.shareText').replace('{code}', duel.code),
          url: this.duels.inviteLink(duel.code),
        })
        .catch(() => undefined);
    } else {
      await this.copy();
    }
  }
}
