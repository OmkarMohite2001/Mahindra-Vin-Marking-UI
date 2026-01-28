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

  logout() {
    if(confirm("Are you sure want to logout!!")){
      localStorage.removeItem('token');
      this.router.navigateByUrl('/login');

    }

  }
}
