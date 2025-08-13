import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';
// import { AppModularModule } from './app/app-modular.module';
// import { AppMultiExportersModule } from './app/app-multi-exporters.module';

// For now, only use the default AppModule to avoid multiple declarations
// Choose which module to bootstrap based on URL parameter or environment
// const urlParams = new URLSearchParams(window.location.search);
// const moduleType = urlParams.get('module') || 'default';

let moduleToBootstrap = AppModule;
console.log('Bootstrapping with Configuration-Based Module');

// let moduleToBootstrap;
// switch (moduleType) {
//   case 'modular':
//     moduleToBootstrap = AppModularModule;
//     console.log('Bootstrapping with Modular Exporters Module');
//     break;
//   case 'multi':
//     moduleToBootstrap = AppMultiExportersModule; 
//     console.log('Bootstrapping with Multiple Exporters Module');
//     break;
//   default:
//     moduleToBootstrap = AppModule;
//     console.log('Bootstrapping with Configuration-Based Module');
//     break;
// }

platformBrowserDynamic()
  .bootstrapModule(moduleToBootstrap)
  .catch(err => console.error(err));
