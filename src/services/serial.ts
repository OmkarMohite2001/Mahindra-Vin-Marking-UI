import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

export type ScannerParity = 'None' | 'Even' | 'Odd' | 'Mark' | 'Space';
export type ScannerFlowControl = 'None' | 'RTS/CTS' | 'XON/XOFF';

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
          console.log('Device disconnected manually');
          this.connectionState.next(false);
          this.port = null;
          this.keepReading = false;
          this.clearFlushTimer();
        }
      });

      (navigator as any).serial.addEventListener('connect', () => {
        console.log('Device connected to USB port');
      });
    }
  }

  isSupported(): boolean {
    return 'serial' in navigator;
  }

  getPortSummary(): string {
    if (!this.port) {
      return 'No scanner port selected in this session';
    }

    const info = this.getPortInfo(this.port);
    const details: string[] = [];
    if (info.usbVendorId !== undefined) {
      details.push(`VID ${info.usbVendorId}`);
    }
    if (info.usbProductId !== undefined) {
      details.push(`PID ${info.usbProductId}`);
    }

    return details.length ? details.join(' | ') : 'Scanner port selected';
  }

  getPortName(): string {
    if (!this.port) {
      return 'COM';
    }

    const info = this.getPortInfo(this.port) as Record<string, unknown>;
    const candidates = [
      this.port?.displayName,
      this.port?.friendlyName,
      this.port?.name,
      this.port?.path,
      this.port?.portName,
      this.port?.label,
      info?.['path'],
      info?.['displayName'],
      info?.['friendlyName'],
      info?.['name'],
    ];

    for (const candidate of candidates) {
      const resolved = this.extractComName(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return 'COM';
  }

  async requestPort(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.connectToPort();
      return this.connectionState.getValue();
    } catch (error) {
      console.error('Port selection failed', error);
      return false;
    }
  }

  async autoConnect(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const ports = await (navigator as any).serial.getPorts();
    if (!ports.length) {
      return false;
    }

    this.port = ports[0];
    await this.connectToPort();
    return this.connectionState.getValue();
  }

  private async connectToPort() {
    if (!this.port) {
      return;
    }

    if (this.port.readable) {
      this.connectionState.next(true);
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
      void this.readLoop();
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
      console.error('Read error (device lost?):', error);
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

  private getPortInfo(port: any): {
    usbVendorId?: number;
    usbProductId?: number;
    bluetoothServiceClassId?: number;
  } {
    if (!port?.getInfo) {
      return {};
    }

    const info = port.getInfo();
    return {
      usbVendorId: info?.usbVendorId,
      usbProductId: info?.usbProductId,
      bluetoothServiceClassId: info?.bluetoothServiceClassId,
    };
  }

  private extractComName(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const match = trimmed.match(/\bCOM\d+\b/i);
    return match ? match[0].toUpperCase() : null;
  }
}
