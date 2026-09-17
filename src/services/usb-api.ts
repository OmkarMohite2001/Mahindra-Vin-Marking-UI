import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface UsbEndpointConfig {
  method: 'GET' | 'POST';
  path: string;
  tone: 'blue' | 'green';
  locked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class UsbApi {
  private http = inject(HttpClient);
  private readonly baseUrl = API_BASE_URL;

  readonly defaultEndpoints: UsbEndpointConfig[] = [
    { method: 'GET', path: '/api/Usb/devices', tone: 'blue', locked: true },
    { method: 'POST', path: '/api/Usb/tspl_print', tone: 'green', locked: true },
    { method: 'POST', path: '/api/Usb/print', tone: 'green', locked: true },
    { method: 'POST', path: '/api/Usb/printinone', tone: 'green', locked: true },
  ];

  getEndpointCatalog(): Observable<UsbEndpointConfig[]> {
    return this.http.get<UsbEndpointConfig[]>(`${this.baseUrl}/Usb/devices`).pipe(
      // If backend returns list of endpoints, use it; otherwise fall back to the known USB contract.
      // This keeps the UI functional even when the service is not available yet.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      // no-op, fallback handled by component if the response is not shaped as expected.
      // Additional real API shaping can be added here when backend contract is finalized.
    );
  }

  getDevices(): Observable<unknown> {
    return this.http.get(`${this.baseUrl}/Usb/devices`);
  }

  printTspL(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/Usb/tspl_print`, payload);
  }

  print(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/Usb/print`, payload);
  }

  printInOne(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/Usb/printinone`, payload);
  }

  printInfo(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/Usb/printinfo`, payload);
  }

  getFallbackEndpoints(): UsbEndpointConfig[] {
    return this.defaultEndpoints;
  }
}
