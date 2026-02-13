import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { APP_NAV_ITEMS, NavItemAccess, normalizeRole, UserRole } from '../../app/role-access';
@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
],
  templateUrl: './layout.html',
  styleUrls: ['./layout.scss'],
})
export class Layout {
  private router = inject(Router);
  private currentRole: UserRole | null = normalizeRole(localStorage.getItem('role'));
  readonly navItems: readonly NavItemAccess[] = APP_NAV_ITEMS;
  readonly loggedInUserName = (localStorage.getItem('username') || 'User').trim() || 'User';
  readonly loggedInRole = this.currentRole ?? 'Operator';
  readonly loggedInInitial = this.loggedInUserName.charAt(0).toUpperCase();

  canShow(item: NavItemAccess): boolean {
    return !!this.currentRole && item.roles.includes(this.currentRole);
  }

  logout() {
    if(confirm("Are you sure want to logout!!")){
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      this.router.navigateByUrl('/login');

    }

  }
}
