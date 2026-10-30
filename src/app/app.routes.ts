import { inject } from '@angular/core';
import { CanMatchFn, Router, Routes, UrlSegment } from '@angular/router';
import { AccountService } from './shared/account/account.service';

/** Sin piloto todavía: primero la bienvenida. */
const hasPilot: CanMatchFn = () =>
  inject(AccountService).profile() ? true : inject(Router).createUrlTree(['/welcome']);

/** La bienvenida (/welcome) es solo para quien no tiene piloto; sus pasos sirven también para vincular. */
const welcomeAllowed: CanMatchFn = (_route, segments: UrlSegment[]) =>
  segments.length > 1 || !inject(AccountService).profile() ? true : inject(Router).createUrlTree(['/']);

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
    path: 'profile',
    canMatch: [hasPilot],
    loadComponent: () => import('./ui/pages/profile/profile.page').then((m) => m.ProfilePage),
  },
  { path: 'welcome', canMatch: [welcomeAllowed], loadComponent: welcome },
  { path: 'welcome/:step', canMatch: [welcomeAllowed], loadComponent: welcome },
  { path: '**', redirectTo: '' },
];
