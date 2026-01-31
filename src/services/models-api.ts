import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ModelsApi {
  private http = inject(HttpClient);

  private apiUrl = 'https://localhost:7192/api/model/get-by-modelno';

  getModelDetails(modelNo: string) {
    const payload = { modelNo: modelNo };
    return this.http.post(this.apiUrl, payload);
  }
}
