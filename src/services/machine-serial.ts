import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { EngraveResponse } from './engrave-api';
import { MACHINE_SERIAL_DEFAULTS } from './engrave-defaults';

const ESC = 0x1b;
const ACK = 0x06;
const NAK = 0x15;
const CR = 0x0d;
const MAX_FRAME_DATA_LENGTH = 4096;

interface SavedMachinePortPreference {
  preferredIndex?: number;
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?: number;
}

export interface MachineSequenceStatus {
  raw: string;
  state: number | null;
  meaning: string | null;
}

export interface MachineSequenceError {
  raw: string;
  code1: number;
  code2: number;
}

export interface MachineSequenceResult {
  ok: boolean;
  connected: boolean;
  completed: boolean;
  sentVs: number;
  completionToken: string;
  response: string;
  lastChunk: string;
  log: string[];
  message: string;
  st?: MachineSequenceStatus;
  error?: MachineSequenceError;
  debug?: {
    rxLength: number;
    tokenFound?: boolean;
    completedBySt?: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class MachineSerial {
  private readonly selectionStorageKey = 'machineSerial.preference';

  private port: any;
  private reader: any;
  private keepReading = false;
  private readonly rxBuffer = new StringBuilder();
  private readonly rxHexBuffer = new StringBuilder();
  private readonly frameBuffer: number[] = [];
  private readonly textEncoder = new TextEncoder();
  private readonly textDecoder = new TextDecoder();

  readonly dataSubject = new Subject<string>();
  readonly connectionState = new BehaviorSubject<boolean>(false);

  constructor() {
    if (this.isSupported()) {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (event.port === this.port) {
          this.connectionState.next(false);
          this.port = null;
          this.keepReading = false;
          this.clearReadState();
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

  getCommandHex(command: string): string {
    return this.toHex(this.buildCommandFrame(command));
  }

  async sendCustomCommand(
    command: string,
    options?: { readTimeoutMs?: number },
    excludedPort?: any,
  ): Promise<string> {
    const isConnected =
      this.connectionState.getValue() || (await this.autoConnect(excludedPort)) || (await this.requestPort(excludedPort));

    if (!isConnected) {
      throw new Error('Machine controller serial port is not connected.');
    }

    return this.sendAndRead(command, options?.readTimeoutMs ?? this.resolveResponseTimeoutMs());
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

    const result = await this.runSequence(parameters);
    return {
      ok: result.ok,
      message: result.message,
      error: result.ok ? undefined : result.message,
    };
  }

  async runDevelopmentSequence(
    parameters: string[],
    options?: {
      template?: string;
      interDelayMs?: number;
      readTimeoutMs?: number;
      completionToken?: string;
    },
    excludedPort?: any,
  ): Promise<MachineSequenceResult> {
    const isConnected =
      this.connectionState.getValue() || (await this.autoConnect(excludedPort)) || (await this.requestPort(excludedPort));

    if (!isConnected || !this.port?.writable) {
      throw new Error('Machine controller serial port is not connected.');
    }

    return this.runSequence(parameters, options);
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
      const baudRate = this.resolveBaudRate();
      await this.port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });
      this.debugConsole('PORT OPEN', {
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        checksum: this.resolveUseChecksum(),
        port: this.getPortInfo(this.port),
      });
      this.connectionState.next(true);
      this.keepReading = true;
      this.clearReadState();
      void this.readLoop();
    } catch (error) {
      console.error('Machine serial port open failed:', error);
      this.connectionState.next(false);
      throw new Error('Unable to open machine controller serial port.');
    }
  }

  private async readLoop(): Promise<void> {
    if (!this.port?.readable) {
      return;
    }

    const reader = this.port.readable.getReader();
    this.reader = reader;

    try {
      while (this.keepReading) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
        this.debugConsole('RX CHUNK', {
          bytesHex: this.toHex(chunk),
          bytesDec: Array.from(chunk),
        });
        this.processIncomingBytes(chunk);
      }
    } catch (error) {
      console.error('Machine serial read failed:', error);
      this.connectionState.next(false);
      this.port = null;
      this.clearReadState();
    } finally {
      reader.releaseLock();
      this.reader = null;
    }
  }

  private processIncomingBytes(chunk: Uint8Array): void {
    this.appendHexChunk(chunk);
    for (const byte of chunk) {
      this.frameBuffer.push(byte);
    }
    this.parseIncomingFrames();
  }

  private parseIncomingFrames(): void {
    while (this.frameBuffer.length > 0) {
      const first = this.frameBuffer[0];

      if (first === ACK) {
        this.frameBuffer.shift();
        this.emitLine('ACK');
        continue;
      }

      if (first === NAK) {
        this.frameBuffer.shift();
        this.emitLine('NAK');
        continue;
      }

      if (first !== ESC) {
        const droppedByte = this.frameBuffer.shift();
        this.debugConsole('RX NOISE', {
          droppedByte,
          droppedHex: this.toHex([droppedByte ?? 0]),
        });
        continue;
      }

      if (this.frameBuffer.length < 5) {
        return;
      }

      const dataLength =
        (this.frameBuffer[1] << 16) | (this.frameBuffer[2] << 8) | this.frameBuffer[3];

      if (dataLength < 0 || dataLength > MAX_FRAME_DATA_LENGTH) {
        const invalidEsc = this.frameBuffer.shift();
        this.debugConsole('RX FRAME DESYNC', {
          reason: 'invalid-length',
          dataLength,
          droppedHex: this.toHex([invalidEsc ?? ESC]),
        });
        continue;
      }

      const dataStart = 4;
      const dataEnd = dataStart + dataLength;
      const noChecksumLength = 1 + 3 + dataLength + 1;

      if (this.frameBuffer.length < noChecksumLength) {
        return;
      }

      let checksum: number | undefined;
      let totalLength = noChecksumLength;

      if (this.frameBuffer[dataEnd] !== CR) {
        if (this.frameBuffer.length < noChecksumLength + 1) {
          return;
        }

        checksum = this.frameBuffer[dataEnd];
        if (this.frameBuffer[dataEnd + 1] !== CR) {
          const invalidEsc = this.frameBuffer.shift();
          this.debugConsole('RX FRAME DESYNC', {
            reason: 'missing-cr',
            droppedHex: this.toHex([invalidEsc ?? ESC]),
            bufferPreview: this.toHex(this.frameBuffer.slice(0, Math.min(this.frameBuffer.length, 24))),
          });
          continue;
        }

        totalLength += 1;
      }

      const dataBytes = new Uint8Array(this.frameBuffer.slice(dataStart, dataEnd));

      if (checksum !== undefined) {
        const expectedChecksum = this.computeChecksum(dataLength, dataBytes);
        if (checksum !== expectedChecksum) {
          this.emitLine(
            `CHECKSUM_ERROR ${checksum.toString(16).padStart(2, '0').toUpperCase()} ${expectedChecksum
              .toString(16)
              .padStart(2, '0')
              .toUpperCase()}`,
          );
          this.frameBuffer.splice(0, totalLength);
          continue;
        }
      }

      const decoded = this.textDecoder.decode(dataBytes).trim();
      if (decoded.length) {
        this.emitLine(decoded);
      }

      this.frameBuffer.splice(0, totalLength);
    }
  }

  private async runSequence(
    parameters: string[],
    options?: {
      template?: string;
      interDelayMs?: number;
      readTimeoutMs?: number;
      completionToken?: string;
    },
  ): Promise<MachineSequenceResult> {
    const interDelayMs = options?.interDelayMs ?? this.resolveInterDelayMs();
    const readTimeoutMs = options?.readTimeoutMs ?? this.resolveResponseTimeoutMs();
    const completionToken = options?.completionToken ?? this.resolveCompletionToken();
    const template = options?.template?.trim() || this.resolveTemplate();
    const log: string[] = [];
    const sanitizedParameters = parameters
      .map((parameter) => parameter.trim())
      .filter((parameter) => parameter.length > 0)
      .slice(0, 10);

    this.clearReadBuffer();

    try {
      let sentVs = 0;
      for (let i = 0; i < sanitizedParameters.length; i++) {
        const command = `VS ${i} "${sanitizedParameters[i]}"`;
        const frame = await this.writeCommand(command);
        log.push(`>> ${command} [${this.toHex(frame)}]`);
        sentVs += 1;

        if (interDelayMs > 0) {
          await this.delay(interDelayMs);
        }
      }

      const loadCommand = `LD "${template}" 1 N`;
      const loadFrame = await this.writeCommand(loadCommand);
      log.push(`>> ${loadCommand} [${this.toHex(loadFrame)}]`);
      if (interDelayMs > 0) {
        await this.delay(interDelayMs);
      }

      const goFrame = await this.writeCommand('GO');
      log.push(`>> GO [${this.toHex(goFrame)}]`);
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
              connected: this.connectionState.getValue(),
              completed: false,
              sentVs,
              completionToken,
              response: chunk,
              lastChunk: chunk,
              error: errorMatch,
              debug: { rxLength: chunk.length },
              log,
              message: `Machine error ${errorMatch.raw}`,
            };
          }

          if (chunk.includes(completionToken)) {
            return {
              ok: true,
              connected: this.connectionState.getValue(),
              completed: true,
              sentVs,
              completionToken,
              response: chunk,
              lastChunk: chunk,
              debug: { rxLength: chunk.length, tokenFound: true },
              log,
              message: `Completed with token ${completionToken}. Template ${template} executed.`,
            };
          }
        }

        await this.delay(200);
      }

      const stResponse = await this.sendAndRead('ST', 3000);
      const stState = this.tryParseStatusState(stResponse);
      const latest = this.readLatest(false);
      const stMeaning = stState === null ? null : this.mapStatusMeaning(stState);

      if (stState === 0 || stState === 1) {
        return {
          ok: true,
          connected: this.connectionState.getValue(),
          completed: true,
          sentVs,
          completionToken,
          response: latest || stResponse,
          lastChunk: latest || stResponse,
          st: {
            raw: stResponse,
            state: stState,
            meaning: stMeaning,
          },
          debug: {
            rxLength: (latest || stResponse).length,
            tokenFound: false,
            completedBySt: true,
          },
          log: [...log, `>> ST [${this.getCommandHex('ST')}]`, '!! Completion token not found, completed by ST fallback.'],
          message: `Completed by ST state ${stState}. Template ${template} executed.`,
        };
      }

      const errorMatch = this.tryParseError(latest || lastChunk || stResponse);
      if (errorMatch) {
        return {
          ok: false,
          connected: this.connectionState.getValue(),
          completed: false,
          sentVs,
          completionToken,
          response: latest || lastChunk || stResponse,
          lastChunk: latest || lastChunk || stResponse,
          st: {
            raw: stResponse,
            state: stState,
            meaning: stMeaning,
          },
          error: errorMatch,
          debug: {
            rxLength: (latest || lastChunk || stResponse).length,
            tokenFound: false,
            completedBySt: false,
          },
          log: [...log, `>> ST [${this.getCommandHex('ST')}]`, '!! ER detected after ST fallback.'],
          message: `Machine error ${errorMatch.raw}`,
        };
      }

      const statusText = stState === null ? 'unknown' : `${stState} (${stMeaning})`;
      return {
        ok: false,
        connected: this.connectionState.getValue(),
        completed: false,
        sentVs,
        completionToken,
        response: latest || lastChunk || stResponse,
        lastChunk: latest || lastChunk || stResponse,
        st: {
          raw: stResponse,
          state: stState,
          meaning: stMeaning,
        },
        debug: {
          rxLength: (latest || lastChunk || stResponse).length,
          tokenFound: false,
          completedBySt: false,
        },
        log: [
          ...log,
          `>> ST [${this.getCommandHex('ST')}]`,
          '!! Completion token not found and ST did not indicate ready/alive state.',
        ],
        message: `Completion token ${completionToken} not received. ST status: ${statusText}.`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Machine controller communication failed.';
      return {
        ok: false,
        connected: this.connectionState.getValue(),
        completed: false,
        sentVs: 0,
        completionToken,
        response: '',
        lastChunk: '',
        log,
        message,
      };
    }
  }

  private async writeCommand(command: string): Promise<Uint8Array> {
    if (!this.port?.writable) {
      throw new Error('Machine controller serial port is not writable.');
    }

    const frame = this.buildCommandFrame(command);
    const writer = this.port.writable.getWriter();

    try {
      this.debugConsole('TX COMMAND', {
        command,
        bytesHex: this.toHex(frame),
        bytesDec: Array.from(frame),
        checksum: this.resolveUseChecksum(),
      });
      await writer.write(frame);
    } finally {
      writer.releaseLock();
    }

    return frame;
  }

  private async sendAndRead(command: string, timeoutMs: number): Promise<string> {
    this.clearReadBuffer();
    await this.writeCommand(command);

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const latest = this.readLatest(false);
      if (this.hasMeaningfulResponse(latest)) {
        return latest;
      }

      await this.delay(100);
    }

    return this.readLatest(false);
  }

  private buildCommandFrame(command: string): Uint8Array {
    if (!command.trim().length) {
      throw new Error('Machine command is required.');
    }

    const commandBytes = this.textEncoder.encode(command);
    const useChecksum = this.resolveUseChecksum();
    const frameLength = 1 + 3 + commandBytes.length + (useChecksum ? 1 : 0) + 1;
    const frame = new Uint8Array(frameLength);

    frame[0] = ESC;
    frame[1] = (commandBytes.length >> 16) & 0xff;
    frame[2] = (commandBytes.length >> 8) & 0xff;
    frame[3] = commandBytes.length & 0xff;
    frame.set(commandBytes, 4);

    let cursor = 4 + commandBytes.length;
    if (useChecksum) {
      frame[cursor] = this.computeChecksum(commandBytes.length, commandBytes);
      cursor += 1;
    }

    frame[cursor] = CR;
    return frame;
  }

  private computeChecksum(dataLength: number, data: Uint8Array): number {
    let checksum = 0;
    checksum ^= (dataLength >> 16) & 0xff;
    checksum ^= (dataLength >> 8) & 0xff;
    checksum ^= dataLength & 0xff;

    for (const byte of data) {
      checksum ^= byte;
    }

    return checksum & 0xff;
  }

  private hasMeaningfulResponse(value: string): boolean {
    const lines = value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return false;
    }

    return lines.some((line) => line !== 'ACK');
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

  private resolveUseChecksum(): boolean {
    const rawValue = localStorage.getItem('machineSerial.useChecksum');
    return rawValue === null ? MACHINE_SERIAL_DEFAULTS.useChecksum : rawValue === 'true';
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

  private emitLine(line: string): void {
    const parsed = line.trim();
    if (!parsed.length) {
      return;
    }

    this.debugConsole('RX LINE', {
      decoded: this.escapeForLog(parsed),
      charCodes: this.toCharCodes(parsed),
    });
    this.dataSubject.next(parsed);
    this.appendToReadBuffer(parsed);
  }

  private appendToReadBuffer(value: string): void {
    this.rxBuffer.append(value);
    this.rxBuffer.append('\n');
    if (this.rxBuffer.length > 200_000) {
      this.rxBuffer.delete(0, this.rxBuffer.length - 50_000);
    }
  }

  private appendHexChunk(chunk: Uint8Array): void {
    if (!chunk.length) {
      return;
    }

    this.rxHexBuffer.append(this.toHex(chunk));
    this.rxHexBuffer.append('\n');
    if (this.rxHexBuffer.length > 200_000) {
      this.rxHexBuffer.delete(0, this.rxHexBuffer.length - 50_000);
    }
  }

  private clearReadBuffer(): void {
    this.rxBuffer.clear();
  }

  private clearReadState(): void {
    this.rxBuffer.clear();
    this.rxHexBuffer.clear();
    this.frameBuffer.length = 0;
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

  private debugConsole(label: string, payload: unknown): void {
    console.log(`[MachineSerial] ${label}`, payload);
  }

  private escapeForLog(value: string): string {
    return value.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  }

  private toHex(bytes: Iterable<number>): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
  }

  private toCharCodes(value: string): number[] {
    return Array.from(value).map((char) => char.charCodeAt(0));
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
