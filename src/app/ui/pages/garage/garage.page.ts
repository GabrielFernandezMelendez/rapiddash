import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { GarageScenePort } from '../../../core/application/ports/out/garage-scene.port';
import { GARAGE_CARS, GARAGE_FX, parsePrize, Prize } from '../../../core/domain/garage/garage';
import { provideGarageAdapters } from '../../../infrastructure/di/garage.providers';
import { GarageService } from '../../../shared/garage/garage.service';
import { TranslatePipe } from '../../../shared/i18n/translate.pipe';
import { Button } from '../../atoms/button/button';

type Tab = 'cars' | 'effects';

/**
 * Garaje: el coche girando en su plataforma y, debajo, dos pestañas (coches y efectos).
 * Tocar algo lo enseña en la escena; si está abierto, además lo deja elegido.
 */
@Component({
  selector: 'rd-garage-page',
  imports: [Button, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideGarageAdapters()],
  // Espacio acelera, como en la carrera
  host: {
    '(window:keydown.space)': 'onSpace($event, true)',
    '(window:keyup.space)': 'onSpace($event, false)',
  },
  templateUrl: './garage.page.html',
  styleUrl: './garage.page.scss',
})
export class GaragePage implements OnInit, OnDestroy {
  /** ?prize=car-14: se llega desde la ruleta del cubo azul a ver ese premio y decidir si llevarlo. */
  readonly prize = input<string | undefined>();
  /** Premio recién ganado (null: el garaje normal). */
  protected readonly newPrize = signal<Prize | null>(null);
  private readonly router = inject(Router);
  private readonly scene = inject(GarageScenePort);
  protected readonly garage = inject(GarageService);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  protected readonly tab = signal<Tab>('cars');
  protected readonly cars = GARAGE_CARS;
  protected readonly effects = GARAGE_FX;
  /** Lo que se está viendo (puede estar bloqueado); empieza con lo elegido. */
  protected readonly previewCar = signal<number | null>(this.garage.choice().car);
  protected readonly previewFx = signal<number>(this.garage.choice().fx);
  protected readonly accelerating = signal(false);

  /** Nombre, descripción y estado de lo que se ve, según la pestaña. */
  protected readonly current = computed(() => {
    if (this.tab() === 'cars') {
      const car = this.previewCar();
      return {
        name: car === null ? 'garage.stock' : `garage.car.${car}`,
        desc: car === null ? 'garage.stockHint' : `garage.carDesc.${car}`,
        locked: !this.garage.carUnlocked(car),
        selected: this.garage.choice().car === car,
      };
    }
    const fx = this.previewFx();
    return {
      name: `garage.fx.${fx}`,
      desc: `garage.fxDesc.${fx}`,
      locked: !this.garage.fxUnlocked(fx),
      selected: this.garage.choice().fx === fx,
    };
  });

  ngOnInit(): void {
    const prize = parsePrize(this.prize());
    if (!prize) return;
    const open =
      prize.kind === 'car' ? this.garage.carUnlocked(prize.id) : this.garage.fxUnlocked(prize.id);
    if (!open) return;
    this.newPrize.set(prize);
    // Se enseña, pero no se elige solo: eso lo decide el jugador con el botón
    if (prize.kind === 'car') {
      this.previewCar.set(prize.id);
    } else {
      this.tab.set('effects');
      this.previewFx.set(prize.id);
      this.demoFx();
    }
  }

  /** El premio ya es lo que lleva el jugador. */
  protected readonly prizeChosen = computed(() => {
    const prize = this.newPrize();
    const choice = this.garage.choice();
    return prize !== null && (prize.kind === 'car' ? choice.car : choice.fx) === prize.id;
  });

  protected choosePrize(): void {
    const prize = this.newPrize();
    if (prize?.kind === 'car') this.garage.selectCar(prize.id);
    else if (prize) this.garage.selectFx(prize.id);
  }

  constructor() {
    // La escena se monta en cuanto existe el hueco y sigue a lo que se está viendo
    let attached = false;
    effect(() => {
      const host = this.stage().nativeElement;
      if (!attached) {
        this.scene.attach(host);
        attached = true;
      }
      this.scene.show(this.previewCar());
    });
    effect(() => this.scene.setFx(this.previewFx()));
    effect(() => this.scene.setAccelerating(this.accelerating()));
  }

  ngOnDestroy(): void {
    this.scene.dispose();
  }

  protected pickCar(car: number | null): void {
    this.previewCar.set(car);
    this.garage.selectCar(car);
  }

  protected pickFx(fx: number): void {
    this.previewFx.set(fx);
    this.garage.selectFx(fx);
    this.demoFx();
  }

  /** Al ver un efecto se ve un momento acelerando. */
  private demoFx(): void {
    this.accelerating.set(true);
    clearTimeout(this.demo);
    this.demo = setTimeout(() => this.accelerating.set(false), 1600);
  }

  protected hold(on: boolean): void {
    clearTimeout(this.demo);
    this.accelerating.set(on);
  }

  protected onSpace(event: Event, on: boolean): void {
    event.preventDefault();
    this.hold(on);
  }

  /** Desde un premio se vuelve al mapa del día, donde está el puesto de esa carrera. */
  protected back(): void {
    void this.router.navigate([this.newPrize() ? '/daily' : '/']);
  }

  private demo: ReturnType<typeof setTimeout> | undefined;
}
