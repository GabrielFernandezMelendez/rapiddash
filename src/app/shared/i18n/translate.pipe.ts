import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';

/** Uso: {{ 'home.start' | t }}. Impuro para reaccionar al cambio de idioma. */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string): string {
    return this.i18n.t(key);
  }
}
