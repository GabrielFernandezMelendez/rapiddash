# RapidDash

Juego de carreras 3D low-poly para móvil en vertical. Angular 22 + Three.js. El objetivo es hacer el mejor tiempo en cada mapa; el fantasma reproduce tu mejor vuelta.

## Mecánicas (no cambiar sin acordarlo)

- Mantener pulsado (o Espacio) acelera. No hay freno: al soltar se pierde velocidad poco a poco. Se puede jugar con un dedo (mantener y deslizar) o con dos: uno quieto acelerando y el otro haciendo los swipes (`FingerTracker`; un tercer dedo se ignora).
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
- Mapas de ida en dos formatos a comparar: clásicos (cruces sueltos) y zigzag (series de 3 a 8 cruces seguidos con tramos cortos). Cada mapa tiene dos mitades (unos 0,9-1,3 km): la segunda añade embudos, tramos de 3 carriles y cruces estrechos. Los giros alternan derecha/izquierda para que la pista avance en escalera y no se cruce.
- Circuitos por vueltas (grupo «Por vueltas»): 9 circuitos cerrados de 3 vueltas (curvas abiertas y en S en vez de rectas largas, embudos frecuentes y varios cruces de 90°) (`CIRCUIT_LAPS`) que se terminan en 30-60 s. Cada mapa es una vuelta en sentido horario (los giros suman 360°) que acaba en una recta hasta la salida; `Track.circuit` repite los tramos en cada vuelta (misma geometría, el rumbo suma 360° por vuelta) y une la última recta con la primera. Salida y meta en la misma línea (`START_LINE`); la carrera cuenta la vuelta y guarda el tiempo de cada una. Se dibuja una sola vuelta. En carrera: la vuelta en el HUD («VUELTA 2/3»); al cruzar la línea, un cartel en el centro («VUELTA 2/3», «ÚLTIMA VUELTA») con la letra del «DASH» del logo (tokens `--rd-dash-*`), el tiempo de la vuelta y la diferencia con el fantasma en esa vuelta; «¡META!» 1,3 s antes de los resultados, que muestran las 3 vueltas con la mejor marcada. El mapa del día sale solo de los circuitos, y los tres días de cada torneo nuevo también. `race-map.spec.ts` comprueba que cierran y no se pisan; el piloto automático los termina en 30-60 s.
- Circuitos con colinas (`terrain` en el mapa): Anillo del Cañón, Gran Premio de la Cumbre y Óvalo del Faro repetidos con relieve («· Colinas», ranking propio). Solo visual: la física es la del llano (subir o bajar no cambia la velocidad). La carretera sube y baja con la vuelta (ondas que cierran en la salida, sin peralte); fuera, el suelo sigue su altura, se levanta en lomas y lejos vuelve al llano (`core/domain/track/terrain.ts`; `terrain-mesh.ts` lo aplica a todo el mundo estático: lo grande o plano se deforma, lo pequeño y de pie se sube entero; el suelo se hunde un poco bajo la carretera). Coche y fantasma se inclinan con la pendiente y la cámara sube y baja con ellos. Los carteles con la foto van 120 m más lejos, más grandes (scale 10) y más altos que las lomas. Entran en el mapa del día desde `dailyFrom` (2026-11-06, para no cambiar el de hoy) y en los torneos nuevos.
- Mapas de prueba (`EXPERIMENTAL_MAPS`, `experimental: true`, grupo «Pruebas» en Todos los mapas): Anillo del Cañón · Mini planeta, Óvalo del Faro · Tubo y Gran Premio de la Cumbre · Montaña rusa. Mismo trazado y física que su circuito y ranking propio; nunca salen como mapa del día ni en torneos. Planeta y tubo doblan el mundo alrededor de la cámara en el shader (`TerrainSpec.curve`, `render/three/world-curve.ts`: el planeta curva el horizonte hacia abajo, el tubo enrolla los lados hacia arriba hasta 160°; el cielo no se dobla). La montaña rusa es relieve de 36 m con una onda por vuelta (`TerrainSpec.waves`). Pendientes de que se elija cuál se queda.
- Sin ventana de tolerancia en el swipe adelante (posible mejora con el modo online).
- 5 carriles (3 en los tramos estrechos), cámara tipo Subway Surfers algo alejada, brillo en el escape al acelerar.
- Estética única: retro synthwave (el clásico y el futurista se quitaron). Mundo 3D con cielo violeta, sol a franjas, montañas en alambre, rejilla y muros de neón (una paleta por mapa) y el deportivo de los 80. Fuentes: portada Russo One + Mr Dafoe, menús Kanit, carrera Audiowide + Chakra Petch (en `index.html`).
- Cuentas (online): se entra con Google, con correo y contraseña (con verificación) o solo con apodo (invitado anónimo de Firebase). Perfil público = apodo único (3-16 letras o números) + país con bandera; sin nombre ni apellidos. A los invitados se les recuerda vincular la cuenta cada 5 días; vincular conserva el piloto.
- Ranking online: top 10 mundial por mapa (con la física actual) con bandera y apodo, y mi zona (el de justo encima y yo) si no salgo. Antes de correr se elige rival: el 1.º, el de justo encima o tu mejor vuelta (por defecto el de encima; sin tiempo, el 10.º; si eres el 1.º, tu mejor; se recuerda por mapa). El fantasma del rival lleva su bandera y apodo encima hasta los 3 s. En la meta: puesto mundial, puestos que subes y siguiente rival («Repetir» corre contra él). Cambiar apodo o país actualiza los récords subidos: los de los mapas al momento, y los del mapa del día (hoy y ayer) y de los días de mis torneos también al arrancar cada sesión. La clasificación del torneo usa el apodo y el país del récord más reciente de cada piloto (el torneo guarda los de cuando se unió) y los míos, siempre los del perfil.
- Mapa del día: el mismo para todos, cambia a medianoche de España y rota entre los circuitos por vueltas. Ranking propio (`daily-AAAA-MM-DD`, como un mapa más) y copa por tercios. Antes de correr se elige rival como en los mapas, del ranking de hoy (el 1.º, el de justo encima o tu mejor de hoy; la elección se recuerda para los días siguientes; «Repetir» sigue contra el mismo): oro, plata o bronce con el puesto. Intentos (no se muestran): 2 gratis al día; al gastarlos, ventana centrada para esperar 3 h (2 más) o ver un anuncio (3 más; sin anuncios todavía, `NoAdsAdapter` los da directamente). Un intento se gasta al empezar la carrera. Un récord del día que mejore el del mapa cuenta también en su ranking.
- Torneos (online): de 3 días y hasta 20 pilotos (puntúan los 10 primeros de cada día). Se crean con nombre y se invita con código de 6 caracteres o enlace (`/t/CODIGO`, Copiar o Compartir). Lo empieza el creador (mínimo 2); con el enlace se puede entrar en cualquier momento hasta que acabe (también ya empezado: la clasificación en curso muestra el código para invitar); al empezar se sortea un circuito por vueltas distinto para cada día. Carreras ilimitadas: cuenta el mejor tiempo del día (ranking `t-CODIGO-dN`, que también mejora el del mapa). En la clasificación en curso se elige rival como en el mapa del día, del ranking del día del torneo (el 1.º, el de justo encima o tu mejor de hoy; se recuerda para todos los torneos; «Repetir» sigue contra el mismo). Puntos por día 15-12-10-8-7-6-5-4-3-2; el empate lo rompen los días ganados. Pantallas: Mis torneos, sala de espera y clasificación con los días (los terminados muestran al ganador); la clasificación muestra los puntos de los días ya empezados, el total y, al lado, la columna «Tiempo» con el del día en curso (o del último, si ya acabó). El creador puede eliminarlo: en Mis torneos, deslizando la tarjeta a la izquierda aparece una papelera a la derecha y una ventana pide confirmación (foco en «Cancelar»); se borran el torneo y las fotos de su cartel.
- Carteles de líderes: detrás del muro frontal de hasta 2 cruces por mapa (uno por mitad, el de la recta de llegada más larga, nunca el primero), un panel grande con el 1.º y otro menor con el 2.º (bandera, apodo y marca). En torneo, sus puntos («Líder · nombre del torneo»); en el mapa, el ranking mundial; en el mapa del día, el del día. Sin tiempos: «¿Serás el primero?»; sin red, no salen. Son decoración: no cambian la física.
- Cartel con foto del líder (solo en torneos): tres o cuatro por mapa (se quita el que queda justo enfrente de la salida, porque en synthwave lo tapa el sol), enormes (56 × 64 m), curvados hacia el que llega como una pantalla de estadio, sobre dos postes y sin niebla, con el borde de abajo a 12 m (más alto que la cámara: siempre por encima del horizonte, así que se pintan encima de árboles, palmeras y montañas sin tapar nunca la carretera) (`distantPhotoSpots`: fuera de la carretera, a 250-600 m del final de las rectas más largas, en su prolongación o poco desviados para verse de frente al ir por ella; al menos a 60 m de la carretera y a 150 m entre ellos; la cámara ve hasta 900 m); todos con una línea arriba con bandera, apodo y puntos y la foto grande debajo (sin foto, su bandera). Al ir 1.º sin foto, la pantalla del torneo lo ofrece una vez por torneo (pregunta → cámara frontal → usar o repetir; «Ahora no», Cancelar y Escape siempre; sin cámara o sin permiso, galería). Yendo 1.º, botón de cámara abajo a la izquierda para cambiarla o quitarla. La pantalla del torneo descarga ya la foto del líder y la carrera usa la clasificación y la foto guardadas, así que los carteles salen desde el semáforo. Foto cuadrada de 256 px en JPEG en `tournaments/{código}/photos/{uid}`: solo la ven los miembros.
- Garaje (botón de media anchura en la portada, `/garage`): escena con el coche girando en su plataforma y dos pestañas, Coches y Efectos. Tocar algo lo enseña; si está abierto, queda elegido (se guarda en el móvil, `rapiddash.garage`, y sobrevive al reinicio de datos). 20 coches (1-10, el deportivo retro con otra pintura; 11-20, modelos nuevos) más «De serie» (el deportivo synthwave; el fantasma siempre es este). 10 efectos al acelerar: 1 escape clásico (el `ExhaustFx` de siempre), 2 chispas, 3 cinta cian, 4 cintas gemelas, 5 bandera synthwave, 6 muro de luz, 7 caritas, 8 derrape, 9 píxeles, 10 rayos (`garage/garage-fx.ts`: las cintas son telas de neón que crecen al acelerar y se recogen al soltar; las partículas se quedan atrás a la velocidad del coche). Abiertos sin debug: De serie, Morado Synthwave y Escape clásico; el resto, con candado (`core/domain/garage`). «Mantén para acelerar» (o Espacio) enseña el efecto.
- Modo debug: tocar 7 veces seguidas la versión al pie de Ajustes (`DEBUG_TAPS`, menos de 1,5 s entre toques). Abre todos los coches y efectos y muestra en Ajustes la sección Debug con «Todos los mapas» (la pantalla de elegir mapa, que ya no tiene botón en la portada) y «Quitar el modo debug» (`rapiddash.debug`). Al quitarlo, lo elegido que estaba cerrado vuelve a lo de serie.
- Tutorial «Cómo se juega» (5 pasos: acelerar, carriles, cruces, embudos y rival, con una animación en bucle cada uno): sale antes de la primera carrera (el semáforo espera) y desde Ajustes → Ayuda.
- Sonido: en cada carrera (y al repetir) suena una canción synthwave al azar, sin repetir la anterior; cada canción tiene segundo de inicio y de bucle. El motor suena solo al acelerar, por debajo de la música: un zumbido en bucle que sube de tono con la velocidad. Archivos en `public/audio/` y lista en `core/domain/audio/soundtrack.ts` (ver el README de audio); sin ellos, silencio. En los menús suena una canción de la misma lista (desde el primer toque). En Ajustes → Sonido, dos sliders (música y efectos, 0-100 %) que se guardan en el móvil: la música del menú cambia al momento y el de efectos suena un ejemplo del motor al soltarlo. Un solo `AudioPort` para toda la app (el audio desbloqueado en el menú sirve en la carrera).

## Arquitectura hexagonal

```
src/app/
  core/domain/          Reglas puras: pista, coche, carrera, fantasma. Sin Angular, sin Three, sin DOM.
  core/application/     Puertos (clases abstractas en ports/out) y casos de uso (RaceSession).
  infrastructure/       Adaptadores: render/three, input (táctil + teclado), audio, clock, persistence, firebase.
  infrastructure/di/    Único sitio donde se enlaza puerto → adaptador.
  ui/                   Angular con atomic design: atoms → molecules → organisms → templates → pages.
  shared/               i18n, formateo, garaje y cuenta (servicios con signals sobre los casos de uso).
```

Reglas de dependencia:
- `core/domain` no importa nada fuera de sí mismo.
- `core/application` solo importa `core/domain`.
- `infrastructure` implementa puertos; nunca la importan `core` ni los componentes de `ui` (salvo `infrastructure/di` desde las páginas o `app.config`).
- Los puertos son clases abstractas: sirven de token de DI sin acoplar el núcleo a Angular.
- Firebase solo vive en `infrastructure/firebase` y se carga de forma diferida (adaptadores Lazy*/Cached*): el arranque no lo descarga.
- Three.js solo vive en `infrastructure/render/three` y se carga de forma diferida con la página de carrera (y con el fondo 3D del menú).
- Estética: tokens CSS en `:root` de `styles.scss` (los componentes solo usan tokens) y, en 3D, el mundo de `render/three/synthwave/`.

Atomic design:
- atoms: piezas sin lógica (botón, luz, estadística).
- molecules: combinan átomos (semáforo, tarjeta de mapa, modal, top 10).
- organisms: bloques con sentido propio (HUD, cuenta atrás, diálogos, resultados).
- templates: maquetación con huecos `ng-content`.
- pages: conectan con puertos, router y casos de uso.

## Convenciones

- Tiempos siempre con `formatTime` (milésimas: «0:38.624»; sin tiempo, `NO_TIME`), en el HUD, los rankings, los resultados y los carteles.

- Componentes standalone, `ChangeDetectionStrategy.OnPush`, signals (`input()`, `output()`, `signal`, `computed`).
- Prefijo de selector `rd-`.
- Comentarios en español durante el desarrollo; la traducción al inglés es un paso final.
- Textos de la interfaz siempre por i18n: `public/i18n/es.json` y `en.json` con las mismas claves. Pipe `t`.
- Toda lógica de juego nueva lleva test en `core/domain` (Vitest). `autopilot.spec.ts` demuestra que cada mapa se termina sin choques: si cambias física o mapas, debe seguir pasando.
- Si cambias la física o el trazado de un mapa, sube `PHYSICS_VERSION` (`core/domain/race/physics-version.ts`): los récords de otra versión no se comparan y se reinician.

## Flujo de trabajo

- `main` solo cambia mediante pull request.
- Ramas por área, de larga duración (se reutilizan; no se borran al mergear):
  - `feat/pista`: trazado, anchos, cruces y mapas.
  - `feat/conduccion`: controles, física del coche y choques.
  - `feat/sonido`: música y efectos.
  - `feat/interfaz`: pantallas, HUD, ajustes e i18n.
  - `chore/infra`: CI, Firebase, dependencias y documentación del proceso.
  - `feat/online`: cuentas, perfil, récords en la nube, fantasmas de otros, duelos y temporadas.
  Si un trabajo no encaja en ninguna, se acuerda un área nueva antes de crearla.
- Antes de cada bloque de trabajo, poner la rama al día: `git checkout feat/pista && git pull origin main`.
- Títulos de PR con el área delante: `Pista: embudos de 5 a 3 carriles`.
- Commits convencionales en español: `feat(domain): giro de 90°`. Cada commit es un checkpoint.
- PRs pequeñas, de un tema. Descripción: qué cambia, por qué y cómo probarlo.
- Cambios visuales: primero mockup y aprobación, después PR con capturas.
- CI (GitHub Actions) compila y pasa los tests en cada PR.
- Probar una PR en local: `gh pr checkout <n> && npm run start:movil`.
- Despliegue: cada PR se publica en una URL de prueba (el bot de Firebase la comenta en la PR); cada merge en `main` publica en https://rapiddash-gabo.web.app.
- Las PRs van siempre contra `main`, sin encadenarlas.
- Si se borran los datos de la nube (usuarios, tiempos), sube `DATA_RESET_VERSION` (`core/domain/settings/data-reset.ts`): al abrir la versión nueva, cada móvil olvida su piloto, sus récords locales y la sesión de Firebase (conserva idioma, volumen, tutorial y garaje). Orden: primero merge y publicación, después el borrado en Firebase.
- Reglas e índices de Firestore en `firestore.rules` y `firestore.indexes.json`; no los despliega el CI: `npx -y firebase-tools@latest deploy --only firestore --project rapiddash-gabo`.
- Skills de Firebase en `.agents/skills/`: leer la que toque (hosting, firestore, auth, reglas) antes de trabajar con Firebase.

## Comandos

- `npm start`: servidor en http://localhost:4200 (en el PC: Espacio y flechas).
- `npm run start:movil`: accesible desde el móvil en la misma wifi.
- `npm test -- --watch=false`: tests.
- `npm run build`: build de producción.
