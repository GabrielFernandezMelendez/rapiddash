import { Routes } from '@angular/router';

// Páginas con carga diferida: Three.js solo se descarga al entrar en una carrera
export const routes: Routes = [
  { path: '', loadComponent: () => import('./ui/pages/home/home.page').then((m) => m.HomePage) },
  {
    path: 'maps',
    loadComponent: () =>
      import('./ui/pages/map-select/map-select.page').then((m) => m.MapSelectPage),
  },
  {
    path: 'race/:mapId',
    loadComponent: () => import('./ui/pages/race/race.page').then((m) => m.RacePage),
  },
  { path: '**', redirectTo: '' },
];
