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
  private readableStreamClosed: Promise<void> | null = null;
  private keepReading = false;
  private buffer = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  dataSubject = new Subject<string>();
  public connectionState = new BehaviorSubject<boolean>(false);

  constructor() {
    if (this.isSupported()) {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (!this.port || event.port === this.port) {
          console.log('Device disconnected or unplugged');
          void this.disconnect();
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

  isConnected(): boolean {
    return this.connectionState.getValue();
  }

  getPortDetails(): string {
    if (!this.port) {
      return 'No Device Connected';
    }

    const info = this.getPortInfo(this.port);
    const details: string[] = [];
    const comName = this.getPortName();
    if (comName && comName !== 'COM') {
      details.push(comName);
    }
    if (info.usbVendorId !== undefined) {
      details.push(`VID 0x${info.usbVendorId.toString(16).toUpperCase()}`);
    }
    if (info.usbProductId !== undefined) {
      details.push(`PID 0x${info.usbProductId.toString(16).toUpperCase()}`);
    }

    return details.length ? details.join(' | ') : 'Serial Device (Connected)';
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

    let selectedPort: any = null;
    try {
      // Must be called directly within user gesture without any preceding awaits
      selectedPort = await (navigator as any).serial.requestPort();
    } catch (error: any) {
      if (error?.name === 'NotFoundError') {
        console.log('User cancelled serial port selection');
      } else {
        console.error('Port selection failed', error);
      }
      return false;
    }

    if (!selectedPort) {
      return false;
    }

    // If an existing port is open, disconnect it before switching to the newly selected one
    if (this.port && this.port !== selectedPort) {
      await this.disconnect();
    }

    this.port = selectedPort;
    await this.connectToPort();
    return this.connectionState.getValue();
  }

  async autoConnect(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    if (this.isConnected()) {
      return true;
    }

    try {
      const ports = await (navigator as any).serial.getPorts();
      if (!ports || !ports.length) {
        return false;
      }

      // If a port is already open and readable, reuse it immediately
      const alreadyOpen = ports.find((p: any) => p.readable);
      if (alreadyOpen) {
        this.port = alreadyOpen;
        await this.connectToPort();
        return this.connectionState.getValue();
      }

      // Prioritize USB scanner/devices over Bluetooth
      const usbPort = ports.find((p: any) => {
        const info = this.getPortInfo(p);
        return info.usbVendorId !== undefined;
      });
      const candidates = usbPort ? [usbPort, ...ports.filter((p: any) => p !== usbPort)] : ports;

      for (const p of candidates) {
        try {
          this.port = p;
          await this.connectToPort();
          if (this.connectionState.getValue()) {
            return true;
          }
        } catch {
          this.port = null;
        }
      }

      return false;
    } catch (err) {
      console.warn('Auto-connect failed:', err);
      this.port = null;
      this.connectionState.next(false);
      return false;
    }
  }

  async disconnect(): Promise<boolean> {
    this.keepReading = false;
    this.clearFlushTimer();

    // 1. Cancel the reader so read loop unblocks
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (err) {
        console.warn('Error cancelling serial reader:', err);
      }
    }

    // 2. Wait for the stream pipe to fully close and unlock port.readable
    if (this.readableStreamClosed) {
      try {
        await this.readableStreamClosed.catch(() => {});
      } catch (err) {
        // ignore cancellation error
      } finally {
        this.readableStreamClosed = null;
      }
    }

    // 3. Now that the stream is unlocked, close the native serial port
    if (this.port) {
      try {
        await this.port.close();
        console.log('Serial port closed successfully');
      } catch (err) {
        console.warn('Error closing serial port:', err);
      }
    }

    this.port = null;
    this.reader = null;
    this.connectionState.next(false);
    return true;
  }

  private async connectToPort() {
    if (!this.port) {
      return;
    }

    if (this.port.readable) {
      this.connectionState.next(true);
      if (!this.keepReading || !this.reader) {
        this.keepReading = true;
        void this.readLoop();
      }
      return;
    }

    try {
      const openPromise = this.port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Serial port open timed out')), 4000)
      );
      await Promise.race([openPromise, timeoutPromise]);

      console.log('Port connected!');
      this.connectionState.next(true);
      this.keepReading = true;
      void this.readLoop();
    } catch (error) {
      console.error('Error opening port:', error);
      this.port = null;
      this.connectionState.next(false);
    }
  }

  private async readLoop() {
    if (!this.port || !this.port.readable) {
      return;
    }

    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
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
      if (this.keepReading) {
        console.error('Read error (device lost?):', error);
        this.connectionState.next(false);
        this.port = null;
      }
    } finally {
      this.flushBuffer();
      this.clearFlushTimer();
      try {
        reader.releaseLock();
      } catch (e) {}
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
