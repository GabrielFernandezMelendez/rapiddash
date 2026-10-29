# RapidDash

Juego de carreras 3D low-poly para móvil en vertical, hecho con Angular 22 y Three.js.
Elige un mapa, espera al semáforo y haz el mejor tiempo. Tu mejor vuelta queda como fantasma.

## Controles

| Acción | Móvil | Ordenador |
| --- | --- | --- |
| Acelerar | Mantener pulsado | Espacio |
| Girar 90° | Deslizar a izquierda o derecha | ← → |
| Enderezar | Deslizar hacia arriba | ↑ |

## Desarrollo

```bash
npm install
npm start               # http://localhost:4200
npm run start:movil     # desde el móvil en la misma wifi: http://<IP-del-PC>:4200
npm test -- --watch=false
npm run build
```

La arquitectura (hexagonal + atomic design) y las convenciones están en [CLAUDE.md](CLAUDE.md).
