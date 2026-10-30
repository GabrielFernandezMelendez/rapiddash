import { checkNickname, nicknameKey } from './nickname';

describe('Apodo', () => {
  it('acepta de 3 a 16 letras o números, con tildes y ñ', () => {
    expect(checkNickname('Gabo')).toEqual({ ok: true, value: 'Gabo' });
    expect(checkNickname('  Peñón99  ')).toEqual({ ok: true, value: 'Peñón99' });
    expect(checkNickname('abcdefghijklmnop').ok).toBe(true);
  });

  it('explica por qué no vale', () => {
    expect(checkNickname('ab')).toEqual({ ok: false, problem: 'short' });
    expect(checkNickname('abcdefghijklmnopq')).toEqual({ ok: false, problem: 'long' });
    expect(checkNickname('Ga bo')).toEqual({ ok: false, problem: 'chars' });
    expect(checkNickname('gabo!')).toEqual({ ok: false, problem: 'chars' });
  });

  it('la clave ignora mayúsculas y tildes', () => {
    expect(nicknameKey('Gabó')).toBe('gabo');
    expect(nicknameKey('GABO')).toBe(nicknameKey('gabo'));
    expect(nicknameKey('Peñón')).toBe('penon');
  });
});
