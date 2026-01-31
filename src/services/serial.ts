import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Serial {
  private port: any;
  private reader: any;
  private keepReading = false;
  private buffer: string = '';

  dataSubject = new Subject<string>();
  public connectionState = new BehaviorSubject<boolean>(false);

  constructor() {
    if (this.isSupported()) {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (event.port === this.port) {
           console.log("Device Disconnected manually!");
           this.connectionState.next(false);
           this.port = null;
           this.keepReading = false;
        }
      });
      (navigator as any).serial.addEventListener('connect', (event: any) => {
         console.log("Device Connected to USB port");
      });
    }
  }

  isSupported(): boolean {
    return 'serial' in navigator;
  }

  async requestPort() {
    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.connectToPort();
    } catch (error) {
      console.error('Port selection failed', error);
    }
  }

  async autoConnect() {
    const ports = await (navigator as any).serial.getPorts();
    if (ports.length > 0) {
      this.port = ports[0];
      await this.connectToPort();
    }
  }

  private async connectToPort() {
    if (!this.port) return;
    if (this.port.readable) {
     return;
  }
    try {
      await this.port.open({ baudRate: 9600 });
      console.log('Port connected!');
      this.connectionState.next(true);
      this.keepReading = true;
      this.readLoop();
    } catch (error) {
      console.error('Error opening port:', error);
      this.connectionState.next(false);
    }
  }

  private async readLoop() {
  const textDecoder = new TextDecoderStream();
  const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
  const reader = textDecoder.readable.getReader();

  try {
    while (this.keepReading) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      if (value) {
        this.buffer += value;

        if (this.buffer.includes('\n') || this.buffer.includes('\r')) {

          const lines = this.buffer.split(/\r\n|\n|\r/);

          this.buffer = lines.pop() || '';

          lines.forEach(line => {
            if (line.trim().length > 0) {
               this.dataSubject.next(line.trim());
            }
          });
        }
      }
    }
  } catch (error) {

    console.error('Read error (Device lost?):', error);
    this.connectionState.next(false);
      this.port = null;
  } finally {
    reader.releaseLock();
  }
}
}
