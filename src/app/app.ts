import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  protected readonly isDesktopSupported = signal(true);
  protected readonly title = signal('Mahindra-Vin-Marking');

  private readonly resizeHandler = () => this.evaluateDeviceSupport();

  ngOnInit(): void {
    this.evaluateDeviceSupport();
    window.addEventListener('resize', this.resizeHandler);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }

  private evaluateDeviceSupport(): void {
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUa =
      /android|iphone|ipad|ipod|windows phone|mobile|blackberry|opera mini/i.test(ua);
    const isNarrowScreen = window.innerWidth < 1024;

    this.isDesktopSupported.set(!(isMobileUa || isNarrowScreen));
  }
}
