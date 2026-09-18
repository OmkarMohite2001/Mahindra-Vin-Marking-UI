import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface EngraveTemplate {
  id: number;
  countryCode: string;
  countryName: string;
  templateName: string;
  isActive?: boolean;
  isDeleted?: boolean;
  createdDate?: string | null;
  updatedDate?: string | null;
  [key: string]: unknown;
}

export interface EngraveTemplatePayload {
  countryCode: string;
  countryName: string;
  templateName: string;
}

export interface UpdateEngraveTemplatePayload extends EngraveTemplatePayload {
  id: number;
}

export interface TemplateIdPayload {
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class TemplateService {
  private readonly apiUrl = `${API_BASE_URL}/engrave-template`;

  constructor(private http: HttpClient) {}

  addTemplate(payload: EngraveTemplatePayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/add`, payload);
  }

  updateTemplate(payload: UpdateEngraveTemplatePayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/update`, payload);
  }

  deleteTemplate(payload: TemplateIdPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/delete`, payload);
  }

  getAllTemplates(): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/get-all`, {});
  }

  getTemplateById(payload: TemplateIdPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/get-by-id`, payload);
  }
}
