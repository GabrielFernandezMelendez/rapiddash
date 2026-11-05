import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Duel, duelStatus, rivalOf } from '../../../core/domain/duel/duel';
import { findMap } from '../../../core/domain/track/race-map';
import { DuelService } from '../../../shared/account/duel.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { TournamentCard } from '../../molecules/tournament-card/tournament-card';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';

/** «1 vs 1 Turbo Race»: crear, unirse y la lista de mis duelos. */
@Component({
  selector: 'rd-duels-page',
  imports: [MenuLayout, Button, TournamentCard, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="go('/')">← {{ 'maps.back' | t }}</button>
        <h1>{{ 'duel.title' | t }}</h1>
        <span class="sub">{{ 'duel.subtitle' | t }}</span>
      </div>

      <div class="actions">
        <button rdButton type="button" [disabled]="busy()" (click)="create()">{{ 'duel.create' | t }}</button>
        <button rdButton variant="secondary" type="button" (click)="go('/duels/join')">
          {{ 'duel.join' | t }}
        </button>
      </div>
      @if (createError(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }

      <h2>{{ 'duel.mine' | t }}</h2>
      @if (loading()) {
        <p class="note">{{ 'daily.loading' | t }}</p>
      } @else if (error()) {
        <p class="note">{{ 'leaderboard.offline' | t }}</p>
      } @else {
        @for (d of list(); track d.code) {
          <rd-tournament-card
            [name]="name(d)"
            [status]="status(d)"
            [statusLabel]="'duel.status.' + status(d) | t"
            [detail]="detail(d)"
            [removable]="false"
            removeLabel=""
            (open)="go('/duels/' + d.code)"
          />
        } @empty {
          <p class="note">{{ 'duel.none' | t }}</p>
        }
      }
    </rd-menu-layout>
  `,
  styleUrl: '../tournaments/tournaments.page.scss',
})
export class DuelsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly duels = inject(DuelService);

  protected readonly list = signal<Duel[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly busy = signal(false);
  protected readonly createError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.list.set(await this.duels.mine());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected status(d: Duel) {
    return duelStatus(d, Date.now());
  }

  protected name(d: Duel): string {
    const rival = rivalOf(d, this.duels.uid() ?? '');
    return rival ? `vs ${rival.nickname}` : d.code;
  }

  protected detail(d: Duel): string {
    const map = findMap(d.mapId);
    return map ? this.i18n.t(map.nameKey) : '';
  }

  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }

  protected async create(): Promise<void> {
    this.busy.set(true);
    this.createError.set(null);
    try {
      const duel = await this.duels.create();
      this.go('/duels/' + duel.code);
    } catch (e) {
      console.error('[1 vs 1]', e);
      this.createError.set('auth.error.network');
    } finally {
      this.busy.set(false);
    }
  }
}
