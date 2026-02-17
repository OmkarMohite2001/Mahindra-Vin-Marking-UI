import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';

function isDesktopRuntime(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const isMobileUa =
    /android|iphone|ipad|ipod|windows phone|mobile|blackberry|opera mini/i.test(ua);
  const isNarrowScreen = window.innerWidth < 1024;

  return !(isMobileUa || isNarrowScreen);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(),
    ReactiveFormsModule,
    BrowserModule,
    provideAnimations(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && isDesktopRuntime(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
