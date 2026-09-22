import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface ZebraTestPrintResponse {
  ok: boolean;
  serviceConnected: boolean;
  printerConnected: boolean;
  printSent: boolean;
  code: number | null;
  message: string;
}

export interface ZebraConfigurationResponse {
  vehicleImageSettings?: {
    path?: string;
  };
  zebraLabelPrinter?: {
    vendorId?: string;
    productId?: string;
    port?: number;
    ip?: string;
    templateFile?: string;
  };
  [key: string]: any;
}

export interface ZebraPrintPayload {
  modelNo: string;
  vinNo: string;
  engineSrNo: string;
  description: string;
  qr: string;
  copies?: number;
}

export interface ZebraStatusCodeInfo {
  code: number;
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'error';
}

export const ZEBRA_STATUS_CODES: Record<number, ZebraStatusCodeInfo> = {
  0: {
    code: 0,
    title: 'SUCCESS',
    description: 'Test print completed successfully',
    tone: 'success',
  },
  1: {
    code: 1,
    title: 'MAC_MATCH_SUCCESS',
    description: 'MAC address matched and print succeeded',
    tone: 'success',
  },
  [-2]: {
    code: -2,
    title: 'DEVICE_NOT_FOUND',
    description: 'Zebra printer device was not found',
    tone: 'error',
  },
  [-3]: {
    code: -3,
    title: 'CREATEFILE_FAILED',
    description: 'Failed to create printer device file handle',
    tone: 'error',
  },
  [-4]: {
    code: -4,
    title: 'WRITE_FAILED',
    description: 'Failed to write print data to printer',
    tone: 'error',
  },
  [-10]: {
    code: -10,
    title: 'INVALID_VID_PID',
    description: 'Invalid Vendor ID or Product ID configuration',
    tone: 'error',
  },
  [-20]: {
    code: -20,
    title: 'ENUMERATION_FAILED',
    description: 'USB device enumeration failed',
    tone: 'error',
  },
  [-30]: {
    code: -30,
    title: 'MAC_MISMATCH',
    description: 'Device MAC address does not match configured MAC',
    tone: 'error',
  },
};

@Injectable({
  providedIn: 'root',
})
export class PrinterTestService {
  private http = inject(HttpClient);
  private baseUrl = API_BASE_URL;

  /**
   * Triggers test print on Zebra printer
   * Endpoint: POST /api/zebra/test-print
   */
  testPrint(): Observable<ZebraTestPrintResponse> {
    return this.http.post<ZebraTestPrintResponse>(`${this.baseUrl}/zebra/test-print`, {});
  }

  /**
   * Fetches the current configuration (Printer settings & Vehicle image settings)
   * Endpoint: GET /api/Configuration (with POST fallback if needed)
   */
  getConfiguration(): Observable<ZebraConfigurationResponse> {
    return this.http.get<ZebraConfigurationResponse>(`${this.baseUrl}/Configuration`).pipe(
      catchError((err) => {
        // Fallback to POST if server expects POST for /api/Configuration
        if (err.status === 405) {
          return this.http.post<ZebraConfigurationResponse>(`${this.baseUrl}/Configuration`, {});
        }
        return throwError(() => err);
      })
    );
  }

  /**
   * Sends custom print job to Zebra printer
   * Endpoint: POST /api/zebra/print
   */
  printLabel(payload: ZebraPrintPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/zebra/print`, payload);
  }

  /**
   * Returns metadata info for a given Zebra status code
   */
  getStatusCodeInfo(code: number | null | undefined): ZebraStatusCodeInfo | null {
    if (code === null || code === undefined) {
      return null;
    }
    return ZEBRA_STATUS_CODES[code] ?? {
      code,
      title: `CODE_${code}`,
      description: 'Unknown response status code',
      tone: code < 0 ? 'error' : 'warning',
    };
  }
}
