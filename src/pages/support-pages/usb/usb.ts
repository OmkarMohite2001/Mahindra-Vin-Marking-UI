import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './usb.html',
  styleUrls: ['./usb.scss'],
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
  responseState: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  selectedContentType = 'application/json';
  isLoading = false;
  lastUpdatedAt = '';

  ngOnInit(): void {
    this.usbApi.getEndpointCatalog().subscribe({
      next: (response) => {
        this.endpoints = this.resolveEndpoints(response);
        this.expandedIndex = this.endpoints.length > 0 ? 0 : null;
        this.applyDefaultRequestBody();
        this.refreshView(true);
      },
      error: () => {
        this.endpoints = this.usbApi.getFallbackEndpoints();
        this.expandedIndex = 0;
        this.applyDefaultRequestBody();
        this.refreshView(true);
      },
    });
  }

  cleanPath(path: string): string {
    return path ? path.replace(/^\//, '') : path;
  }

  toggleEndpoint(index: number): void {
    this.expandedIndex = index;
    this.applyDefaultRequestBody();
    this.refreshView();
  }

  getActiveEndpoint(): UsbEndpointConfig | null {
    if (this.expandedIndex === null || !this.endpoints[this.expandedIndex]) {
      return null;
    }

    return this.endpoints[this.expandedIndex];
  }

  hasRequestBody(endpoint: UsbEndpointConfig): boolean {
    return endpoint.method !== 'GET';
  }

  get responseStatusLabel(): string {
    if (this.responseState === 'loading') {
      return 'Running';
    }

    return this.responseCode ? String(this.responseCode) : 'Ready';
  }

  get getEndpointCount(): number {
    return this.endpoints.filter((endpoint) => endpoint.method === 'GET').length;
  }

  get postEndpointCount(): number {
    return this.endpoints.filter((endpoint) => endpoint.method === 'POST').length;
  }

  get activeEndpointLabel(): string {
    const active = this.getActiveEndpoint();
    return active ? `${active.method} /${this.cleanPath(active.path)}` : 'No endpoint selected';
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
      this.responseState = 'error';
      this.lastUpdatedAt = this.getCurrentTime();
      this.refreshView();
      return;
    }

    this.isLoading = true;
    this.responseCode = 0;
    this.responseDescription = `Running ${active.method} /${this.cleanPath(active.path)}`;
    this.responseText = 'Waiting for API response...';
    this.responseState = 'loading';
    this.lastUpdatedAt = this.getCurrentTime();
    this.refreshView(true);

    request$.subscribe({
      next: (result) => {
        this.responseCode = 200;
        this.responseDescription = 'Success';
        this.responseText = this.stringifyResponse(result);
        this.responseState = 'success';
        this.isLoading = false;
        this.lastUpdatedAt = this.getCurrentTime();
        this.refreshView(true);
      },
      error: (error: HttpErrorResponse) => {
        this.responseCode = error.status || 500;
        this.responseDescription = error.statusText || 'Request failed';
        this.responseText = this.stringifyResponse({
          error: error.error ?? error.message,
          status: error.status,
          message: error.message,
        });
        this.responseState = 'error';
        this.isLoading = false;
        this.lastUpdatedAt = this.getCurrentTime();
        this.refreshView(true);
      },
    });
  }

  resetRequest(): void {
    this.applyDefaultRequestBody();
    this.responseText = '';
    this.responseCode = 0;
    this.responseDescription = 'Awaiting response';
    this.responseState = 'idle';
    this.lastUpdatedAt = '';
    this.refreshView();
  }

  private parseRequestBody(): unknown {
    const trimmed = this.requestBody.trim();
    if (this.selectedContentType === 'text/plain') {
      return trimmed;
    }

    if (!trimmed) {
      return {};
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  private applyDefaultRequestBody(): void {
    const active = this.getActiveEndpoint();
    this.requestBody = active ? this.getDefaultRequestBody(active) : '';
  }

  private getDefaultRequestBody(endpoint: UsbEndpointConfig): string {
    const normalizedPath = endpoint.path.toLowerCase();

    if (!this.hasRequestBody(endpoint)) {
      return '';
    }

    if (normalizedPath.includes('tspl_print')) {
      return this.stringifyResponse({
        printData: 'string',
        vendorId: 'string',
        productId: 'string',
        useMacValidation: true,
        macAddressList: 'string',
        matchMacAddress: 'string',
        noOfBytes: 0,
      });
    }

    if (normalizedPath.includes('printinone') || normalizedPath.includes('printinfo')) {
      return this.stringifyResponse({
        command: '1203|0230|false||^^NO|45|CLS\r\nTEXT 10,10,"0",0,10,10,"www.credentialsintegrated.com"\r\nPRINT 1,1\r\nEOJ\r\n',
      });
    }

    if (normalizedPath.includes('print')) {
      return this.stringifyResponse({
        modelNo: 'string',
        vinNo: 'string',
        engineSrNo: 'string',
        description: 'string',
        qr: 'string',
      });
    }

    return '';
  }

  private resolveEndpoints(response: unknown): UsbEndpointConfig[] {
    if (Array.isArray(response)) {
      const endpoints = response.filter((item): item is UsbEndpointConfig =>
        this.isEndpointConfig(item),
      );

      if (endpoints.length > 0) {
        return endpoints;
      }
    }

    return this.usbApi.getFallbackEndpoints();
  }

  private isEndpointConfig(value: unknown): value is UsbEndpointConfig {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const endpoint = value as Partial<UsbEndpointConfig>;
    const isMethodValid = endpoint.method === 'GET' || endpoint.method === 'POST';
    const isToneValid = endpoint.tone === 'blue' || endpoint.tone === 'green';

    return isMethodValid && typeof endpoint.path === 'string' && isToneValid;
  }

  private getEndpointRequest$(active: UsbEndpointConfig, payload: unknown): Observable<unknown> | null {
    const normalizedPath = active.path.toLowerCase();

    if (normalizedPath.includes('devices')) {
      return this.usbApi.getDevices();
    }

    if (normalizedPath.includes('tspl_print')) {
      return this.usbApi.printTspL(payload);
    }

    if (normalizedPath.includes('printinone')) {
      return this.usbApi.printInOne(payload);
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

  private getCurrentTime(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private refreshView(immediate = false): void {
    this.cdr.markForCheck();

    if (immediate) {
      this.cdr.detectChanges();
    }
  }
}
