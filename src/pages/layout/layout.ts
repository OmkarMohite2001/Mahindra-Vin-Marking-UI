import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout {
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private currentRole: UserRole | null = normalizeRole(localStorage.getItem('role'));
  private readonly isDeveloperSession = localStorage.getItem('isDeveloperSession') === 'true';
  readonly canAccessSerialTerminal = this.currentRole === 'Admin';
  readonly showSerialTerminalMenuItem = this.canAccessSerialTerminal;
  readonly navItems: readonly NavItemAccess[] = APP_NAV_ITEMS;
  readonly visibleNavItems = this.navItems.filter((item) => {
    if (!this.currentRole || !item.roles.includes(this.currentRole)) {
      return false;
    }
    if (item.path === '/app/serialTerminal') {
      return this.isDeveloperSession;
    }
    return true;
  });
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
  currentHeaderTitle = this.resolveHeaderTitle(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.currentHeaderTitle = this.resolveHeaderTitle(this.router.url);
      });
  }

  trackByNavPath(_: number, item: NavItemAccess): string {
    return item.path;
  }

  getNavImageSrc(item: NavItemAccess): string | null {
    return this.navImageByPath[item.path] ?? null;
  }

  logout() {
    if(confirm("Are you sure want to logout!!")){
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('isDeveloperSession');
      this.router.navigateByUrl('/login');

    }

  }

  private resolveHeaderTitle(url: string): string {
    if (url.includes('/app/re-engrave')) {
      return 'RE-ENGRAVE';
    }
    if (url.includes('/app/excel-upload')) {
      return 'EXCEL UPLOAD';
    }
    if (url.includes('/app/settings')) {
      return 'SETTINGS';
    }
    if (url.includes('/app/reports')) {
      return 'REPORTS';
    }
    if (url.includes('/app/vehicle-images')) {
      return 'VEHICLE IMAGES';
    }
    if (url.includes('/app/user-management')) {
      return 'USER MANAGEMENT';
    }
    if (url.includes('/app/serialTerminal')) {
      return 'SERIAL TERMINAL';
    }
    if (url.includes('/app/about')) {
      return 'ABOUT';
    }
    return 'MARKING CYCLE';
  }
}
