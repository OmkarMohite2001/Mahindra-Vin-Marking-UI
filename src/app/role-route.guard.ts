import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getFirstAllowedPath, hasRoleAccess, normalizeRole, UserRole } from './role-access';

export const roleRouteGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (!token) {
    return router.createUrlTree(['/login']);
  }

  const role = normalizeRole(localStorage.getItem('role'));
  const allowedRoles = route.data?.['roles'] as readonly UserRole[] | undefined;

  if (hasRoleAccess(role, allowedRoles)) {
    return true;
  }

  return router.createUrlTree([getFirstAllowedPath(role)]);
};
