import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from './api-config';

export interface UserManagementRecord {
  userId: number;
  userName: string;
  userRole: string;
  isActive: boolean;
}

export interface AddUserPayload {
  userName: string;
  password: string;
  userRole: string;
  createdBy: string;
}

export interface UpdateUserPayload {
  userId: number;
  userName: string;
  userRole: string;
  updatedBy: string;
}

export interface UpdateUserStatusPayload {
  userId: number;
  isActive: boolean;
  updatedBy: string;
}

export interface DeleteUserPayload {
  userId: number;
  updatedBy: string;
}

export interface ResetUserPasswordPayload {
  userId: number;
  userName: string;
  newPassword: string;
  updatedBy: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementApi {
  private http = inject(HttpClient);
  private apiUrl = `${API_BASE_URL}/users`;

  addUser(payload: AddUserPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/add`, payload);
  }

  updateUser(payload: UpdateUserPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/update`, payload);
  }

  updateUserStatus(payload: UpdateUserStatusPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/status`, payload);
  }

  deleteUser(payload: DeleteUserPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/delete`, payload);
  }

  getAllUsers(): Observable<unknown> {
    return this.http.get(`${this.apiUrl}/all`);
  }

  resetUserPassword(payload: ResetUserPasswordPayload): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/reset-user-password`, payload);
  }
}
