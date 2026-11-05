import { showPatchNotes } from './patch-notes';

describe('showPatchNotes', () => {
  it('sale si nunca se han visto', () => {
    expect(showPatchNotes(null, '0.9.9')).toBe(true);
  });

  it('no vuelve a salir sola en la misma versión', () => {
    expect(showPatchNotes('0.9.9', '0.9.9')).toBe(false);
  });

  it('sale otra vez al actualizar', () => {
    expect(showPatchNotes('0.9.9', '1.0.0')).toBe(true);
  });
});
