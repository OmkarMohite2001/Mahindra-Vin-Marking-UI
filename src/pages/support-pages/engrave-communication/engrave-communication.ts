import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import {
  EngraveCommunicationService,
  EngraveCommunicationSetting,
  UpdateEngraveCommunicationPayload,
} from '../../../services/engrave-communication-service';

@Component({
  selector: 'app-engrave-communication',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './engrave-communication.html',
  styleUrl: './engrave-communication.scss',
})
export class EngraveCommunication {
  private fb = inject(FormBuilder);
  private engraveCommunicationService = inject(EngraveCommunicationService);
  private snackBar = inject(MatSnackBar);

  communicationList: EngraveCommunicationSetting[] = [];
  selectedCommunication: EngraveCommunicationSetting | null = null;
  loadingCommunication = false;
  savingCommunication = false;
  statusMessage = '';
  statusTone: 'success' | 'error' | 'info' = 'info';

  private readonly ipPattern =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

  communicationForm = this.fb.nonNullable.group({
    id: [0, [Validators.required, Validators.min(1)]],
    ipAddress: ['', [Validators.required, Validators.pattern(this.ipPattern)]],
    port: [0, [Validators.required, Validators.min(1), Validators.max(65535)]],
  });

  ngOnInit(): void {
    this.loadCommunication();
  }

  get activeCount(): number {
    return this.communicationList.filter((item) => item.isActive).length;
  }

  get selectedIdLabel(): string {
    return this.selectedCommunication ? `ID ${this.selectedCommunication.id}` : 'No record selected';
  }

  loadCommunication(): void {
    this.loadingCommunication = true;
    this.engraveCommunicationService
      .getAllCommunication()
      .pipe(finalize(() => (this.loadingCommunication = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(
            response,
            'Engrave communication settings fetched successfully.',
          );
          this.communicationList = this.extractCommunicationSettings(response);
          this.statusMessage = result.ok
            ? this.communicationList.length
              ? ''
              : 'No engrave communication settings found.'
            : result.message;
          this.statusTone = result.ok ? 'info' : 'error';

          const firstActive =
            this.communicationList.find((item) => item.isActive) ?? this.communicationList[0] ?? null;
          if (firstActive) {
            this.editCommunication(firstActive);
          } else {
            this.resetForm();
          }
        },
        error: (error) => {
          this.communicationList = [];
          this.resetForm();
          this.setStatus(
            this.readErrorMessage(error, 'Unable to fetch engrave communication settings.'),
            'error',
          );
        },
      });
  }

  updateCommunication(): void {
    if (this.communicationForm.invalid) {
      this.communicationForm.markAllAsTouched();
      return;
    }

    const value = this.communicationForm.getRawValue();
    const payload: UpdateEngraveCommunicationPayload = {
      id: value.id,
      ipAddress: value.ipAddress.trim(),
      port: Number(value.port),
    };

    this.savingCommunication = true;
    this.engraveCommunicationService
      .updateCommunication(payload)
      .pipe(finalize(() => (this.savingCommunication = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(
            response,
            'Engrave communication settings updated successfully.',
          );
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');

          if (result.ok) {
            this.loadCommunication();
          }
        },
        error: (error) => {
          const message = this.readErrorMessage(
            error,
            'Unable to update engrave communication settings.',
          );
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  editCommunication(item: EngraveCommunicationSetting): void {
    this.selectedCommunication = item;
    this.communicationForm.reset({
      id: item.id,
      ipAddress: item.ipAddress,
      port: item.port,
    });
  }

  resetForm(): void {
    this.selectedCommunication = null;
    this.communicationForm.reset({
      id: 0,
      ipAddress: '',
      port: 0,
    });
  }

  trackByCommunicationId(_: number, item: EngraveCommunicationSetting): number {
    return item.id;
  }

  private extractCommunicationSettings(response: unknown): EngraveCommunicationSetting[] {
    const responseValue = this.parseJsonIfNeeded(response);
    const root = this.toRecord(responseValue);
    const dataArray = this.extractArrayFromResponse(root, responseValue);

    if (!Array.isArray(dataArray)) {
      return [];
    }

    return dataArray
      .map((item) => this.mapCommunicationSetting(item))
      .filter((item): item is EngraveCommunicationSetting => item !== null)
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.id - b.id);
  }

  private extractArrayFromResponse(
    root: Record<string, unknown> | null,
    responseValue: unknown,
  ): unknown[] | null {
    if (Array.isArray(responseValue)) {
      return responseValue;
    }

    if (!root) {
      return null;
    }

    const topLevelArray = this.readArrayValue(root, [
      'data',
      'items',
      'result',
      'settings',
      'engraveCommunication',
    ]);
    if (topLevelArray) {
      return topLevelArray;
    }

    const dataObject = this.toRecord(root['data']);
    if (dataObject) {
      return this.readArrayValue(dataObject, [
        'data',
        'items',
        'result',
        'settings',
        'engraveCommunication',
      ]);
    }

    return null;
  }

  private mapCommunicationSetting(value: unknown): EngraveCommunicationSetting | null {
    const source = this.toRecord(value);
    if (!source) {
      return null;
    }

    const id = this.toNumber(this.readValue(source, ['id', 'communicationId']));
    const ipAddress = this.toStringValue(this.readValue(source, ['ipAddress', 'ip']));
    const port = this.toNumber(this.readValue(source, ['port']));

    if (id === null || !ipAddress || port === null) {
      return null;
    }

    return {
      ...source,
      id,
      ipAddress,
      port,
      isActive: this.toBoolean(this.readValue(source, ['isActive', 'active'])),
      isDeleted: this.toBoolean(this.readValue(source, ['isDeleted', 'deleted'])),
      createdDate: this.toNullableString(this.readValue(source, ['createdDate', 'createdOn'])),
      updatedDate: this.toNullableString(this.readValue(source, ['updatedDate', 'updatedOn'])),
    };
  }

  private resolveApiResult(
    response: unknown,
    successFallbackMessage: string,
  ): { ok: boolean; message: string } {
    const root = this.toRecord(this.parseJsonIfNeeded(response));
    const successRaw = this.readValue(root ?? {}, ['ok', 'success', 'isSuccess']);
    const dataRaw = this.readValue(root ?? {}, ['data']);
    const messageRaw = this.readValue(root ?? {}, ['message', 'errorMessage']);

    let ok = true;
    if (typeof successRaw === 'boolean') {
      ok = successRaw;
    } else if (typeof dataRaw === 'boolean') {
      ok = dataRaw;
    }

    const message =
      typeof messageRaw === 'string' && messageRaw.trim().length
        ? messageRaw
        : ok
          ? successFallbackMessage
          : 'Operation failed.';

    return { ok, message };
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const root = this.toRecord(error);
    const responseError = this.toRecord(root?.['error']);
    const message =
      this.toStringValue(responseError?.['message']) ||
      this.toStringValue(responseError?.['errorMessage']) ||
      this.toStringValue(root?.['message']);

    return message || fallback;
  }

  private showSnack(message: string, ok: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ok ? ['snackbar-success'] : ['snackbar-error'],
    });
  }

  private setStatus(message: string, tone: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
  }

  private parseJsonIfNeeded(value: unknown): unknown {
    if (typeof value !== 'string') {
      return value;
    }

    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

  private readArrayValue(source: Record<string, unknown> | null, keys: string[]): unknown[] | null {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }

    return null;
  }

  private readValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (source[key] !== undefined) {
        return source[key];
      }
    }

    return undefined;
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'active';
    }

    return false;
  }

  private toStringValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }

    return '';
  }

  private toNullableString(value: unknown): string | null {
    const stringValue = this.toStringValue(value);
    return stringValue || null;
  }

}
