# Sonidos de la carrera

Si falta un archivo, esa parte de la carrera queda en silencio. La lista de canciones, sus segundos
de inicio y de bucle y el motor están en `src/app/core/domain/audio/soundtrack.ts`.

## Música

En cada carrera (también al pulsar «Repetir») suena una canción al azar, sin repetir la anterior.
Empieza en «Inicio» y, al llegar al final, vuelve a «Bucle desde». Los menús usan la misma lista.

| Archivo | Inicio | Bucle desde | Origen |
| --- | --- | --- | --- |
| `music/synth/circuit-synthwave-alt-23844.mp3` | 0 s | 0 s | Pixabay |
| `music/synth/80s-synthwave-vibe-loop-22508.mp3` | 28 s | 28 s | Pixabay |
| `music/synth/forgotten-melody-cassette-retrowave-beat-411173.mp3` | 8 s | 8 s | Pixabay |

## Motor

Suena solo al acelerar, por debajo de la música; el volumen sigue a la velocidad.

| Archivo | Cómo suena | Origen |
| --- | --- | --- |
| `engine/retro.mp3` | Bucle entero; el tono sube con la velocidad | Spacecraft engine loop 01 (Pixabay) |

## Efectos

Suenan una vez, con el volumen de efectos de Ajustes. La lista está en `soundtrack.ts`.

| Archivo | Cuándo suena |
| --- | --- |
| `soundeffects/video-game-bonus-323603.mp3` | Al coger el cubo azul del mapa del día |

Licencia de contenido de Pixabay: uso gratuito, sin atribución obligatoria. Las canciones se
guardan a 128 kbps para que carguen rápido en el móvil.

Para añadir una canción: copiarla en `music/synth/` y añadir una línea en `soundtrack.ts` con su
archivo, segundo de inicio y segundo de bucle.
