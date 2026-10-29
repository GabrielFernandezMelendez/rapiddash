# RapidDash

Juego de carreras 3D low-poly para móvil en vertical. Angular 22 + Three.js. El objetivo es hacer el mejor tiempo en cada mapa; el fantasma reproduce tu mejor vuelta.

## Mecánicas (no cambiar sin acordarlo)

- Mantener pulsado (o Espacio) acelera. No hay freno: al soltar se pierde velocidad poco a poco.
- Cualquier swipe lateral (o ← →) gira el coche 90°. Mientras está girado no acelera.
- Swipe adelante (o ↑) endereza el coche.
- Curvas de 90°: se toman con un swipe en su sentido dentro de la ventana previa. Sin swipe, choque frontal.
- Tramos curvos (arcos): el magnetismo empuja hacia el muro exterior; más curvatura, más desvío. Por debajo del umbral, nada.
- Choque: no se pierde la partida. El coche se queda parado; swipe al lado contrario del muro (o en el sentido de la curva) y luego adelante.
- Sin ventana de tolerancia en el swipe adelante (posible mejora con el modo online).
- 5 carriles, cámara tipo Subway Surfers algo alejada, brillo en el escape al acelerar.

## Arquitectura hexagonal

```
src/app/
  core/domain/          Reglas puras: pista, coche, carrera, fantasma. Sin Angular, sin Three, sin DOM.
  core/application/     Puertos (clases abstractas en ports/out) y casos de uso (RaceSession).
  infrastructure/       Adaptadores: render/three, input (táctil + teclado), clock, persistence.
  infrastructure/di/    Único sitio donde se enlaza puerto → adaptador.
  ui/                   Angular con atomic design: atoms → molecules → organisms → templates → pages.
  shared/               i18n, formateo.
```

Reglas de dependencia:
- `core/domain` no importa nada fuera de sí mismo.
- `core/application` solo importa `core/domain`.
- `infrastructure` implementa puertos; nunca la importan `core` ni los componentes de `ui` (salvo `infrastructure/di` desde las páginas o `app.config`).
- Los puertos son clases abstractas: sirven de token de DI sin acoplar el núcleo a Angular.
- Three.js solo vive en `infrastructure/render/three` y se carga de forma diferida con la página de carrera.

Atomic design:
- atoms: piezas sin lógica (botón, luz, estadística).
- molecules: combinan átomos (semáforo, tarjeta de mapa, modal, top 10).
- organisms: bloques con sentido propio (HUD, cuenta atrás, diálogos, resultados).
- templates: maquetación con huecos `ng-content`.
- pages: conectan con puertos, router y casos de uso.

## Convenciones

- Componentes standalone, `ChangeDetectionStrategy.OnPush`, signals (`input()`, `output()`, `signal`, `computed`).
- Prefijo de selector `rd-`.
- Comentarios en español durante el desarrollo; la traducción al inglés es un paso final.
- Textos de la interfaz siempre por i18n: `public/i18n/es.json` y `en.json` con las mismas claves. Pipe `t`.
- Toda lógica de juego nueva lleva test en `core/domain` (Vitest). `autopilot.spec.ts` demuestra que cada mapa se termina sin choques: si cambias física o mapas, debe seguir pasando.

## Flujo de trabajo

- `main` solo cambia mediante pull request.
- Ramas: `feat/…`, `fix/…`, `refactor/…`, `chore/…`.
- Commits convencionales en español: `feat(domain): giro de 90°`. Cada commit es un checkpoint.
- PRs pequeñas, de un tema. Descripción: qué cambia, por qué y cómo probarlo.
- Cambios visuales: primero mockup y aprobación, después PR con capturas.
- CI (GitHub Actions) compila y pasa los tests en cada PR.
- Probar una PR en local: `gh pr checkout <n> && npm run start:movil`.

## Comandos

- `npm start`: servidor en http://localhost:4200 (en el PC: Espacio y flechas).
- `npm run start:movil`: accesible desde el móvil en la misma wifi.
- `npm test -- --watch=false`: tests.
- `npm run build`: build de producción.
