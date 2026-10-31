import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { fileToSquareJpeg, squareJpeg } from '../../../shared/photo/square-jpeg';
import { Button } from '../../atoms/button/button';
import { Modal } from '../../molecules/modal/modal';

type Step = 'ask' | 'camera' | 'preview' | 'error';

/**
 * Foto para el cartel del líder del torneo: preguntar, cámara, revisar (usar o repetir).
 * Accesible: el foco va al botón principal de cada paso y no sale de la ventana, Escape y
 * «Cancelar» cierran en cualquier momento, cada paso se anuncia y, sin cámara (o sin permiso),
 * se puede elegir una foto de la galería.
 */
@Component({
  selector: 'rd-leader-photo',
  imports: [Modal, Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'trapFocus($event)' },
  template: `
    <rd-modal [label]="'photo.title' | t" [centered]="true" (dismiss)="close()">
      <span modal-title>{{ (step() === 'ask' && !current() ? 'photo.leaderTitle' : 'photo.title') | t }}</span>
      <p class="sr-only" aria-live="polite">{{ 'photo.step.' + step() | t }}</p>

      @switch (step()) {
        @case ('ask') {
          @if (current(); as photo) {
            <img class="photo" [src]="photo" [alt]="'photo.currentAlt' | t" />
            <p class="lead">{{ 'photo.currentText' | t }}</p>
          } @else {
            <p class="lead">{{ 'photo.ask' | t }}</p>
          }
          <p class="note">{{ 'photo.privacy' | t }}</p>
        }
        @case ('camera') {
          <div class="frame">
            <video #video class="video" autoplay playsinline muted [attr.aria-label]="'photo.preview' | t"></video>
          </div>
        }
        @case ('preview') {
          <img class="photo" [src]="taken()" [alt]="'photo.takenAlt' | t" />
          <p class="lead">{{ 'photo.confirm' | t }}</p>
        }
        @case ('error') {
          <p class="lead" role="alert">{{ errorKey() | t }}</p>
        }
      }
      @if (error(); as error) {
        <p class="error" role="alert">{{ error | t }}</p>
      }

      <ng-container modal-actions>
        @switch (step()) {
          @case ('ask') {
            @if (current()) {
              <button rdButton variant="secondary" type="button" [disabled]="busy()" (click)="remove.emit()">
                {{ 'photo.remove' | t }}
              </button>
              <button rdButton type="button" data-primary [disabled]="busy()" (click)="openCamera()">
                {{ 'photo.change' | t }}
              </button>
            } @else {
              <button rdButton variant="secondary" type="button" (click)="decline()">{{ 'photo.notNow' | t }}</button>
              <button rdButton type="button" data-primary (click)="openCamera()">{{ 'photo.take' | t }}</button>
            }
          }
          @case ('camera') {
            <button rdButton variant="secondary" type="button" (click)="close()">{{ 'photo.cancel' | t }}</button>
            <button rdButton type="button" data-primary [disabled]="!ready()" (click)="shoot()">{{ 'photo.shoot' | t }}</button>
          }
          @case ('preview') {
            <button rdButton variant="secondary" type="button" [disabled]="busy()" (click)="retake()">{{ 'photo.retake' | t }}</button>
            <button rdButton type="button" data-primary [disabled]="busy()" (click)="save.emit(taken()!)">
              {{ 'photo.use' | t }}
            </button>
          }
          @case ('error') {
            <button rdButton variant="secondary" type="button" (click)="close()">{{ 'photo.cancel' | t }}</button>
            <button rdButton type="button" data-primary (click)="file.click()">{{ 'photo.gallery' | t }}</button>
          }
        }
        @if (step() !== 'error' && step() !== 'preview') {
          <button rdButton variant="link" type="button" (click)="file.click()">{{ 'photo.gallery' | t }}</button>
        }
        @if (step() === 'ask' && current()) {
          <button rdButton variant="link" type="button" (click)="close()">{{ 'photo.close' | t }}</button>
        }
      </ng-container>
    </rd-modal>
    <input #file type="file" accept="image/*" hidden (change)="pickFile($event)" />
  `,
  styles: `
    .lead,
    .note {
      margin: 0;
      line-height: 1.45;
    }
    .note {
      font-size: 13px;
      color: var(--rd-muted);
    }
    .frame,
    .photo {
      justify-self: center;
      width: min(68vw, 280px);
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 0 0 3px var(--rd-signal);
      background: #000;
    }
    .photo {
      display: block;
      object-fit: cover;
    }
    .video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      /* La cámara frontal se ve como un espejo, como en cualquier app de fotos */
      transform: scaleX(-1);
    }
    /* Botones a lo ancho, el principal arriba: textos largos sin partir y blancos fáciles de tocar */
    [rdButton] {
      grid-column: 1 / -1;
      white-space: nowrap;
    }
    [data-primary] {
      order: -1;
    }
    .error {
      margin: 0;
      color: var(--rd-kerb);
      filter: brightness(1.25);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class LeaderPhoto implements OnInit {
  /** Foto actual del cartel (null si aún no hay). */
  readonly current = input<string | null>(null);
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly save = output<string>();
  readonly remove = output<void>();
  /** «Ahora no»: no volver a ofrecerla sola en este torneo. */
  readonly declined = output<void>();
  readonly closed = output<void>();

  protected readonly step = signal<Step>('ask');
  protected readonly taken = signal<string | null>(null);
  protected readonly ready = signal(false);
  protected readonly errorKey = signal('photo.error.denied');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private stream: MediaStream | null = null;

  constructor() {
    // Cada paso pone el foco en su botón principal (lectores de pantalla y teclado)
    afterRenderEffect(() => {
      this.step();
      this.host.nativeElement.querySelector<HTMLElement>('[data-primary]')?.focus();
    });
    // La vista previa se engancha al vídeo en cuanto existe
    afterRenderEffect(() => {
      const el = this.video()?.nativeElement;
      if (el && this.stream && el.srcObject !== this.stream) {
        el.srcObject = this.stream;
        el.onloadedmetadata = () => this.ready.set(true);
      }
    });
    inject(DestroyRef).onDestroy(() => this.stopCamera());
  }

  ngOnInit(): void {
    this.step.set('ask');
  }

  protected async openCamera(): Promise<void> {
    this.ready.set(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.fail('photo.error.noCamera');
      return;
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      this.step.set('camera');
    } catch (e) {
      const name = (e as { name?: string }).name;
      this.fail(name === 'NotAllowedError' || name === 'SecurityError' ? 'photo.error.denied' : 'photo.error.noCamera');
    }
  }

  protected shoot(): void {
    const el = this.video()?.nativeElement;
    if (!el || !el.videoWidth) return;
    this.taken.set(squareJpeg(el, el.videoWidth, el.videoHeight, true));
    this.stopCamera();
    this.step.set('preview');
  }

  protected retake(): void {
    this.taken.set(null);
    void this.openCamera();
  }

  protected async pickFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.stopCamera();
      this.taken.set(await fileToSquareJpeg(file));
      this.step.set('preview');
    } catch {
      this.fail('photo.error.file');
    }
  }

  protected decline(): void {
    this.declined.emit();
    this.close();
  }

  protected close(): void {
    this.stopCamera();
    this.closed.emit();
  }

  /** Tab y Mayús+Tab dan la vuelta dentro de la ventana. */
  protected trapFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = [...this.host.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled])')];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === last) {
      first.focus();
      event.preventDefault();
    }
  }

  private fail(key: string): void {
    this.stopCamera();
    this.errorKey.set(key);
    this.step.set('error');
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ready.set(false);
  }
}
