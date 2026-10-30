import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideAppAdapters } from './infrastructure/di/app.providers';
import { AccountService } from './shared/account/account.service';
import { CloudRecordsService } from './shared/account/cloud-records.service';
import { AestheticService } from './shared/aesthetic/aesthetic.service';
import { I18nService } from './shared/i18n/i18n.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    ...provideAppAdapters(),
    provideAppInitializer(() => inject(AestheticService).init()),
    provideAppInitializer(() => inject(I18nService).init()),
    provideAppInitializer(() => inject(AccountService).init()),
    // Crea el servicio para que suba los récords pendientes cuando haya piloto
    provideAppInitializer(() => void inject(CloudRecordsService)),
  ],
};
