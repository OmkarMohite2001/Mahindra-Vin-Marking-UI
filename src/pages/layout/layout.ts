import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { APP_NAV_ITEMS, hasRoleAccess, NavItemAccess, normalizeRole, UserRole } from '../../app/role-access';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {
  private router = inject(Router);
  private currentRole: UserRole | null = normalizeRole(localStorage.getItem('role'));
  readonly isAdmin = this.currentRole === 'Admin';
  readonly canViewAdminMenu = this.isAdmin;
  readonly canViewMaintenanceMenu = this.isAdmin;
  readonly canViewAssociateMenu = !!this.currentRole;
  readonly canViewReports = this.isAdmin;
  readonly canViewHelpMenu = this.isAdmin;
  readonly navItems: readonly NavItemAccess[] = APP_NAV_ITEMS;
  readonly visibleNavItems = this.navItems.filter(
    (item) =>
      item.path !== '/app/serialTerminal' &&
      !!this.currentRole &&
      item.roles.includes(this.currentRole),
  );
  readonly loggedInUserName = (localStorage.getItem('username') || 'User').trim() || 'User';
  readonly loggedInRole = this.currentRole ?? 'Operator';
  readonly loggedInInitial = this.loggedInUserName.charAt(0).toUpperCase();
  private readonly navImageByPath: Record<string, string> = {
    '/app/excel-upload': 'SidebarIcons/Excel.png',
    '/app/marking': 'SidebarIcons/Engrave.png',
    '/app/re-engrave': 'SidebarIcons/Engrave.png',
    '/app/reports': 'SidebarIcons/Report.png',
    '/app/vehicle-images': 'SidebarIcons/VehicleImage.png',
    '/app/user-management': 'SidebarIcons/UserManagement.png',
  };
  readonly logoutImageSrc = 'SidebarIcons/Logout.png';

  trackByNavPath(_: number, item: NavItemAccess): string {
    return item.path;
  }

  getNavImageSrc(item: NavItemAccess): string | null {
    return this.navImageByPath[item.path] ?? null;
  }

  canAccess(allowedRoles: readonly UserRole[]): boolean {
    return hasRoleAccess(this.currentRole, allowedRoles);
  }

  navigateIfAllowed(path: string, allowed: boolean): void {
    if (!allowed) {
      return;
    }
    this.router.navigateByUrl(path);
  }

  logout() {
    if(confirm("Are you sure want to logout!!")){
      localStorage.clear();
      this.router.navigateByUrl('/login');

    }

  }
}
