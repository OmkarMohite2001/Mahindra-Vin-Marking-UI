import { MarkingDemo } from './../pages/marking-demo/marking-demo';
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
        path: 'dashboard',
        loadComponent: () =>
          import('../pages/dashboard/dashboard').then(m => m.Dashboard),
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
        path:'markingDemo',
        loadComponent:()=>
          import('../pages/marking-demo/marking-demo').then(m => m.MarkingDemo),
      },

      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },

  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
