import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface ProductionReportRecord {
  sequenceID: number;
  modelCode: string;
  viN_NO: string;
  serialNo: string;
  country: string;
  engineNo: string;
  rollingDate: string;
  shift: string;
  colour: string;
  vehical: string;
  verient: string;
  drive: string;
  rhdlhd: string;
  emission: string;
  market: string;
  enginE_TYPE: string;
  engraveCount: string;
  reEngraveDateTime: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ProductionDataReportApi {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/production`;

  addProduction(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/add`, payload);
  }

  getByVin(payload: { vinNo: string }): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/get-by-vin`, payload);
  }

  getAll(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/get-all`);
  }

  reengrave(payload: unknown): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/reengrave`, payload);
  }
}
