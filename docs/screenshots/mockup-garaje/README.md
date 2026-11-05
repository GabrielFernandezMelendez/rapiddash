# Showroom retrowave (prueba visual)

Material de validación de la rama `mockup/garaje-v4`. **No está pensado para mergear en `main`**: la ruta
`/mockup-garage` es un laboratorio para elegir diseños, no forma parte del juego.

## Qué hay

- **10 recoloreados** del deportivo Retro que ya existe en `synthwave/vehicles.ts`. La silueta es la misma;
  solo cambia la pintura y se mantienen lunas, pilotos, llantas y luz de bajos.
- **10 propuestas nuevas** con la misma filosofía low-poly: perfil lateral extruido, aristas de neón,
  cabina oscura, faros, pilotos y detalles de los 80/90.

Los coches conservan la convención del juego: morro hacia `-Z`, ruedas a `±0,74 m` y escala real, para poder
llevar cualquier diseño al render sin tocar la física.

## Cómo verlo

```bash
npm start
```

Abrir <http://localhost:4200/mockup-garage>. Con las flechas `←` `→` se cambia de coche.

Espacio (o el botón) acelera para ver el efecto elegido. Para generar capturas sin interfaz:
`?car=N&shot=1&turn=0` (frontal) o `turn=3.1416` (trasera); efectos con
`?car=1&shot=1&wide=1&turn=1.2&accel=1&fx=1..10`.

## Detalles añadidos a todos los coches

Llantas con banda de rodadura, disco y pinza de freno de color neón, cinco radios y buje con tuercas;
retrovisores con espejo, reflejos en las lunas laterales, línea de puerta con tirador, matrículas «RD·88»
delante y detrás, y halo suave en faros y pilotos.

## 10 efectos al acelerar

![10 efectos al acelerar](contact-efectos.jpg)

| # | Efecto | Qué es |
| --- | --- | --- |
| 1 | Escape clásico | El resplandor y las brasas del juego de ahora |
| 2 | Chispas | Chispas que saltan del bajo, caen y rebotan en el asfalto |
| 3 | Cinta cian | Una tela de neón ancha que sale del techo y ondea detrás |
| 4 | Cintas gemelas | Dos cintas finas, rosa y cian, que salen de los pilotos |
| 5 | Bandera synthwave | Cinco franjas del atardecer ondeando juntas |
| 6 | Muro de luz | Estela recta y sólida, como una moto de luz |
| 7 | Caritas | Emoticonos felices que salen botando del escape |
| 8 | Derrape | Humo de rueda quemada que se abre y se queda atrás |
| 9 | Píxeles | Cubitos de 8 bits que caen y se apagan a saltos |
| 10 | Rayos | Descargas eléctricas entre los escapes y el suelo |

Las cintas crecen al acelerar y se recogen poco a poco al soltar; ondean más cuanto más lejos del coche.

## Recoloreados

![10 recoloreados del Retro](contact-retro.jpg)

## Propuestas nuevas

### Vista frontal

![10 propuestas retrowave, vista frontal](contact-nuevos-front.jpg)

### Vista trasera

![10 propuestas retrowave, vista trasera](contact-nuevos-rear.jpg)

## Detalle por modelo

| Modelo | Frontal | Trasera |
| --- | --- | --- |
| **11 · Comet GT** | <img src="11-comet-gt-front.jpg" width="360"> | <img src="11-comet-gt-rear.jpg" width="360"> |
| **12 · Night Shade** | <img src="12-night-shade-front.jpg" width="360"> | <img src="12-night-shade-rear.jpg" width="360"> |
| **13 · Mirage Turbo** | <img src="13-mirage-turbo-front.jpg" width="360"> | <img src="13-mirage-turbo-rear.jpg" width="360"> |
| **14 · Vortex LM** | <img src="14-vortex-lm-front.jpg" width="360"> | <img src="14-vortex-lm-rear.jpg" width="360"> |
| **15 · Sunset Van** | <img src="15-sunset-van-front.jpg" width="360"> | <img src="15-sunset-van-rear.jpg" width="360"> |
| **16 · Outlaw 4x4** | <img src="16-outlaw-4x4-front.jpg" width="360"> | <img src="16-outlaw-4x4-rear.jpg" width="360"> |
| **17 · Venom 88** | <img src="17-venom-88-front.jpg" width="360"> | <img src="17-venom-88-rear.jpg" width="360"> |
| **18 · Chrome Drift** | <img src="18-chrome-drift-front.jpg" width="360"> | <img src="18-chrome-drift-rear.jpg" width="360"> |
| **19 · Moon Runner** | <img src="19-moon-runner-front.jpg" width="360"> | <img src="19-moon-runner-rear.jpg" width="360"> |
| **20 · Solaris X** | <img src="20-solaris-x-front.jpg" width="360"> | <img src="20-solaris-x-rear.jpg" width="360"> |

También están las 40 capturas individuales (frontal y trasera de cada coche) en esta misma carpeta.
