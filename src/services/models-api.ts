import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-config';

@Injectable({
  providedIn: 'root',
})
export class ModelsApi {
  private http = inject(HttpClient);

  private apiUrl = `${API_BASE_URL}/model/get-by-modelno`;

  getModelDetails(modelNo: string) {
    const payload = { modelNo: modelNo };
    return this.http.post(this.apiUrl, payload);
  }
}
