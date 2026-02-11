import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-print-loader',
  imports: [],
  templateUrl: './print-loader.html',
  styleUrl: './print-loader.scss',
})
export class PrintLoader {
  @Input() mainMessage: string = 'Printing Label';
  @Input() subMessage: string = 'Sending data to printer...';
}
