import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../auth-state.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStateService);
  if (auth.isAuthenticated()) return true;

  return inject(Router).createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
