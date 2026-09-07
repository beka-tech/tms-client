import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { SKIP_AUTH } from '../http-context';
import { AuthService } from '../../auth/auth.service';

function authorizedRequest<T>(request: HttpRequest<T>, token: string | null): HttpRequest<T> {
  return token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
}

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_AUTH)) return next(request);

  const auth = inject(AuthService);
  const router = inject(Router);
  const initialRequest = authorizedRequest(request, auth.getAccessToken());

  return next(initialRequest).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      if (!auth.getRefreshToken()) {
        auth.expireSession();
        void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        return throwError(() => error);
      }

      return auth.refreshSession().pipe(
        catchError((refreshError: unknown) => {
          auth.expireSession();
          void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
          return throwError(() => refreshError);
        }),
        switchMap((accessToken) =>
          next(authorizedRequest(request, accessToken)).pipe(
            catchError((retryError: unknown) => {
              if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
                auth.expireSession();
                void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
              }
              return throwError(() => retryError);
            }),
          ),
        ),
      );
    }),
  );
};
