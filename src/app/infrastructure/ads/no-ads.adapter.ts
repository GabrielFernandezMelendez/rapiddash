import { AdsPort } from '../../core/application/ports/out/ads.port';

/**
 * Sin anuncios todavía: «ver anuncio» da la recompensa al momento. Con la app de Android
 * llegará un adaptador de AdMob (anuncio bonificado).
 */
export class NoAdsAdapter extends AdsPort {
  async showRewarded(): Promise<boolean> {
    return true;
  }
}
