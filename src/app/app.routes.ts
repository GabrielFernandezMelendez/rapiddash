import { inject } from '@angular/core';
import { CanMatchFn, Router, Routes, UrlSegment } from '@angular/router';
import { AccountService } from './shared/account/account.service';

/** Sin piloto todavía: primero la bienvenida. */
const hasPilot: CanMatchFn = () =>
  inject(AccountService).profile() ? true : inject(Router).createUrlTree(['/welcome']);

/** La bienvenida (/welcome) es solo para quien no tiene piloto; sus pasos sirven también para vincular. */
const welcomeAllowed: CanMatchFn = (_route, segments: UrlSegment[]) =>
  segments.length > 1 || !inject(AccountService).profile() ? true : inject(Router).createUrlTree(['/']);

const joinTournament = () =>
  import('./ui/pages/tournaments/join-tournament.page').then((m) => m.JoinTournamentPage);

const joinDuel = () => import('./ui/pages/duels/join-duel.page').then((m) => m.JoinDuelPage);

const welcome = () => import('./ui/pages/welcome/welcome.page').then((m) => m.WelcomePage);

// Páginas con carga diferida: Three.js solo se descarga al entrar en una carrera
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'maps',
    canMatch: [hasPilot],
    loadComponent: () =>
      import('./ui/pages/map-select/map-select.page').then((m) => m.MapSelectPage),
  },
  {
    path: 'race/:mapId',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/race/race.page').then((m) => m.RacePage),
  },
  {
    path: 'medals',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/medals/medals.page').then((m) => m.MedalsPage),
  },
  {
    path: 'garage',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/garage/garage.page').then((m) => m.GaragePage),
  },
  {
    path: 'daily',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/daily/daily.page').then((m) => m.DailyPage),
  },
  {
    path: 'tournaments',
    canMatch: [hasPilot],
    loadComponent: () =>
      import('./ui/pages/tournaments/tournaments.page').then((m) => m.TournamentsPage),
  },
  {
    path: 'tournaments/join',
    canMatch: [hasPilot],
    loadComponent: joinTournament,
  },
  {
    path: 'tournaments/:code',
    canMatch: [hasPilot],
    loadComponent: () =>
      import('./ui/pages/tournaments/tournament.page').then((m) => m.TournamentPage),
  },
  // Enlace de invitación corto: /t/K7RQ2M
  { path: 't/:code', canMatch: [hasPilot], loadComponent: joinTournament },
  {
    path: 'duels',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/duels/duels.page').then((m) => m.DuelsPage),
  },
  { path: 'duels/join', canMatch: [hasPilot], loadComponent: joinDuel },
  {
    path: 'duels/:code',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/duels/duel.page').then((m) => m.DuelPage),
  },
  {
    path: 'duels/:code/victory',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/duels/duel-victory.page').then((m) => m.DuelVictoryPage),
  },
  // Enlace de reto corto: /d/K7RQ2M
  { path: 'd/:code', canMatch: [hasPilot], loadComponent: joinDuel },
  {
    path: 'profile',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  { path: 'welcome', canMatch: [welcomeAllowed], loadComponent: welcome },
  { path: 'welcome/:step', canMatch: [welcomeAllowed], loadComponent: welcome },
  { path: '**', redirectTo: '' },
];
