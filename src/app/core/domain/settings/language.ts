export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (value: unknown): value is Language =>
  typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
