import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-config';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/auth/login`;

  login(data: any) {
    return this.http.post(this.apiUrl, data);
  }
}
