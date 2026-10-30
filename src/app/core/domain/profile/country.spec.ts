import { countryFromLocales, flagEmoji, isCountryCode } from './country';

describe('País', () => {
  it('sale de la región del idioma del navegador', () => {
    expect(countryFromLocales(['es-ES', 'en'])).toBe('ES');
    expect(countryFromLocales(['es', 'en-US'])).toBe('US');
    expect(countryFromLocales(['es-419', 'pt_BR'])).toBe('BR');
    expect(countryFromLocales(['zh-Hant-TW'])).toBe('TW');
  });

  it('sin región no se adivina', () => {
    expect(countryFromLocales(['es', 'en'])).toBeNull();
    expect(countryFromLocales([])).toBeNull();
  });

  it('solo acepta códigos ISO existentes', () => {
    expect(isCountryCode('MX')).toBe(true);
    expect(isCountryCode('XX')).toBe(false);
    expect(isCountryCode('es')).toBe(false);
  });

  it('dibuja la bandera con letras regionales', () => {
    expect(flagEmoji('ES')).toBe('🇪🇸');
  });
});
