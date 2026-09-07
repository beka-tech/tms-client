import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SILENT_API_ERRORS } from '../http-context';
import { GlobalMessageService, apiErrorMessage } from '../../notifications/global-message.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const messages = inject(GlobalMessageService);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!request.context.get(SILENT_API_ERRORS)) messages.error(apiErrorMessage(error));
      return throwError(() => error);
    }),
  );
};
