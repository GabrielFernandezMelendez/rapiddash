import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Tournament } from '../../../core/domain/tournament/tournament';
import { AccountService } from '../../../shared/account/account.service';
import { TournamentService } from '../../../shared/account/tournament.service';
import { I18nService } from '../../../shared/i18n/i18n.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';
import { TournamentCard } from '../../molecules/tournament-card/tournament-card';
import { CreateTournament } from '../../organisms/create-tournament/create-tournament';
import { MenuLayout } from '../../templates/menu-layout/menu-layout';
import { describeTournament } from './tournament-view';

/** «Torneos»: crear, unirse y la lista de los míos. */
@Component({
  selector: 'rd-tournaments-page',
  imports: [MenuLayout, Button, TournamentCard, CreateTournament, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <rd-menu-layout>
      <div menu-header class="top">
        <button rdButton variant="ghost" type="button" (click)="go('/')">← {{ 'maps.back' | t }}</button>
        <h1>{{ 'tournament.title' | t }}</h1>
        <span class="sub">{{ 'tournament.subtitle' | t }}</span>
      </div>

      <div class="actions">
        <button rdButton type="button" (click)="creating.set(true)">{{ 'tournament.createGo' | t }}</button>
        <button rdButton variant="secondary" type="button" (click)="go('/tournaments/join')">
          {{ 'tournament.join' | t }}
        </button>
      </div>

      <h2>{{ 'tournament.mine' | t }}</h2>
      @if (loading()) {
        <p class="note">{{ 'daily.loading' | t }}</p>
      } @else if (error()) {
        <p class="note">{{ 'leaderboard.offline' | t }}</p>
      } @else {
        @for (t of list(); track t.code) {
          @let d = describe(t);
          <rd-tournament-card
            [name]="t.name"
            [status]="d.status"
            [statusLabel]="d.statusLabel"
            [detail]="d.detail"
            (open)="go('/tournaments/' + t.code)"
          />
        } @empty {
          <p class="note">{{ 'tournament.none' | t }}</p>
        }
      }
    </rd-menu-layout>

    @if (creating()) {
      <rd-create-tournament
        [defaultName]="defaultName()"
        [busy]="busy()"
        [error]="createError()"
        (create)="create($event)"
        (cancel)="creating.set(false)"
      />
    }
  `,
  styleUrl: './tournaments.page.scss',
})
export class TournamentsPage implements OnInit {
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);
  private readonly account = inject(AccountService);
  private readonly tournaments = inject(TournamentService);

  protected readonly list = signal<Tournament[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly creating = signal(false);
  protected readonly busy = signal(false);
  protected readonly createError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.list.set(await this.tournaments.mine());
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected describe(t: Tournament) {
    return describeTournament(t, this.i18n, Date.now());
  }

  protected defaultName(): string {
    return this.i18n.t('tournament.defaultName').replace('{name}', this.account.profile()?.nickname ?? '');
  }

  protected go(path: string): void {
    void this.router.navigateByUrl(path);
  }

  protected async create(name: string): Promise<void> {
    this.busy.set(true);
    this.createError.set(null);
    try {
      const t = await this.tournaments.create(name);
      this.go('/tournaments/' + t.code);
    } catch (e) {
      console.error('[torneos]', e);
      this.createError.set('auth.error.unknown');
    } finally {
      this.busy.set(false);
    }
  }
}
