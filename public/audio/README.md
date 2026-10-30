# Sonidos de la carrera

Si falta un archivo, esa parte de la carrera queda en silencio. La lista de canciones, sus segundos
de inicio y de bucle y el motor de cada estética están en `src/app/core/domain/audio/soundtrack.ts`.

## Música

En cada carrera (también al pulsar «Repetir») suena una canción al azar de la estética, sin repetir
la anterior. Empieza en «Inicio» y, al llegar al final, vuelve a «Bucle desde».

| Archivo | Estética | Inicio | Bucle desde | Origen |
| --- | --- | --- | --- | --- |
| `music/classic/tea-tyme.mp3` | Clásico | 0 s | 0 s | [Tea Tyme (Pixabay)](https://pixabay.com/sound-effects/musical-tea-tyme-19814/) |
| `music/classic/future-beat-619128.mp3` | Clásico | 0 s | 0 s | Pixabay |
| `music/classic/sport-sports-rock-music-622904.mp3` | Clásico | 3 s | 3 s | Pixabay |
| `music/classic/jazz-music-619412.mp3` | Clásico | 8 s | 10 s | Pixabay |
| `music/synth/circuit-synthwave-alt-23844.mp3` | Retro y futurista | 0 s | 0 s | Pixabay |
| `music/synth/80s-synthwave-vibe-loop-22508.mp3` | Retro y futurista | 28 s | 28 s | Pixabay |
| `music/synth/forgotten-melody-cassette-retrowave-beat-411173.mp3` | Retro y futurista | 8 s | 8 s | Pixabay |

## Motor

Suena solo al acelerar, por debajo de la música; el volumen sigue a la velocidad.

| Archivo | Estética | Cómo suena | Origen |
| --- | --- | --- | --- |
| `engine/classic.mp3` | Clásico | Subida de vueltas: arranca en el punto de la velocidad actual | [Audi V8 acceleration (Pixabay)](https://pixabay.com/sound-effects/city-audi-v8-acceleration-sound-6067/) |
| `engine/retro.mp3` | Retro | Bucle entero; el tono sube con la velocidad | Spacecraft engine loop 01 (Pixabay) |
| `engine/futurist.mp3` | Futurista | Bucle entero; el tono sube con la velocidad | Spacecraft engine loop 01 (Pixabay) |

Licencia de contenido de Pixabay: uso gratuito, sin atribución obligatoria. Las canciones se
guardan a 128 kbps para que carguen rápido en el móvil.

Para añadir una canción: copiarla en `music/classic/` o `music/synth/` y añadir una línea en
`soundtrack.ts` con su archivo, segundo de inicio y segundo de bucle.
