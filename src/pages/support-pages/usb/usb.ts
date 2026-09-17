import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { UsbApi, UsbEndpointConfig } from '../../../services/usb-api';

@Component({
  selector: 'app-usb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './usb.html',
  styleUrl: './usb.scss',
})
export class Usb implements OnInit {
  private readonly usbApi = inject(UsbApi);
  private readonly cdr = inject(ChangeDetectorRef);

  endpoints: UsbEndpointConfig[] = [];
  expandedIndex: number | null = 0;
  requestBody = '';
  responseText = '';
  responseCode = 0;
  responseDescription = 'Awaiting response';
  selectedContentType = 'application/json';
  isLoading = false;

  ngOnInit(): void {
    this.usbApi.getEndpointCatalog().subscribe({
      next: (response) => {
        this.endpoints = Array.isArray(response) && response.length > 0
          ? response
          : this.usbApi.getFallbackEndpoints();
        this.expandedIndex = this.endpoints.length > 0 ? 0 : null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.endpoints = this.usbApi.getFallbackEndpoints();
        this.expandedIndex = 0;
        this.cdr.markForCheck();
      },
    });
  }

  cleanPath(path: string): string {
    return path ? path.replace(/^\//, '') : path;
  }

  toggleEndpoint(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
    this.cdr.markForCheck();
  }

  getActiveEndpoint(): UsbEndpointConfig | null {
    if (this.expandedIndex === null || !this.endpoints[this.expandedIndex]) {
      return null;
    }

    return this.endpoints[this.expandedIndex];
  }

  executeActiveEndpoint(): void {
    const active = this.getActiveEndpoint();
    if (!active) {
      return;
    }

    const payload = this.parseRequestBody();
    const request$ = this.getEndpointRequest$(active, payload);

    if (!request$) {
      this.responseCode = 400;
      this.responseDescription = 'Unsupported endpoint';
      this.responseText = JSON.stringify({
        message: 'No matching USB API method was found for the selected endpoint.',
      }, null, 2);
      this.cdr.markForCheck();
      return;
    }

    this.isLoading = true;
    request$.subscribe({
      next: (result) => {
        this.responseCode = 200;
        this.responseDescription = 'Success';
        this.responseText = this.stringifyResponse(result);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.responseCode = error.status || 500;
        this.responseDescription = error.statusText || 'Request failed';
        this.responseText = this.stringifyResponse({
          error: error.error ?? error.message,
          status: error.status,
          message: error.message,
        });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  resetRequest(): void {
    this.requestBody = '';
    this.responseText = '';
    this.responseCode = 0;
    this.responseDescription = 'Awaiting response';
    this.cdr.markForCheck();
  }

  private parseRequestBody(): unknown {
    const trimmed = this.requestBody.trim();
    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private getEndpointRequest$(active: UsbEndpointConfig, payload: unknown): Observable<unknown> | null {
    const normalizedPath = active.path.toLowerCase();

    if (normalizedPath.includes('devices')) {
      return this.usbApi.getDevices();
    }

    if (normalizedPath.includes('tspl_print')) {
      return this.usbApi.printTspL(payload);
    }

    if (normalizedPath.includes('printinfo')) {
      return this.usbApi.printInfo(payload);
    }

    if (normalizedPath.includes('print')) {
      return this.usbApi.print(payload);
    }

    return null;
  }

  private stringifyResponse(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
