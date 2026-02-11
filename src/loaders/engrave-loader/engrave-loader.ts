import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-engrave-loader',
  imports: [],
  templateUrl: './engrave-loader.html',
  styleUrl: './engrave-loader.scss',
})
export class EngraveLoader {
  @Input() mainMessage: string = 'Engraving Data';
  @Input() subMessage: string = 'Connecting to engraving machine...';
  @Input() displayText: string = 'MAHINDRA';
}
