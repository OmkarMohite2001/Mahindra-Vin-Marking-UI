import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_BASE_URL } from './api-config';

export interface EngraveRequest {
  parameters: string[];
}

export interface EngraveResponse {
  ok: boolean;
  message: string;
  ip?: string;
  port?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EngraveApi {
  private http = inject(HttpClient);
  private baseUrl = API_BASE_URL;

  runWithParameter(payload: EngraveRequest) {
    return this.http.post<EngraveResponse>(`${this.baseUrl}/engrave/runwithparameter`, payload);
  }
}
