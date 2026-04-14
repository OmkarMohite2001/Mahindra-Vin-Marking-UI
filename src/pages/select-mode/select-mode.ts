import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MarkingModeService } from '../../services/marking-mode';

@Component({
  selector: 'app-select-mode',
  imports: [CommonModule],
  templateUrl: './select-mode.html',
  styleUrl: './select-mode.scss',
})
export class SelectMode {
  private router = inject(Router);
  private markingMode = inject(MarkingModeService);

  onSelectMode(mode: 'serial' | 'ethernet'): void {
    this.markingMode.setMode(mode);
    this.router.navigateByUrl('/app/marking');
  }
}
