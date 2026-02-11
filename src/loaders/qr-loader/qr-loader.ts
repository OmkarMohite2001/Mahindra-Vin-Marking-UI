import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-qr-loader',
  imports: [],
  templateUrl: './qr-loader.html',
  styleUrl: './qr-loader.scss',
})
export class QrLoader {
@Input() mainMessage: string = 'Scanning QR Code';
  @Input() subMessage: string = 'Verifying Data with Server...';
}
