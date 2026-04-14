import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-select-mode',
  imports: [CommonModule, MatSnackBarModule],
  templateUrl: './select-mode.html',
  styleUrl: './select-mode.scss',
})
export class SelectMode {
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  onSelectMode(mode: 'serial' | 'ethernet'): void {
    localStorage.setItem('markingMode', mode);

    if (mode === 'ethernet') {
      this.router.navigateByUrl('/app/marking');
      return;
    }

    this.snackBar.open('Serial mode selected. Ethernet flow is available now.', 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
    });
  }
}
