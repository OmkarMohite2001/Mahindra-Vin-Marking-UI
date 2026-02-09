import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_RENDER_URL } from './api-config';

export interface Job {
  id: number;
  text: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  output: any;
  message: string;
}
@Injectable({
  providedIn: 'root',
})

export class Engraving {
   constructor(private http: HttpClient) {}

  // 1. Create Job (Send commands to backend)
  createJob(text: string): Observable<{ message: string, job: Job }> {
    return this.http.post<{ message: string, job: Job }>(`${API_RENDER_URL}/jobs`, { text });
  }

  // 2. Check Job Status
  getJob(id: number): Observable<Job> {
    return this.http.get<Job>(`${API_RENDER_URL}/jobs/${id}`);
  }
}
