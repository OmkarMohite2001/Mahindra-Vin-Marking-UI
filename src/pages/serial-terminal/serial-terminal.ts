import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Serial } from '../../services/serial';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-serial-terminal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './serial-terminal.html',
  styleUrl: './serial-terminal.scss',
})
export class SerialTerminal implements OnInit {
  terminalData: string[] = [];
  isConnected = false;
  isConnecting = false;
  rxActive = false;
  private rxTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyRef = inject(DestroyRef);
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(
    public serialService: Serial,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.serialService.connectionState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => {
        this.ngZone.run(() => {
          this.isConnected = status;
          this.cdr.detectChanges();
        });
      });

    this.serialService.dataSubject
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data) => {
        this.ngZone.run(() => {
          this.flashRxIndicator();
          this.terminalData.push(data);
          if (this.terminalData.length > 200) {
            this.terminalData.shift();
          }
          this.scrollToBottom();
          this.cdr.detectChanges();
        });
      });

    this.serialService.autoConnect();
  }

  processData(rawData: string): void {
    this.terminalData.push(rawData);
    if (this.terminalData.length > 200) {
      this.terminalData.shift();
    }
    this.scrollToBottom();
  }

  async connectManual(): Promise<void> {
    try {
      await this.serialService.requestPort();
    } catch (err) {
      console.error('Manual connection failed', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async retryAutoConnect(): Promise<void> {
    this.isConnecting = true;
    this.cdr.detectChanges();

    try {
      await this.serialService.autoConnect();
    } catch (err) {
      console.error('Auto connect retry failed', err);
    } finally {
      this.isConnecting = false;
      this.cdr.detectChanges();
    }
  }

  async disconnectManual(): Promise<void> {
    try {
      await this.serialService.disconnect();
    } catch (err) {
      console.error('Disconnect failed', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  clearTerminal(): void {
    this.terminalData = [];
    this.cdr.detectChanges();
  }

  private flashRxIndicator(): void {
    this.rxActive = true;
    if (this.rxTimer) {
      clearTimeout(this.rxTimer);
    }
    this.rxTimer = setTimeout(() => {
      this.rxActive = false;
      this.cdr.detectChanges();
    }, 250);
  }

  scrollToBottom(): void {
    try {
      setTimeout(() => {
        if (this.myScrollContainer?.nativeElement) {
          this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
        }
      }, 0);
    } catch (err) {}
  }
}
