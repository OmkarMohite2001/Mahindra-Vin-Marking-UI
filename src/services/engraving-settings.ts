import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { API_BASE_URL } from './api-config';

export type EngravingTransport = 'serial' | 'ethernet';

export interface EngravingOption {
  value: string;
  label: string;
}

export interface EngravingSettingsModel {
  id: number | null;
  transport: EngravingTransport;
  fileName: string;
  ipAddress: string;
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  flowControl: string;
  isActive: boolean;
}

export interface EngravingSettingsByTransport {
  serial: EngravingSettingsModel;
  ethernet: EngravingSettingsModel;
}

export interface EngravingSettingsOptions {
  transports: EngravingOption[];
  ports: string[];
  baudRates: number[];
  dataBits: number[];
  stopBits: number[];
  parities: string[];
  flowControls: string[];
}

export interface EngravingSettingsResponse {
  ok: boolean;
  message: string;
  settings: EngravingSettingsModel;
  settingsByTransport: EngravingSettingsByTransport;
  options: EngravingSettingsOptions;
}

export interface UpdateEngravingSettingsPayload {
  id: number | null;
  transport: EngravingTransport;
  fileName: string;
  ipAddress: string;
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: string;
  flowControl: string;
}

@Injectable({
  providedIn: 'root',
})
export class EngravingSettingsApi {
  private http = inject(HttpClient);
  private getAllUrl = `${API_BASE_URL}/communication/get-all`;
  private updateUrl = `${API_BASE_URL}/communication/update`;

  getSettings(): Observable<EngravingSettingsResponse> {
    return this.http.get<unknown>(this.getAllUrl).pipe(
      map((response) => this.normalizeResponse(response)),
      catchError(() => of(this.createFallbackResponse())),
    );
  }

  updateSettings(payload: UpdateEngravingSettingsPayload): Observable<EngravingSettingsResponse> {
    const requestBody = this.toUpdateRequest(payload);

    return this.http.post<unknown>(this.updateUrl, requestBody).pipe(
      map((response) => this.normalizeResponse(response, payload)),
      catchError(() =>
        this.http.put<unknown>(this.updateUrl, requestBody).pipe(
          map((response) => this.normalizeResponse(response, payload)),
        ),
      ),
    );
  }

  createFallbackResponse(): EngravingSettingsResponse {
    const serialSettings: EngravingSettingsModel = {
      id: 1,
      transport: 'serial',
      fileName: 'TEST',
      ipAddress: '',
      port: 'COM4',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'None',
      flowControl: 'None',
      isActive: true,
    };

    const ethernetSettings: EngravingSettingsModel = {
      id: 2,
      transport: 'ethernet',
      fileName: 'TEST',
      ipAddress: '192.168.0.100',
      port: '5000',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'None',
      flowControl: 'None',
      isActive: false,
    };

    return {
      ok: true,
      message: 'Fallback communication settings loaded',
      settings: { ...serialSettings },
      settingsByTransport: {
        serial: { ...serialSettings },
        ethernet: { ...ethernetSettings },
      },
      options: {
        transports: [
          { value: 'serial', label: 'Serial' },
          { value: 'ethernet', label: 'Ethernet' },
        ],
        ports: Array.from({ length: 15 }, (_, index) => `COM${index + 1}`),
        baudRates: [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200],
        dataBits: [5, 6, 7, 8],
        stopBits: [1, 1.5, 2],
        parities: ['None', 'Even', 'Odd', 'Mark', 'Space'],
        flowControls: ['None', 'RTS/CTS', 'XON/XOFF'],
      },
    };
  }

  private normalizeResponse(
    response: unknown,
    requestedSettings?: UpdateEngravingSettingsPayload,
  ): EngravingSettingsResponse {
    const fallback = this.createFallbackResponse();
    const root = this.asRecord(response);
    const settingsByTransport = this.cloneSettingsByTransport(fallback.settingsByTransport);
    let selectedTransport: EngravingTransport =
      requestedSettings?.transport ?? fallback.settings.transport;
    let activeTransport: EngravingTransport | null = null;
    let hasResponseSettings = false;

    const data = root['data'];

    if (Array.isArray(data)) {
      for (const entry of data) {
        const normalized = this.normalizeSettingsRecord(entry, settingsByTransport);
        if (!normalized) {
          continue;
        }

        settingsByTransport[normalized.transport] = normalized;
        hasResponseSettings = true;

        if (normalized.isActive) {
          activeTransport = normalized.transport;
        }
      }
    } else {
      const normalized = this.normalizeSettingsRecord(data, settingsByTransport, requestedSettings?.transport);
      if (normalized) {
        settingsByTransport[normalized.transport] = normalized;
        selectedTransport = normalized.transport;
        hasResponseSettings = true;
      }
    }

    if (requestedSettings) {
      settingsByTransport[requestedSettings.transport] = this.normalizeRequestedSettings(
        requestedSettings,
        settingsByTransport[requestedSettings.transport],
      );
      selectedTransport = requestedSettings.transport;
    } else if (activeTransport) {
      selectedTransport = activeTransport;
    }

    if (!hasResponseSettings && !requestedSettings) {
      selectedTransport = fallback.settings.transport;
    }

    return {
      ok: typeof root['ok'] === 'boolean' ? root['ok'] : true,
      message:
        typeof root['message'] === 'string' && root['message'].trim().length
          ? root['message']
          : requestedSettings
            ? 'Communication settings updated successfully'
            : fallback.message,
      settings: { ...settingsByTransport[selectedTransport] },
      settingsByTransport,
      options: fallback.options,
    };
  }

  private toUpdateRequest(payload: UpdateEngravingSettingsPayload): Record<string, unknown> {
    const normalizedTransport = payload.transport;
    const serialPort = normalizedTransport === 'serial' ? this.normalizeSerialPort(payload.port) : null;
    const ethernetPort =
      normalizedTransport === 'ethernet' ? this.toNullableNumber(payload.port) : null;

    return {
      id: payload.id,
      communicationType: this.toApiCommunicationType(normalizedTransport),
      serialPort,
      baudRate: normalizedTransport === 'serial' ? payload.baudRate : null,
      dataBits: normalizedTransport === 'serial' ? payload.dataBits : null,
      stopBits: normalizedTransport === 'serial' ? payload.stopBits : null,
      parity: normalizedTransport === 'serial' ? payload.parity : null,
      flowControl: normalizedTransport === 'serial' ? payload.flowControl : null,
      ipAddress: normalizedTransport === 'ethernet' ? this.toNullableString(payload.ipAddress) : null,
      port: ethernetPort,
      engravingFileName: this.toNullableString(payload.fileName),
    };
  }

  private normalizeSettingsRecord(
    value: unknown,
    currentSettings: EngravingSettingsByTransport,
    transportOverride?: EngravingTransport,
  ): EngravingSettingsModel | null {
    const item = this.asRecord(value);
    if (!Object.keys(item).length && !transportOverride) {
      return null;
    }

    const transport = this.normalizeTransport(
      item['communicationType'] ?? item['transport'] ?? transportOverride,
    );
    const fallback = currentSettings[transport];
    const rawPort =
      item['serialPort'] ??
      item['serialPortName'] ??
      item['portName'] ??
      item['port'] ??
      fallback.port;

    return {
      id: this.toNullableNumber(item['id']) ?? fallback.id,
      transport,
      fileName:
        this.toNullableString(
          item['engravingFileName'] ?? item['fileName'] ?? item['template'],
        ) ?? fallback.fileName,
      ipAddress:
        transport === 'ethernet'
          ? this.toNullableString(item['ipAddress'] ?? item['ip']) ?? fallback.ipAddress
          : '',
      port:
        transport === 'serial'
          ? this.normalizeSerialPort(rawPort ?? fallback.port)
          : this.normalizeEthernetPort(rawPort ?? fallback.port),
      baudRate:
        transport === 'serial'
          ? this.toNumberValue(item['baudRate'], fallback.baudRate)
          : fallback.baudRate,
      dataBits:
        transport === 'serial'
          ? this.toNumberValue(item['dataBits'], fallback.dataBits)
          : fallback.dataBits,
      stopBits:
        transport === 'serial'
          ? this.normalizeStopBits(item['stopBits'] ?? fallback.stopBits)
          : fallback.stopBits,
      parity:
        transport === 'serial'
          ? this.toNullableString(item['parity']) ?? fallback.parity
          : fallback.parity,
      flowControl:
        transport === 'serial'
          ? this.normalizeFlowControl(item['flowControl'] ?? item['handshake'] ?? fallback.flowControl)
          : fallback.flowControl,
      isActive: this.toBooleanValue(item['isActive'], fallback.isActive),
    };
  }

  private normalizeRequestedSettings(
    payload: UpdateEngravingSettingsPayload,
    fallback: EngravingSettingsModel,
  ): EngravingSettingsModel {
    return {
      id: payload.id ?? fallback.id,
      transport: payload.transport,
      fileName: payload.fileName.trim() || fallback.fileName,
      ipAddress: payload.transport === 'ethernet' ? payload.ipAddress.trim() : '',
      port:
        payload.transport === 'serial'
          ? this.normalizeSerialPort(payload.port)
          : this.normalizeEthernetPort(payload.port),
      baudRate: payload.transport === 'serial' ? payload.baudRate : fallback.baudRate,
      dataBits: payload.transport === 'serial' ? payload.dataBits : fallback.dataBits,
      stopBits: payload.transport === 'serial' ? payload.stopBits : fallback.stopBits,
      parity: payload.transport === 'serial' ? payload.parity : fallback.parity,
      flowControl: payload.transport === 'serial' ? payload.flowControl : fallback.flowControl,
      isActive: true,
    };
  }

  private cloneSettingsByTransport(
    settingsByTransport: EngravingSettingsByTransport,
  ): EngravingSettingsByTransport {
    return {
      serial: { ...settingsByTransport.serial },
      ethernet: { ...settingsByTransport.ethernet },
    };
  }

  private normalizeTransport(value: unknown): EngravingTransport {
    const text = this.toNullableString(value)?.toLowerCase();
    return text === 'ethernet' ? 'ethernet' : 'serial';
  }

  private toApiCommunicationType(transport: EngravingTransport): 'Serial' | 'Ethernet' {
    return transport === 'ethernet' ? 'Ethernet' : 'Serial';
  }

  private normalizeSerialPort(value: unknown): string {
    const text = this.toNullableString(value)?.toUpperCase();
    if (!text) {
      return 'COM1';
    }

    return text.startsWith('COM') ? text : `COM${text}`;
  }

  private normalizeEthernetPort(value: unknown): string {
    const text = this.toNullableString(value);
    return text || '5000';
  }

  private normalizeStopBits(value: unknown): number {
    const text = this.toNullableString(value)?.toLowerCase();
    if (!text) {
      return 1;
    }

    switch (text) {
      case '1.5':
      case 'onepointfive':
      case 'oneandhalf':
        return 1.5;
      case '2':
      case 'two':
        return 2;
      default:
        return 1;
    }
  }

  private normalizeFlowControl(value: unknown): string {
    const text = this.toNullableString(value)?.toLowerCase().replace(/[\s/_-]+/g, '');
    switch (text) {
      case 'requesttosend':
      case 'rtscts':
      case 'hardware':
        return 'RTS/CTS';
      case 'xonxoff':
        return 'XON/XOFF';
      default:
        return 'None';
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }

  private toNullableString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length ? value.trim() : null;
  }

  private toNullableNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private toNumberValue(value: unknown, fallback: number): number {
    return this.toNullableNumber(value) ?? fallback;
  }

  private toBooleanValue(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }
}
