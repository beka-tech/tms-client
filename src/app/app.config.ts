import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

import { provideRouter, withComponentInputBinding } from '@angular/router';

import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';

import { routes } from './app.routes';
import { credentialsInterceptor } from './core/http/interceptors/credentials.interceptor';
import { jwtInterceptor } from './core/http/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/http/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),

    provideRouter(routes, withComponentInputBinding()),

    provideHttpClient(
      withInterceptors([credentialsInterceptor, errorInterceptor, jwtInterceptor]),

      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
    ),
  ],
};
