import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-convert-loader',
  imports: [],
  templateUrl: './table-convert-loader.html',
  styleUrl: './table-convert-loader.scss',
})
export class TableConvertLoader {
  @Input() mainMessage: string = 'Converting Table Data...';
  @Input() subMessage: string = 'Parsing sheets and mapping rows...';
}
