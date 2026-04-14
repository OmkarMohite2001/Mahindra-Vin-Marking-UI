import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

interface SavedSerialPortPreference {
  preferredIndex?: number;
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class Serial {
  private readonly selectionStorageKey = 'scannerSerial.preference';
  private readonly baudRateStorageKey = 'scannerSerial.baudRate';
  private readonly autoConnectStorageKey = 'scannerSerial.autoConnect';
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
      await this.saveSelectedPortPreference(this.port);
      await this.connectToPort();
    } catch (error) {
      console.error('Port selection failed', error);
    }
  }

  async autoConnect() {
    if (!this.isSupported()) {
      return;
    }

    if (!this.isAutoConnectEnabled()) {
      return;
    }

    const ports = await (navigator as any).serial.getPorts();
    const matchingPort = this.resolvePreferredPort(ports);
    if (!matchingPort) {
      return;
    }

    this.port = matchingPort;
    await this.connectToPort();
  }

  getCurrentPort() {
    return this.port;
  }

  getSavedPortSummary(): string {
    const preference = this.readSavedPortPreference();
    if (!preference) {
      return 'No scanner port selected';
    }

    return this.describePortPreference(preference);
  }

  clearSavedPortPreference(): void {
    localStorage.removeItem(this.selectionStorageKey);
  }

  private async connectToPort() {
    if (!this.port) return;
    if (this.port.readable) {
      this.connectionState.next(true);
      return;
    }
    try {
      await this.port.open({
        baudRate: this.resolveBaudRate(),
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

  private resolveBaudRate(): number {
    const parsedValue = Number(localStorage.getItem(this.baudRateStorageKey));
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 9600;
  }

  private isAutoConnectEnabled(): boolean {
    const rawValue = localStorage.getItem(this.autoConnectStorageKey);
    return rawValue === null ? true : rawValue === 'true';
  }

  private readSavedPortPreference(): SavedSerialPortPreference | null {
    const rawValue = localStorage.getItem(this.selectionStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as SavedSerialPortPreference;
      return typeof parsedValue === 'object' && parsedValue ? parsedValue : null;
    } catch {
      return null;
    }
  }

  private async saveSelectedPortPreference(port: any): Promise<void> {
    const ports = await (navigator as any).serial.getPorts();
    const preferredIndex = ports.findIndex((candidate: any) => candidate === port);
    const portInfo = this.getPortInfo(port);
    const preference: SavedSerialPortPreference = {
      preferredIndex: preferredIndex >= 0 ? preferredIndex : undefined,
      ...portInfo,
    };

    localStorage.setItem(this.selectionStorageKey, JSON.stringify(preference));
  }

  private resolvePreferredPort(ports: any[]): any | null {
    if (!ports.length) {
      return null;
    }

    const preference = this.readSavedPortPreference();
    if (!preference) {
      return ports[0];
    }

    if (
      preference.preferredIndex !== undefined &&
      ports[preference.preferredIndex] &&
      this.matchesSavedPreference(ports[preference.preferredIndex], preference)
    ) {
      return ports[preference.preferredIndex];
    }

    return ports.find((candidate) => this.matchesSavedPreference(candidate, preference)) ?? ports[0];
  }

  private matchesSavedPreference(port: any, preference: SavedSerialPortPreference): boolean {
    const info = this.getPortInfo(port);
    const vendorMatches =
      preference.usbVendorId === undefined || info.usbVendorId === preference.usbVendorId;
    const productMatches =
      preference.usbProductId === undefined || info.usbProductId === preference.usbProductId;
    const bluetoothMatches =
      preference.bluetoothServiceClassId === undefined ||
      info.bluetoothServiceClassId === preference.bluetoothServiceClassId;

    return vendorMatches && productMatches && bluetoothMatches;
  }

  private getPortInfo(port: any): SavedSerialPortPreference {
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

  private describePortPreference(preference: SavedSerialPortPreference): string {
    const details: string[] = [];
    if (preference.usbVendorId !== undefined) {
      details.push(`VID ${preference.usbVendorId}`);
    }
    if (preference.usbProductId !== undefined) {
      details.push(`PID ${preference.usbProductId}`);
    }
    if (preference.preferredIndex !== undefined) {
      details.push(`Slot ${preference.preferredIndex + 1}`);
    }

    return details.length ? details.join(' | ') : 'Previously selected scanner port';
  }
}
