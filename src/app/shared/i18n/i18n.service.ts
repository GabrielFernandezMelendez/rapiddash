import { computed, inject, Injectable, signal } from '@angular/core';
import { SettingsRepository } from '../../core/application/ports/out/settings.repository';
import { isLanguage, Language, LANGUAGES } from '../../core/domain/settings/language';

type Dictionary = Record<string, string>;

/**
 * Traducciones en tiempo de ejecución a partir de public/i18n/<idioma>.json.
 * Se cargan los dos idiomas al arrancar para que el cambio desde Ajustes sea instantáneo.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly settings = inject(SettingsRepository);
  private readonly dictionaries = signal<Partial<Record<Language, Dictionary>>>({});
  readonly language = signal<Language>('es');
  private readonly current = computed(() => this.dictionaries()[this.language()] ?? {});

  async init(): Promise<void> {
    this.language.set(this.settings.getLanguage() ?? this.browserLanguage());
    const entries = await Promise.all(
      LANGUAGES.map(async (lang) => [lang, await this.load(lang)] as const),
    );
    this.dictionaries.set(Object.fromEntries(entries));
    document.documentElement.lang = this.language();
  }

  setLanguage(language: Language): void {
    this.language.set(language);
    this.settings.setLanguage(language);
    document.documentElement.lang = language;
  }

  /** Devuelve la clave si falta la traducción, para detectarla a simple vista. */
  t(key: string): string {
    return this.current()[key] ?? key;
  }

  private async load(lang: Language): Promise<Dictionary> {
    try {
      const res = await fetch(`i18n/${lang}.json`);
      return res.ok ? ((await res.json()) as Dictionary) : {};
    } catch {
      return {};
    }
  }

  private browserLanguage(): Language {
    const lang = globalThis.navigator?.language?.slice(0, 2);
    return isLanguage(lang) ? lang : 'es';
  }
}
