import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideAppAdapters } from './infrastructure/di/app.providers';
import { AestheticService } from './shared/aesthetic/aesthetic.service';
import { I18nService } from './shared/i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    ...provideAppAdapters(),
    provideAppInitializer(() => inject(AestheticService).init()),
    provideAppInitializer(() => inject(I18nService).init()),
  ],
};
