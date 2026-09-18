import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface MachineConnectionPayload {
  ip: string;
  port: number;
  timeoutMs?: number | null;
}

export interface MachineSendPayload {
  command: string;
  readTimeoutMs?: number | null;
  lineEnding?: string | null;
}

export interface EngraveRunPayload {
  ip: string;
  port: number;
  template: string;
  parameters: string[];
  interDelayMs?: number | null;
  readTimeoutMs?: number | null;
  completionToken?: string | null;
  lineEnding?: string | null;
}

export interface EngraveRunWithParameterPayload {
  parameters: string[];
  isReengrave?: boolean;
}

export interface EngraveRunSerialPayload {
  comPort: string;
  baudRate?: number | null;
  template: string;
  parameters: string[];
  lineEnding?: string | null;
  interDelayMs?: number | null;
  readTimeoutMs?: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class EngraveMachineService {
  private readonly apiUrl = `${API_BASE_URL}/engrave`;

  constructor(private http: HttpClient) {}

  health(ip: string, port: number): Observable<unknown> {
    const params = new HttpParams().set('ip', ip).set('port', port);
    return this.http.get(`${this.apiUrl}/machine/health`, { params });
  }

  connect(payload: MachineConnectionPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/machine/connect`, payload);
  }

  disconnect(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/machine/disconnect`, {});
  }

  status(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/machine/status`);
  }

  readLatest(clear = false): Observable<unknown> {
    const params = new HttpParams().set('clear', clear);
    return this.http.get(`${this.apiUrl}/machine/read-latest`, { params });
  }

  send(payload: MachineSendPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/machine/send`, payload);
  }

  run(payload: EngraveRunPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/run`, payload);
  }

  runWithParameter(payload: EngraveRunWithParameterPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/runwithparameter`, payload);
  }

  runSerial(payload: EngraveRunSerialPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/run-serial`, payload);
  }

  runDynamic(payload: EngraveRunWithParameterPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/run-dynamic`, payload);
  }
}
