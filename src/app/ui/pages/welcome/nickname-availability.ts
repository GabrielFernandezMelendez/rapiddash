import { signal } from '@angular/core';
import { checkNickname } from '../../../core/domain/profile/nickname';
import { NicknameAvailability } from '../../organisms/pilot-form/pilot-form';

const DEBOUNCE_MS = 400;

/** Comprueba si el apodo está libre mientras se escribe, sin consultar en cada tecla. */
export class NicknameAvailabilityCheck {
  readonly state = signal<NicknameAvailability>('idle');
  private timer: ReturnType<typeof setTimeout> | undefined;
  private latest = '';

  constructor(private readonly isFree: (nickname: string) => Promise<boolean>) {}

  check(nickname: string): void {
    clearTimeout(this.timer);
    this.latest = nickname;
    if (!checkNickname(nickname).ok) {
      this.state.set('idle');
      return;
    }
    this.state.set('checking');
    this.timer = setTimeout(async () => {
      try {
        const free = await this.isFree(nickname);
        if (this.latest === nickname) this.state.set(free ? 'free' : 'taken');
      } catch {
        // Sin red: se comprobará al guardar
        if (this.latest === nickname) this.state.set('idle');
      }
    }, DEBOUNCE_MS);
  }

  /** Al guardar, la reserva dijo que estaba cogido. */
  taken(): void {
    this.state.set('taken');
  }

  dispose(): void {
    clearTimeout(this.timer);
  }
}
