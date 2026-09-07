import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { normalizeUserRole, UserRole } from '../auth.model';
import { AuthStateService } from '../auth-state.service';
import { GlobalMessageService } from '../../notifications/global-message.service';

export const roleGuard = (...acceptedRoles: readonly string[]): CanActivateFn => {
  const roles = acceptedRoles.map(normalizeUserRole) as UserRole[];

  return (_route, state) => {
    const auth = inject(AuthStateService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    if (auth.hasAnyRole(...roles)) return true;

    inject(GlobalMessageService).warning('Your account does not have access to that area.');
    return router.createUrlTree(['/dashboard']);
  };
};

export const studentGuard = roleGuard('Student');
export const instructorGuard = roleGuard('Instructor', 'Administrator');
export const adminGuard = roleGuard('Administrator');
