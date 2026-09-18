import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface EngraveCommunicationSetting {
  id: number;
  ipAddress: string;
  port: number;
  isActive?: boolean;
  isDeleted?: boolean;
  createdDate?: string | null;
  updatedDate?: string | null;
  [key: string]: unknown;
}

export interface EngraveCommunicationPayload {
  ipAddress: string;
  port: number;
}

export interface UpdateEngraveCommunicationPayload extends EngraveCommunicationPayload {
  id: number;
}

export interface EngraveCommunicationIdPayload {
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class EngraveCommunicationService {
  private readonly apiUrl = `${API_BASE_URL}/engrave-communication`;

  constructor(private http: HttpClient) {}

  addCommunication(payload: EngraveCommunicationPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/add`, payload);
  }

  updateCommunication(payload: UpdateEngraveCommunicationPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/update`, payload);
  }

  deleteCommunication(payload: EngraveCommunicationIdPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/delete`, payload);
  }

  getAllCommunication(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/get-all`, {});
  }

  getActiveCommunication(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/get-active`, {});
  }
}
