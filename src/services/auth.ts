import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private http = inject(HttpClient);
  private apiUrl = 'https://localhost:7192/api/auth/login';

  login(data: any) {
    return this.http.post(this.apiUrl, data);
  }
}
