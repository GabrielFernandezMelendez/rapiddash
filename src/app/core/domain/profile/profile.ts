import { CountryCode } from './country';

/**
 * Tipo de cuenta. «unverified»: creó cuenta con correo pero aún no lo ha verificado; hasta
 * entonces cuenta como invitado.
 */
export type AccountKind = 'guest' | 'unverified' | 'google' | 'email';

/** Perfil público del piloto: lo que se ve en el ranking. Sin nombre ni apellidos. */
export interface Profile {
  readonly uid: string;
  readonly nickname: string;
  readonly country: CountryCode | null;
  readonly kind: AccountKind;
  readonly createdAt: string;
  /** Última vez que se le pidió vincular la cuenta (al crear el perfil cuenta como la primera). */
  readonly linkReminderAt: string;
}

export const LINK_REMINDER_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Juega sin cuenta (o sin verificar): si cambia de móvil, pierde el perfil. */
export function isGuest(kind: AccountKind): boolean {
  return kind === 'guest' || kind === 'unverified';
}

/** Cada 5 días se recuerda a los invitados que guarden su progreso. */
export function needsLinkReminder(profile: Profile, now: Date): boolean {
  if (!isGuest(profile.kind)) return false;
  const last = Date.parse(profile.linkReminderAt);
  return Number.isNaN(last) || now.getTime() - last >= LINK_REMINDER_DAYS * DAY_MS;
}

/** «Ahora no»: vuelve a preguntar dentro de 5 días. */
export function snoozeLinkReminder(profile: Profile, now: Date): Profile {
  return { ...profile, linkReminderAt: now.toISOString() };
}
