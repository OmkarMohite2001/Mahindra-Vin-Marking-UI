import { Routes } from '@angular/router';
import { Login } from '../pages/login/login';
import { Layout } from '../pages/layout/layout';

export const routes: Routes = [
 { path: 'login', component: Login },

  // Layout shell after login
  {
    path: 'app',
    component: Layout,
    children: [
      {
        path: 'excel-upload',
        loadComponent: () =>
          import('../pages/excel-upload/excel-upload').then(m => m.ExcelUpload),
      },
      {
        path: 'marking',
        loadComponent: () =>
          import('../pages/marking/marking').then(m => m.Marking),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../pages/settings/settings').then(m => m.Settings),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('../pages/reports/reports').then(m => m.Reports),
      },
      {
        path:'serialTerminal',
        loadComponent:()=>
          import('../pages/serial-terminal/serial-terminal').then(m => m.SerialTerminal),
      },

      {
        path: 'vehicle-images',
        loadComponent: () =>
          import('../pages/vehicle-images/vehicle-images').then(m => m.VehicleImages),
      },
      {
        path: 'user-management',
        loadComponent: () =>
          import('../pages/user-management/user-management').then(m => m.UserManagement),
      },
      {
        path: 're-engrave',
        loadComponent: () =>
          import('../pages/re-engrave/re-engrave').then(m => m.ReEngrave),
      },

      { path: '', pathMatch: 'full', redirectTo: 'excel-upload' },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
