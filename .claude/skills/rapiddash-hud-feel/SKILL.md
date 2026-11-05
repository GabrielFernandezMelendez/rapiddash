---
name: rapiddash-hud-feel
description: Reglas de estilo y de «juice» de RapidDash para el HUD y cualquier pantalla o elemento animado nuevo (barras, medallas, rankings, avisos). Úsala antes de tocar la interfaz del juego.
---

# RapidDash · HUD con vida

La interfaz tiene que sentirse viva, como el coche: nada aparece ni cambia de golpe. Todo lo que
se mueve reacciona al juego (velocidad, choques, cambios de carril, fantasma, medallas), con
muelles y brillos synthwave. Referencia: `src/app/ui/organisms/hud/` y
`src/app/ui/molecules/medal-league/`.

## Principios

1. **Muelle antes que transición lineal.** Los números y las posiciones siguen un muelle con un
   pequeño rebote (`Spring` de `hud.ts`: rigidez ~0,12-0,16, amortiguación ~0,6-0,7 por
   fotograma). Para entradas en CSS: `cubic-bezier(0.2, 1.6, 0.4, 1)` (se pasa un poco y vuelve).
2. **Cada evento del juego tiene su gesto**, corto (0,3-0,7 s) y que no tapa la carretera:
   - choque: sacudida del HUD entero (0,45 s);
   - cambio de carril: el HUD se inclina 1-2° y vuelve con muelle;
   - vuelta: el tiempo da un golpe de escala y brilla;
   - fantasma: la píldora estalla al cambiar de signo; al ponerse por delante, «¡Por delante!»;
   - medalla nueva: la moneda entra con golpe, giro y una explosión de chispas.
3. **Las barras nunca están quietas.**
   - Relleno con franjas diagonales que corren (`repeating-linear-gradient` + `background-position`).
   - Punta viva: un orbe que late (`scale` 0,8 ↔ 1,3) y chispas que salen hacia atrás en abanico
     (9 chispas de 5-6 px, 0,5-0,7 s, con retrasos negativos escalonados para que sea continuo).
   - Urgencia (últimos segundos, objetivo a punto de escaparse): el orbe late más rápido y la
     barra palpita con su color. Si ya no llega: se apaga (opacidad 0,45 + escala de grises) y ✕.
   - La velocidad son 24 segmentos del amarillo al rosa (no cambiar a barra continua), con un
     margen del 9 % a cada lado. A tope y acelerando: laten en ola y la punta «rompe» el límite
     (orbe rojo, anillo que se abre y 20 chispas rojas alargadas disparadas hacia fuera, a la
     derecha y en abanico de ±50°, más allá de la barra; nunca por encima de los segmentos).
4. **Brillo con el color de la cosa**, nunca blanco genérico: `box-shadow` y `text-shadow` con
   `color-mix(in srgb, var(--c) 30-60 %, transparent)`.
5. **Inclinación synthwave:** barras y cápsulas con `skewX(-12deg)` (velocidad `-18deg`) y textos
   de títulos en cursiva (`--rd-display-style`).
6. **Entrar en escena:** listas que entran una tras otra (deslizan 40 px con 0,05 s de retraso
   entre filas); resúmenes que suben con rebote.

## Colores

- Tokens globales en `src/styles.scss` (`:root`). Los componentes solo usan tokens.
- Medallas: `--rd-medal-bronze`, `--rd-medal-silver`, `--rd-medal-gold`, `--rd-medal-platinum`.
  Patrón: `[data-medal='gold'] { --c: var(--rd-medal-gold); }` y todo lo demás tira de `--c`.
  El platino va irisado (degradado cian → rosa → amarillo que corre o `hue-rotate`).
- Rankings: cada piloto, apodo, tiempo y cápsula del color de su liga (degradado de izquierda a
  derecha al 20 % → 6 % y borde fino al 18 %); mi fila al 38 % con marca a la izquierda y brillo.
- Neón de apoyo: rosa `#ff4fd8`, cian `#2de2e6`, amarillo `#ffd319`, rojo `#ff2a6d`.

## Límites

- **Nunca tapar la carretera ni el coche.** El HUD vive arriba (tiempo, medallas) y abajo
  (velocidad); los avisos del centro son breves y sin fondo opaco.
- **«Reducir movimiento»** (`prefers-reduced-motion`): sin sacudidas, sin inclinación, sin chispas
  ni brillos que corren; los cambios siguen pasando pero sin animación.
- `pointer-events: none` en todo lo decorativo del HUD.
- Animaciones con `transform`, `opacity`, `filter` y `background-position` (nada que obligue a
  recolocar la página); muchos elementos pequeños mejor con CSS que con JS.
- Textos por i18n (`public/i18n/es.json` y `en.json`), tiempos con `formatTime`.
- Cambios visuales: primero mockup (capturas o vídeo) y aprobación de Gabriel, después PR con
  capturas en `docs/screenshots/`.

## Cómo comprobarlo

- `npm start` y, con el modo debug activado (7 toques en la versión en Ajustes):
  `/race/<mapa>?daily=1&auto=1&best=52&demo=1` conduce solo y enseña fantasma, medallas y urgencia.
- Para grabar: Playwright con `recordVideo`; recorta la zona del HUD con ffmpeg.
