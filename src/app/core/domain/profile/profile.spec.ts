import { isGuest, needsLinkReminder, Profile, snoozeLinkReminder } from './profile';

const day = (n: number) => new Date(Date.UTC(2026, 10, 1 + n));
const profile = (kind: Profile['kind']): Profile => ({
  uid: 'u1',
  nickname: 'Gabo',
  country: 'ES',
  kind,
  createdAt: day(0).toISOString(),
  linkReminderAt: day(0).toISOString(),
});

describe('Perfil', () => {
  it('sin verificar el correo cuenta como invitado', () => {
    expect(isGuest('guest')).toBe(true);
    expect(isGuest('unverified')).toBe(true);
    expect(isGuest('google')).toBe(false);
    expect(isGuest('email')).toBe(false);
  });

  it('recuerda vincular a los 5 días, no antes', () => {
    expect(needsLinkReminder(profile('guest'), day(4))).toBe(false);
    expect(needsLinkReminder(profile('guest'), day(5))).toBe(true);
    expect(needsLinkReminder(profile('unverified'), day(6))).toBe(true);
  });

  it('con cuenta no se recuerda nunca', () => {
    expect(needsLinkReminder(profile('google'), day(30))).toBe(false);
    expect(needsLinkReminder(profile('email'), day(30))).toBe(false);
  });

  it('«Ahora no» lo pospone otros 5 días', () => {
    const snoozed = snoozeLinkReminder(profile('guest'), day(5));
    expect(needsLinkReminder(snoozed, day(9))).toBe(false);
    expect(needsLinkReminder(snoozed, day(10))).toBe(true);
  });
});
