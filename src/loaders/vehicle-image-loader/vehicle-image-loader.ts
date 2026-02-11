import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-vehicle-image-loader',
  imports: [],
  templateUrl: './vehicle-image-loader.html',
  styleUrl: './vehicle-image-loader.scss',
})
export class VehicleImageLoader {
  @Input() mainMessage: string = 'Syncing Vehicle Assets';
  @Input() subMessage: string = 'Fetching vehicle image preview...';
}

