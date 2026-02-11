import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-excel-loader',
  imports: [],
  templateUrl: './excel-loader.html',
  styleUrl: './excel-loader.scss',
})
export class ExcelLoader {
  @Input() mainMessage: string = 'Uploading Excel Sheet...';
  @Input() subMessage: string = 'Validating and importing data...';
}
