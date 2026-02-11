import { ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, NgZone, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Serial } from '../../services/serial';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-serial-terminal',
  imports: [CommonModule],
  templateUrl: './serial-terminal.html',
  styleUrl: './serial-terminal.scss',
})
export class SerialTerminal {
  terminalData: string[] = [];
  isConnected = false;
  private destroyRef = inject(DestroyRef);
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  constructor(public serialService: Serial,private ngZone: NgZone,private cdr: ChangeDetectorRef) {}

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
          console.log("Data received:", data);
          this.terminalData.push(data);
          this.scrollToBottom();
          this.cdr.detectChanges();
        });
      });
    this.serialService.autoConnect();
  }

  processData(rawData: string) {
    this.terminalData.push(rawData);
        if(this.terminalData.length > 100) this.terminalData.shift();

    this.scrollToBottom();
  }

  connectManual() {
    this.serialService.requestPort();
  }

  scrollToBottom(): void {
    try {
      setTimeout(() => {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }, 0);
    } catch(err) { }
  }

}
