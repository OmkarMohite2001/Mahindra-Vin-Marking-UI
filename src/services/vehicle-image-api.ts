import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from './api-config';

@Injectable({
  providedIn: 'root',
})
export class VehicleImageApi {
  private http = inject(HttpClient);

  private apiUrl = `${API_BASE_URL}/vehicle-image`;

  // Upload single image
  uploadImage(formData: FormData) {
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  // Bulk upload images
  bulkUploadImages(formData: FormData) {
    return this.http.post(`${this.apiUrl}/bulk-upload`, formData);
  }

  // Get vehicle images
  getVehicleImages(payload: any) {
    return this.http.post(`${this.apiUrl}/get`, payload);
  }
}
