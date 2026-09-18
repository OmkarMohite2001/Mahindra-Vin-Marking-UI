import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import {
  EngraveTemplate,
  TemplateService,
  UpdateEngraveTemplatePayload,
} from '../../../services/template-service';

@Component({
  selector: 'app-templates',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './templates.html',
  styleUrl: './templates.scss',
})
export class Templates implements OnInit {
  private fb = inject(FormBuilder).nonNullable;
  private templateService = inject(TemplateService);
  private snackBar = inject(MatSnackBar);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  templates: EngraveTemplate[] = [];
  selectedTemplate: EngraveTemplate | null = null;
  searchTerm = '';
  loadingTemplates = false;
  savingTemplate = false;
  deletingTemplateId: number | null = null;
  statusMessage = '';
  statusTone: 'success' | 'error' | 'info' = 'info';

  templateForm = this.fb.group({
    countryCode: ['', [Validators.required, Validators.maxLength(20)]],
    countryName: ['', [Validators.required, Validators.maxLength(80)]],
    templateName: ['', [Validators.required, Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    this.loadTemplates();
  }

  get isEditMode(): boolean {
    return this.selectedTemplate !== null;
  }

  get filteredTemplates(): EngraveTemplate[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.templates;
    }

    return this.templates.filter((template) =>
      [template.countryCode, template.countryName, template.templateName, `${template.id}`]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }

  get totalTemplates(): number {
    return this.templates.length;
  }

  get countryCount(): number {
    return new Set(this.templates.map((template) => template.countryName.trim().toLowerCase())).size;
  }

  loadTemplates(): void {
    this.loadingTemplates = true;
    this.templateService
      .getAllTemplates()
      .pipe(
        finalize(() => {
          this.runUiUpdate(() => {
            this.loadingTemplates = false;
          });
        }),
      )
      .subscribe({
        next: (response) => {
          this.runUiUpdate(() => {
            const result = this.resolveApiResult(response, 'Engrave templates fetched successfully.');
            this.templates = this.extractTemplates(response);
            this.statusMessage = result.ok
              ? this.templates.length
                ? ''
                : 'No engrave templates found.'
              : result.message;
            this.statusTone = result.ok ? 'info' : 'error';
          });
        },
        error: () => {
          this.runUiUpdate(() => {
            this.templates = [];
            this.setStatus('Unable to fetch engrave templates. Check API connection.', 'error');
          });
        },
      });
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) {
      this.templateForm.markAllAsTouched();
      return;
    }

    const formValue = this.templateForm.getRawValue();
    const payload = {
      countryCode: formValue.countryCode.trim(),
      countryName: formValue.countryName.trim(),
      templateName: formValue.templateName.trim(),
    };

    const request = this.selectedTemplate
      ? this.templateService.updateTemplate({
          id: this.selectedTemplate.id,
          ...payload,
        } satisfies UpdateEngraveTemplatePayload)
      : this.templateService.addTemplate(payload);

    this.savingTemplate = true;
    request.pipe(finalize(() => (this.savingTemplate = false))).subscribe({
      next: (response) => {
        const result = this.resolveApiResult(
          response,
          this.selectedTemplate ? 'Template updated successfully.' : 'Template added successfully.',
        );
        this.showSnack(result.message, result.ok);
        this.setStatus(result.message, result.ok ? 'success' : 'error');

        if (!result.ok) {
          return;
        }

        this.resetForm();
        this.loadTemplates();
      },
      error: (error) => {
        const message = this.readErrorMessage(error, 'Unable to save template. Please try again.');
        this.showSnack(message, false);
        this.setStatus(message, 'error');
      },
    });
  }

  editTemplate(template: EngraveTemplate): void {
    this.selectedTemplate = template;
    this.templateForm.patchValue({
      countryCode: template.countryCode,
      countryName: template.countryName,
      templateName: template.templateName,
    });
  }

  deleteTemplate(template: EngraveTemplate): void {
    if (!window.confirm(`Delete template "${template.templateName}"?`)) {
      return;
    }

    this.deletingTemplateId = template.id;
    this.templateService
      .deleteTemplate({ id: template.id })
      .pipe(finalize(() => (this.deletingTemplateId = null)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(response, 'Template deleted successfully.');
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');

          if (!result.ok) {
            return;
          }

          if (this.selectedTemplate?.id === template.id) {
            this.resetForm();
          }
          this.loadTemplates();
        },
        error: (error) => {
          const message = this.readErrorMessage(error, 'Unable to delete template. Please try again.');
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  resetForm(): void {
    this.selectedTemplate = null;
    this.templateForm.reset({
      countryCode: '',
      countryName: '',
      templateName: '',
    });
  }

  trackByTemplateId(_: number, template: EngraveTemplate): number {
    return template.id;
  }

  private extractTemplates(response: unknown): EngraveTemplate[] {
    const responseValue = this.parseJsonIfNeeded(response);
    const root = this.toRecord(responseValue);
    const dataArray = this.extractArrayFromResponse(root, responseValue);

    if (!Array.isArray(dataArray)) {
      return [];
    }

    return dataArray
      .map((item) => this.mapTemplate(item))
      .filter((item): item is EngraveTemplate => item !== null)
      .filter((item) => !item.isDeleted)
      .sort((a, b) => a.countryName.localeCompare(b.countryName) || a.templateName.localeCompare(b.templateName));
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
      'templates',
      'engraveTemplates',
    ]);
    if (topLevelArray) {
      return topLevelArray;
    }

    const dataObject = this.toRecord(root['data']);
    if (dataObject) {
      return this.readArrayValue(dataObject, ['data', 'items', 'result', 'templates', 'engraveTemplates']);
    }

    return null;
  }

  private mapTemplate(value: unknown): EngraveTemplate | null {
    const source = this.toRecord(value);
    if (!source) {
      return null;
    }

    const parsedId = this.toNumber(this.readValue(source, ['id', 'templateId', 'engraveTemplateId']));
    const countryCode = this.toStringValue(this.readValue(source, ['countryCode', 'code']));
    const countryName = this.toStringValue(this.readValue(source, ['countryName', 'country']));
    const templateName = this.toStringValue(this.readValue(source, ['templateName', 'name']));
    const isActive = this.toBoolean(this.readValue(source, ['isActive', 'active']));
    const isDeleted = this.toBoolean(this.readValue(source, ['isDeleted', 'deleted']));
    const createdDate = this.toNullableString(this.readValue(source, ['createdDate', 'createdOn']));
    const updatedDate = this.toNullableString(this.readValue(source, ['updatedDate', 'updatedOn']));

    if (parsedId === null || !countryCode || !countryName || !templateName) {
      return null;
    }

    return {
      ...source,
      id: parsedId,
      countryCode,
      countryName,
      templateName,
      isActive,
      isDeleted,
      createdDate,
      updatedDate,
    };
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

  private setStatus(message: string, tone: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
  }

  private showSnack(message: string, ok: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ok ? ['snackbar-success'] : ['snackbar-error'],
    });
  }

  private runUiUpdate(work: () => void): void {
    if (NgZone.isInAngularZone()) {
      work();
      this.cdr.detectChanges();
      return;
    }

    this.zone.run(() => {
      work();
      this.cdr.detectChanges();
    });
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
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
