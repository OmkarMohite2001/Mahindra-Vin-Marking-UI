export type UserRole = 'Admin' | 'Operator';

export interface NavItemAccess {
  path: string;
  label: string;
  icon: string;
  roles: readonly UserRole[];
}

export const APP_NAV_ITEMS: readonly NavItemAccess[] = [
  {
    path: '/app/excel-upload',
    label: 'EXCEL UPLOAD',
    icon: 'backup',
    roles: ['Admin'],
  },
  {
    path: '/app/marking',
    label: 'MARKING',
    icon: 'precision_manufacturing',
    roles: ['Admin', 'Operator'],
  },
  {
    path: '/app/dashboard',
    label: 'DASHBOARD',
    icon: 'dashboard',
    roles: ['Admin', 'Operator'],
  },
  {
    path: '/app/settings',
    label: 'SETTINGS',
    icon: 'settings',
    roles: ['Admin',],
  },
  {
    path: '/app/serialTerminal',
    label: 'Serial Terminal',
    icon: 'code',
    roles: ['Admin'],
  },
  {
    path: '/app/reports',
    label: 'REPORTS',
    icon: 'description',
    roles: ['Admin'],
  },
  {
    path: '/app/vehicle-images',
    label: 'VEHICLE IMAGES',
    icon: 'image',
    roles: ['Admin'],
  },
  {
    path: '/app/user-management',
    label: 'USER MANAGEMENT',
    icon: 'people',
    roles: ['Admin'],
  },
  {
    path: '/app/re-engrave',
    label: 'RE-ENGRAVE',
    icon: 'edit',
    roles: ['Admin'],
  },
];

export function normalizeRole(role: string | null | undefined): UserRole | null {
  const value = (role ?? '').trim().toLowerCase();

  if (value === 'admin') {
    return 'Admin';
  }
  if (value === 'supervisor') {
    return 'Admin';
  }
  if (value === 'operator' || value === 'user') {
    return 'Operator';
  }

  return null;
}

export function hasRoleAccess(
  role: UserRole | null,
  allowedRoles: readonly UserRole[] | undefined,
): boolean {
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }
  if (!role) {
    return false;
  }
  return allowedRoles.includes(role);
}

export function getFirstAllowedPath(role: UserRole | null): string {
  if (hasRoleAccess(role, ['Admin', 'Operator'])) {
    return '/app/marking';
  }

  const first = APP_NAV_ITEMS.find((item) => hasRoleAccess(role, item.roles));
  return first?.path ?? '/login';
}
