import { Routes } from '@angular/router';
import { Login } from '../pages/login/login';
import { Layout } from '../pages/layout/layout';
import { roleRouteGuard } from './role-route.guard';

export const routes: Routes = [
 { path: 'login', component: Login },

  // Layout shell after login
  {
    path: 'app',
    component: Layout,
    children: [
      {
        path: 'excel-upload',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor'] },
        loadComponent: () =>
          import('../pages/excel-upload/excel-upload').then(m => m.ExcelUpload),
      },
      {
        path: 'marking',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor', 'Operator'] },
        loadComponent: () =>
          import('../pages/marking/marking').then(m => m.Marking),
      },
      {
        path: 'settings',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('../pages/settings/settings').then(m => m.Settings),
      },
      {
        path: 'reports',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor', 'Operator'] },
        loadComponent: () =>
          import('../pages/reports/reports').then(m => m.Reports),
      },
      {
        path:'serialTerminal',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin'] },
        loadComponent:()=>
          import('../pages/serial-terminal/serial-terminal').then(m => m.SerialTerminal),
      },

      {
        path: 'vehicle-images',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor'] },
        loadComponent: () =>
          import('../pages/vehicle-images/vehicle-images').then(m => m.VehicleImages),
      },
      {
        path: 'user-management',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor'] },
        loadComponent: () =>
          import('../pages/user-management/user-management').then(m => m.UserManagement),
      },
      {
        path: 're-engrave',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor'] },
        loadComponent: () =>
          import('../pages/re-engrave/re-engrave').then(m => m.ReEngrave),
      },
      {
        path: 'about',
        canActivate: [roleRouteGuard],
        data: { roles: ['Admin', 'Supervisor', 'Operator'] },
        loadComponent: () =>
          import('../pages/about/about').then(m => m.About),
      },

      { path: '', pathMatch: 'full', redirectTo: 'marking' },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
