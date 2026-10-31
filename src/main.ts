import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { resetLocalDataIfNeeded } from './app/infrastructure/persistence/local/local-data-reset';

// Antes de arrancar: si se han borrado los datos de la nube, el móvil también olvida los suyos
resetLocalDataIfNeeded()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
