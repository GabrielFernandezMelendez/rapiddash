# RapidDash

Juego de carreras 3D low-poly para móvil en vertical. Angular 22 + Three.js. El objetivo es hacer el mejor tiempo en cada mapa; el fantasma reproduce tu mejor vuelta.

## Mecánicas (no cambiar sin acordarlo)

- Mantener pulsado (o Espacio) acelera. No hay freno: al soltar se pierde velocidad poco a poco.
- Cualquier swipe lateral (o ← →) gira el coche 90°. Mientras está girado no acelera.
- Swipe adelante (o ↑) endereza el coche.
- Curvas de 90° = cruces cuadrados (11 × 11 m). La pista son tramos (rectas y arcos) unidos por cruces. En el cruce, el swipe hacia la salida gira el coche y el momento decide el carril de salida: al entrar, carril interior; tarde, exterior; demasiado tarde, choque contra el muro frontal. Girar hacia la salida hasta 1,5 m antes del cruce cuenta como entrar; antes, muro lateral.
- Imán de carril fuerte: con el morro recto el coche se centra en el carril más cercano (como en Race Time). Nunca se queda entre dos carriles.
- Tramos curvos (arcos): el magnetismo empuja hacia el muro exterior; más curvatura, más desvío. Sin acelerar el coche va pegado al suelo (el magnetismo se reduce y no vence al imán de carril); acelerando, en curvas cerradas salta de carril hacia el muro.
- Juego continuo, sin pausas: ningún choque detiene el coche.
- Roce (contacto casi paralelo con el muro, < ~35°): no es choque; el rozamiento frena cada vez más (con chispas). Se despega con un swipe hacia el centro o soltando el acelerador (el imán lo lleva al carril más cercano).
- Choque lateral (coche girado contra el muro): conserva el 40 % de la velocidad y en 0,7 s se endereza solo en el carril pegado al muro.
- Choque frontal (o contra el lado cerrado) en un cruce: en 0,6 s pivota solo hacia la salida a 10 m/s y sale por el carril exterior.
- Durante esas animaciones se ignoran los swipes.
- Mapas en dos formatos a comparar: clásicos (cruces sueltos) y zigzag (series de 3 a 8 cruces seguidos con tramos cortos). Los giros alternan derecha/izquierda para que la pista avance en escalera y no se cruce.
- Sin ventana de tolerancia en el swipe adelante (posible mejora con el modo online).
- 5 carriles, cámara tipo Subway Surfers algo alejada, brillo en el escape al acelerar.
- Sonido: música en bucle durante la carrera; el motor suena solo al acelerar, con volumen y vueltas según la velocidad. Archivos en `public/audio/` (ver su README); sin ellos, silencio.

## Arquitectura hexagonal

```
src/app/
  core/domain/          Reglas puras: pista, coche, carrera, fantasma. Sin Angular, sin Three, sin DOM.
  core/application/     Puertos (clases abstractas en ports/out) y casos de uso (RaceSession).
  infrastructure/       Adaptadores: render/three, input (táctil + teclado), audio, clock, persistence.
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
- Despliegue: cada PR se publica en una URL de prueba (el bot de Firebase la comenta en la PR); cada merge en `main` publica en https://rapiddash-gabo.web.app.
- Las PRs van siempre contra `main`, sin encadenarlas.
- Skills de Firebase en `.agents/skills/`: leer la que toque (hosting, firestore, auth, reglas) antes de trabajar con Firebase.

## Comandos

- `npm start`: servidor en http://localhost:4200 (en el PC: Espacio y flechas).
- `npm run start:movil`: accesible desde el móvil en la misma wifi.
- `npm test -- --watch=false`: tests.
- `npm run build`: build de producción.
