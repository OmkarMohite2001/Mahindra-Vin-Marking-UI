import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Serial {
  private port: any;
  private reader: any;
  private keepReading = false;
  private buffer = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

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
           this.clearFlushTimer();
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
      await this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });
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
    this.reader = reader;

    try {
      while (this.keepReading) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        if (value) {
          this.buffer += value;
          this.emitCompletedLines();
          this.scheduleBufferFlush();
        }
      }
    } catch (error) {
      console.error('Read error (Device lost?):', error);
      this.connectionState.next(false);
      this.port = null;
    } finally {
      this.flushBuffer();
      this.clearFlushTimer();
      reader.releaseLock();
      await readableStreamClosed.catch(() => {});
      this.reader = null;
    }
  }

  private emitCompletedLines(): void {
    const lines = this.buffer.split(/\r\n|\n|\r/);

    if (lines.length <= 1) {
      return;
    }

    this.buffer = lines.pop() || '';
    lines.forEach((line) => this.emitLine(line));
  }

  private scheduleBufferFlush(): void {
    this.clearFlushTimer();
    this.flushTimer = setTimeout(() => this.flushBuffer(), 80);
  }

  private flushBuffer(): void {
    if (!this.buffer) {
      return;
    }

    this.emitLine(this.buffer);
    this.buffer = '';
  }

  private clearFlushTimer(): void {
    if (!this.flushTimer) {
      return;
    }

    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  private emitLine(line: string): void {
    const parsed = line.trim();
    if (parsed.length > 0) {
      this.dataSubject.next(parsed);
    }
  }
}
