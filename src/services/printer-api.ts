import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from './api-config';

@Injectable({
  providedIn: 'root',
})
export class PrinterApi {
  private http = inject(HttpClient);
  private baseUrl = API_BASE_URL;

  getLabelPreview(payload: any) {
    return this.http.post(`${this.baseUrl}/label/preview`, payload, { responseType: 'blob' });
  }

  printLabel(payload: any) {
    return this.http.post(`${this.baseUrl}/zebra/print`, payload);
  }
  // printLabel(payload: any) {
  //   return this.http.post(`${this.baseUrl}/Usb/print`, payload);
  // }
}
