# RapidDash

Juego de carreras 3D low-poly para móvil en vertical. Angular 22 + Three.js. El objetivo es hacer el mejor tiempo en cada mapa; el fantasma reproduce tu mejor vuelta.

## Mecánicas (no cambiar sin acordarlo)

- Mantener pulsado (o Espacio) acelera. No hay freno: al soltar se pierde velocidad poco a poco.
- Solo se gira en los cruces. Fuera de ellos, un swipe lateral (o ← →) cambia un carril a ese lado, como en Subway Surfers (~0,2 s, sin dejar de acelerar). Debe sentirse vivo y elástico, como una pelota: muelle que se pasa un poco del carril y rebota, cámara que sigue con retraso, y el coche apunta el morro, se inclina, da un saltito y se aplasta al caer (esto último solo visual). Un swipe = un carril: un deslizamiento largo cuenta una vez y durante el cambio se ignoran otros swipes; para encadenar, parar el dedo un instante o levantarlo.
- Swipe hacia el muro desde el carril pegado a él: golpecito (chispas, conserva el 80 % de la velocidad) y rebota a su carril. No es un choque.
- Curvas de 90° = cruces cuadrados (11 × 11 m con 5 carriles, 6,6 × 6,6 m con 3). La pista son tramos (rectas y arcos) unidos por cruces. En el cruce, el swipe hacia la salida gira el coche 90° (mientras está girado no acelera) y el momento decide el carril de salida: al entrar, carril interior; tarde, exterior; demasiado tarde, choque contra el muro frontal. Girar hacia la salida hasta 1,5 m antes del cruce cuenta como entrar; antes, es un cambio de carril. En el cruce, el swipe hacia el lado cerrado cambia de carril. Ya girado, se ignoran los swipes.
- No hay swipe adelante: el coche sale del cruce ya recto.
- Imán de carril fuerte: con el morro recto el coche se centra en el carril más cercano (como en Race Time). Nunca se queda entre dos carriles.
- Tramos curvos (arcos): el magnetismo empuja hacia el muro exterior; más curvatura, más desvío. Sin acelerar el coche va pegado al suelo (el magnetismo se reduce y no vence al imán de carril); acelerando, en curvas cerradas salta de carril hacia el muro.
- Juego continuo, sin pausas: ningún choque detiene el coche.
- Roce (el magnetismo de un arco o la pared de un embudo pega el coche al muro): no es choque; el rozamiento frena cada vez más (con chispas), y más fuerte en tramos estrechos. Acelerando, el coche sigue pegado a la pared hasta que el jugador cambia de carril (un swipe hacia dentro = el carril de al lado). Soltando el acelerador, el imán lo lleva al carril disponible más cercano.
- Ancho variable: tramos de 5 o 3 carriles (siempre impar: el carril central sigue en el eje). Embudos de 5 a 3 con las dos paredes cerrándose a la vez: abruptos (6-8 m), medios (10-15 m) o largos (20-25 m), con flechas pintadas en los carriles que se cierran y paneles de chevrones. Ensanches de vuelta a 5; el coche se queda en su carril.
- Choque frontal en un cruce: en 0,6 s pivota solo hacia la salida a 10 m/s y sale por el carril exterior. Durante la animación se ignoran los swipes.
- Mapas en dos formatos a comparar: clásicos (cruces sueltos) y zigzag (series de 3 a 8 cruces seguidos con tramos cortos). Cada mapa tiene dos mitades (unos 0,9-1,3 km): la segunda añade embudos, tramos de 3 carriles y cruces estrechos. Los giros alternan derecha/izquierda para que la pista avance en escalera y no se cruce.
- Sin ventana de tolerancia en el swipe adelante (posible mejora con el modo online).
- 5 carriles (3 en los tramos estrechos), cámara tipo Subway Surfers algo alejada, brillo en el escape al acelerar.
- Sonido: música en bucle durante la carrera; el motor suena solo al acelerar, por debajo de la música, con volumen y vueltas según la velocidad. Archivos en `public/audio/` (ver su README); sin ellos, silencio.

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
