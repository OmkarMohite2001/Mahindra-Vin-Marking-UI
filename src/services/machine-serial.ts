import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { EngraveResponse } from './engrave-api';
import { MACHINE_SERIAL_DEFAULTS } from './engrave-defaults';

interface SavedMachinePortPreference {
  preferredIndex?: number;
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MachineSerial {
  private readonly selectionStorageKey = 'machineSerial.preference';
  private port: any;
  private reader: any;
  private keepReading = false;
  private buffer = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly rxBuffer = new StringBuilder();

  readonly dataSubject = new Subject<string>();
  readonly connectionState = new BehaviorSubject<boolean>(false);

  constructor() {
    if (this.isSupported()) {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (event.port === this.port) {
          this.connectionState.next(false);
          this.port = null;
          this.keepReading = false;
          this.clearFlushTimer();
          this.clearReadBuffer();
        }
      });
    }
  }

  isSupported(): boolean {
    return 'serial' in navigator;
  }

  async autoConnect(excludedPort?: any): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const ports = await (navigator as any).serial.getPorts();
    const matchingPort = this.resolvePreferredPort(ports, excludedPort);
    if (!matchingPort) {
      return false;
    }

    this.port = matchingPort;
    await this.connectToPort();
    return this.connectionState.getValue();
  }

  async requestPort(excludedPort?: any): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser.');
    }

    const selectedPort = await (navigator as any).serial.requestPort();
    if (selectedPort === excludedPort) {
      throw new Error('Please select the machine controller serial port, not the scanner port.');
    }

    await this.saveSelectedPortPreference(selectedPort);
    this.port = selectedPort;
    await this.connectToPort();
    return this.connectionState.getValue();
  }

  getCurrentPort() {
    return this.port;
  }

  getSavedPortSummary(): string {
    const preference = this.readSavedPortPreference();
    if (!preference) {
      return 'No machine port selected';
    }

    return this.describePortPreference(preference);
  }

  clearSavedPortPreference(): void {
    localStorage.removeItem(this.selectionStorageKey);
  }

  async sendCustomCommand(
    command: string,
    options?: { lineEnding?: string; readTimeoutMs?: number },
    excludedPort?: any,
  ): Promise<string> {
    const isConnected =
      this.connectionState.getValue() || (await this.autoConnect(excludedPort)) || (await this.requestPort(excludedPort));

    if (!isConnected) {
      throw new Error('Machine controller serial port is not connected.');
    }

    return this.sendAndRead(
      command,
      options?.lineEnding ?? this.resolveLineTerminator(),
      options?.readTimeoutMs ?? this.resolveResponseTimeoutMs(),
    );
  }

  async executeEngrave(parameters: string[], excludedPort?: any): Promise<EngraveResponse> {
    const isConnected =
      this.connectionState.getValue() || (await this.autoConnect(excludedPort)) || (await this.requestPort(excludedPort));

    if (!isConnected || !this.port?.writable) {
      return {
        ok: false,
        message: 'Machine controller serial port is not connected.',
        error: 'Machine controller serial port is not connected.',
      };
    }

    return this.executeEngraveSequence(parameters);
  }

  private async connectToPort(): Promise<void> {
    if (!this.port) {
      return;
    }

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
      this.connectionState.next(true);
      this.keepReading = true;
      void this.readLoop();
    } catch (error) {
      console.error('Machine serial port open failed:', error);
      this.connectionState.next(false);
      throw new Error('Unable to open machine controller serial port.');
    }
  }

  private async readLoop(): Promise<void> {
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
      console.error('Machine serial read failed:', error);
      this.connectionState.next(false);
      this.port = null;
      this.clearReadBuffer();
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
    if (!parsed.length) {
      return;
    }

    this.dataSubject.next(parsed);
    this.appendToReadBuffer(parsed);
  }

  private async executeEngraveSequence(parameters: string[]): Promise<EngraveResponse> {
    const interDelayMs = this.resolveInterDelayMs();
    const readTimeoutMs = this.resolveResponseTimeoutMs();
    const completionToken = this.resolveCompletionToken();
    const lineEnding = this.resolveLineTerminator();
    const template = this.resolveTemplate();
    const log: string[] = [];

    this.clearReadBuffer();

    try {
      let sentVs = 0;
      for (let i = 0; i < Math.min(parameters.length, 10); i++) {
        const command = `VS ${i} "${parameters[i].trim()}"`;
        await this.writeCommand(command, lineEnding);
        log.push(`>> ${command}`);
        sentVs += 1;

        if (interDelayMs > 0) {
          await this.delay(interDelayMs);
        }
      }

      const loadCommand = `LD "${template}" 1 N`;
      await this.writeCommand(loadCommand, lineEnding);
      log.push(`>> ${loadCommand}`);
      if (interDelayMs > 0) {
        await this.delay(interDelayMs);
      }

      await this.writeCommand('GO', lineEnding);
      log.push('>> GO');
      if (interDelayMs > 0) {
        await this.delay(interDelayMs);
      }

      const startTime = Date.now();
      let lastChunk = '';
      while (Date.now() - startTime < readTimeoutMs) {
        const chunk = this.readLatest(true);
        if (chunk.trim().length) {
          lastChunk = chunk;
          const errorMatch = this.tryParseError(chunk);
          if (errorMatch) {
            return {
              ok: false,
              message: `Machine error ${errorMatch.raw}`,
              error: `Machine error ${errorMatch.raw}`,
            };
          }

          if (chunk.includes(completionToken)) {
            return {
              ok: true,
              message: `Completed with token ${completionToken}. Template ${template} executed.`,
            };
          }
        }

        await this.delay(200);
      }

      const stResponse = await this.sendAndRead('ST', lineEnding, 3000);
      const stState = this.tryParseStatusState(stResponse);
      const latest = this.readLatest(false);

      if (stState === 0 || stState === 1) {
        return {
          ok: true,
          message: `Completed by ST state ${stState}. Template ${template} executed.`,
        };
      }

      const errorMatch = this.tryParseError(latest || lastChunk || stResponse);
      if (errorMatch) {
        return {
          ok: false,
          message: `Machine error ${errorMatch.raw}`,
          error: `Machine error ${errorMatch.raw}`,
        };
      }

      const statusText = stState === null ? 'unknown' : `${stState} (${this.mapStatusMeaning(stState)})`;
      return {
        ok: false,
        message: `Completion token ${completionToken} not received. ST status: ${statusText}.`,
        error: `Completion token ${completionToken} not received.`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Machine controller communication failed.';
      return {
        ok: false,
        message,
        error: message,
      };
    }
  }

  private async writeCommand(command: string, lineEnding: string): Promise<void> {
    if (!this.port?.writable) {
      throw new Error('Machine controller serial port is not writable.');
    }

    const writer = this.port.writable.getWriter();
    try {
      const encodedCommand = new TextEncoder().encode(command + lineEnding);
      await writer.write(encodedCommand);
    } finally {
      writer.releaseLock();
    }
  }

  private async sendAndRead(command: string, lineEnding: string, timeoutMs: number): Promise<string> {
    this.clearReadBuffer();
    await this.writeCommand(command, lineEnding);

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const latest = this.readLatest(false);
      if (latest.trim().length) {
        return latest;
      }

      await this.delay(100);
    }

    return this.readLatest(false);
  }

  private resolveLineTerminator(): string {
    const rawValue = localStorage.getItem('machineSerial.lineTerminator');
    if (rawValue === '\\n') {
      return '\n';
    }
    if (rawValue === '\\r') {
      return '\r';
    }
    if (rawValue === '\\r\\n') {
      return '\r\n';
    }
    return MACHINE_SERIAL_DEFAULTS.lineTerminator
      .replace('\\r', '\r')
      .replace('\\n', '\n');
  }

  private resolveBaudRate(): number {
    const parsedValue = Number(localStorage.getItem('machineSerial.baudRate'));
    return Number.isFinite(parsedValue) && parsedValue > 0
      ? parsedValue
      : MACHINE_SERIAL_DEFAULTS.baudRate;
  }

  private resolveTemplate(): string {
    return localStorage.getItem('machineSerial.template') || MACHINE_SERIAL_DEFAULTS.template;
  }

  private resolveCompletionToken(): string {
    return (
      localStorage.getItem('machineSerial.completionToken') ||
      MACHINE_SERIAL_DEFAULTS.completionToken
    );
  }

  private resolveInterDelayMs(): number {
    const parsedValue = Number(localStorage.getItem('machineSerial.interDelayMs'));
    return Number.isFinite(parsedValue) && parsedValue >= 0
      ? parsedValue
      : MACHINE_SERIAL_DEFAULTS.interDelayMs;
  }

  private resolveResponseTimeoutMs(): number {
    const parsedValue = Number(localStorage.getItem('machineSerial.responseTimeoutMs'));
    return Number.isFinite(parsedValue) && parsedValue >= 1000
      ? parsedValue
      : MACHINE_SERIAL_DEFAULTS.responseTimeoutMs;
  }

  private readSavedPortPreference(): SavedMachinePortPreference | null {
    const rawValue = localStorage.getItem(this.selectionStorageKey);
    if (!rawValue) {
      return null;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as SavedMachinePortPreference;
      return typeof parsedValue === 'object' && parsedValue ? parsedValue : null;
    } catch {
      return null;
    }
  }

  private async saveSelectedPortPreference(port: any): Promise<void> {
    const ports = await (navigator as any).serial.getPorts();
    const preferredIndex = ports.findIndex((candidate: any) => candidate === port);
    const portInfo = this.getPortInfo(port);
    const preference: SavedMachinePortPreference = {
      preferredIndex: preferredIndex >= 0 ? preferredIndex : undefined,
      ...portInfo,
    };

    localStorage.setItem(this.selectionStorageKey, JSON.stringify(preference));
  }

  private resolvePreferredPort(ports: any[], excludedPort?: any): any | null {
    const filteredPorts = ports.filter((candidate) => candidate !== excludedPort);
    if (!filteredPorts.length) {
      return null;
    }

    const preference = this.readSavedPortPreference();
    if (!preference) {
      return filteredPorts[0];
    }

    if (
      preference.preferredIndex !== undefined &&
      ports[preference.preferredIndex] &&
      ports[preference.preferredIndex] !== excludedPort &&
      this.matchesSavedPreference(ports[preference.preferredIndex], preference)
    ) {
      return ports[preference.preferredIndex];
    }

    return (
      filteredPorts.find((candidate) => this.matchesSavedPreference(candidate, preference)) ??
      filteredPorts[0]
    );
  }

  private matchesSavedPreference(port: any, preference: SavedMachinePortPreference): boolean {
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

  private getPortInfo(port: any): SavedMachinePortPreference {
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

  private describePortPreference(preference: SavedMachinePortPreference): string {
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

    return details.length ? details.join(' | ') : 'Previously selected machine port';
  }

  private appendToReadBuffer(value: string): void {
    this.rxBuffer.append(value);
    this.rxBuffer.append('\n');
    if (this.rxBuffer.length > 200_000) {
      this.rxBuffer.delete(0, this.rxBuffer.length - 50_000);
    }
  }

  private clearReadBuffer(): void {
    this.rxBuffer.clear();
  }

  private readLatest(clear: boolean): string {
    const current = this.rxBuffer.toString();
    if (clear) {
      this.rxBuffer.clear();
    }
    return current;
  }

  private tryParseError(text: string): { raw: string; code1: number; code2: number } | null {
    const match = text.match(/ER\s*(\d+)\s*(\d+)/i);
    if (!match) {
      return null;
    }

    return {
      raw: match[0],
      code1: Number(match[1]),
      code2: Number(match[2]),
    };
  }

  private tryParseStatusState(text: string): number | null {
    const match = text.match(/ST\s+(\d+)/i);
    if (!match) {
      return null;
    }

    const parsedValue = Number(match[1]);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  private mapStatusMeaning(state: number): string {
    switch (state) {
      case 0:
        return 'Alive';
      case 1:
        return 'Ready to mark';
      case 2:
        return 'Marking in progress';
      case 3:
        return 'Marking paused';
      case 12:
        return 'COM error';
      case 14:
        return 'Waiting AD command';
      case 19:
        return 'No file found';
      default:
        return 'Unknown state';
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

class StringBuilder {
  private value = '';

  get length(): number {
    return this.value.length;
  }

  append(chunk: string): void {
    this.value += chunk;
  }

  clear(): void {
    this.value = '';
  }

  delete(start: number, lengthToDelete: number): void {
    this.value = this.value.slice(0, start) + this.value.slice(start + lengthToDelete);
  }

  toString(): string {
    return this.value;
  }
}
