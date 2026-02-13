import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { TableConvertLoader } from '../../loaders/table-convert-loader/table-convert-loader';
import {
  ProductionDataReportApi,
  ProductionReportRecord,
} from '../../services/production-data-report-api';

@Component({
  selector: 'app-reports',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatSelectModule,
    TableConvertLoader,
  ],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class Reports {
  private reportApi = inject(ProductionDataReportApi);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  loading = false;
  isReportLoaderVisible = false;
  reportLoaderMainMessage = 'Fetching Production Report...';
  reportLoaderSubMessage = 'Loading records from server...';
  private loaderSafetyTimer?: ReturnType<typeof setTimeout>;
  records: ProductionReportRecord[] = [];
  filteredRecords: ProductionReportRecord[] = [];
  selectedDatePreset: 'none' | '1d' | '7d' | '1m' = 'none';
  fromDate = '';
  toDate = '';
  activeDateRangeLabel = '';

  readonly displayedColumns: string[] = [
    'sequenceID',
    'viN_NO',
    'serialNo',
    'modelCode',
    'rollingDate',
    'shift',
    'country',
    'vehical',
    'verient',
    'drive',
    'rhdlhd',
    'engineNo',
    'colour',
    'emission',
    'market',
    'enginE_TYPE',
    'engraveCount',
    'reEngraveDateTime',
  ];

  constructor() {
    this.loadReports();
  }

  loadReports(): void {
    this.startLoading('Fetching Production Report...', 'Loading records from server...');
    this.reportApi
      .getAll()
      .subscribe({
        next: (response) => {
          this.zone.run(() => {
            this.stopLoading();
            try {
              const result = this.resolveApiResponse(response);
              this.records = result.data;
              this.applyDateFilter();
              this.showSnack(result.message, result.success);
            } catch {
              this.records = [];
              this.filteredRecords = [];
              this.showSnack('Unable to parse production report response.', false);
            }
            this.cdr.markForCheck();
          });
        },
        error: () => {
          this.zone.run(() => {
            this.stopLoading();
            this.records = [];
            this.filteredRecords = [];
            this.showSnack('Unable to fetch production report.', false);
            this.cdr.markForCheck();
          });
        },
        complete: () => {
          this.zone.run(() => {
            this.stopLoading();
            this.cdr.markForCheck();
          });
        },
      });
  }

  async downloadExcel(): Promise<void> {
    if (!this.filteredRecords.length) {
      this.showSnack('No report data available for download.', false);
      return;
    }

    const XLSX = await import('xlsx');
    const rows = this.filteredRecords.map((item) => ({
      SequenceID: item.sequenceID,
      VIN_NO: item.viN_NO,
      SerialNo: item.serialNo,
      ModelCode: item.modelCode,
      RollingDate: this.formatDate(item.rollingDate),
      Shift: item.shift,
      Country: item.country,
      Vehicle: item.vehical,
      Variant: item.verient,
      Drive: item.drive,
      RHD_LHD: item.rhdlhd,
      EngineNo: item.engineNo,
      Colour: item.colour,
      Emission: item.emission,
      Market: item.market,
      EngineType: item.enginE_TYPE,
      EngraveCount: item.engraveCount,
      ReEngraveDateTime: this.formatDate(item.reEngraveDateTime),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductionReport');

    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `production-data-report-${stamp}.xlsx`);
    this.showSnack('Report downloaded successfully.', true);
  }

  headerLabel(column: string): string {
    switch (column) {
      case 'viN_NO':
        return 'VIN';
      case 'enginE_TYPE':
        return 'Engine Type';
      case 'sequenceID':
        return 'Sequence ID';
      case 'reEngraveDateTime':
        return 'Re-Engrave Date';
      default:
        return column.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    }
  }

  displayCell(column: string, row: ProductionReportRecord): string {
    const value = row[column as keyof ProductionReportRecord];
    if (column === 'rollingDate' || column === 'reEngraveDateTime') {
      return this.formatDate(value as string | null);
    }
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  onDatePresetChange(preset: 'none' | '1d' | '7d' | '1m'): void {
    this.selectedDatePreset = preset;
    if (preset !== 'none') {
      this.fromDate = '';
      this.toDate = '';
    }
    this.applyDateFilter();
  }

  onFromDateChange(value: string): void {
    this.fromDate = value;
    this.selectedDatePreset = 'none';
    this.applyDateFilter();
  }

  onToDateChange(value: string): void {
    this.toDate = value;
    this.selectedDatePreset = 'none';
    this.applyDateFilter();
  }

  private formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private resolveApiResponse(response: unknown): {
    success: boolean;
    message: string;
    data: ProductionReportRecord[];
  } {
    const parsedResponse =
      typeof response === 'string'
        ? (() => {
            try {
              return JSON.parse(response) as unknown;
            } catch {
              return null;
            }
          })()
        : response;

    const record = this.toRecord(parsedResponse);
    const successRaw = this.readValue(record ?? {}, ['success', 'isSuccess']);
    const messageRaw = this.readValue(record ?? {}, ['message', 'errorMessage']);
    const dataRaw = this.extractArrayPayload(parsedResponse, record);

    const success = typeof successRaw === 'boolean' ? successRaw : true;
    const data = Array.isArray(dataRaw)
      ? dataRaw
          .map((item) => this.mapRecord(item))
          .filter((item): item is ProductionReportRecord => item !== null)
      : [];

    const message =
      typeof messageRaw === 'string' && messageRaw.trim().length
        ? messageRaw
        : success
          ? 'Production report fetched.'
          : 'Operation failed.';

    return { success, message, data };
  }

  private extractArrayPayload(
    parsedResponse: unknown,
    record: Record<string, unknown> | null,
  ): unknown[] | null {
    if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    }

    const rootArray = this.readArrayValue(record, ['data', 'items', 'result', 'records']);
    if (rootArray) {
      return rootArray;
    }

    const nestedData = this.toRecord(record?.['data']);
    return this.readArrayValue(nestedData, ['data', 'items', 'result', 'records']);
  }

  private mapRecord(value: unknown): ProductionReportRecord | null {
    const record = this.toRecord(value);
    if (!record) {
      return null;
    }

    return {
      sequenceID: this.toNumber(record['sequenceID']),
      modelCode: this.toString(record['modelCode']),
      viN_NO: this.toString(record['viN_NO']),
      serialNo: this.toString(record['serialNo']),
      country: this.toString(record['country']),
      engineNo: this.toString(record['engineNo']),
      rollingDate: this.toString(record['rollingDate']),
      shift: this.toString(record['shift']),
      colour: this.toString(record['colour']),
      vehical: this.toString(record['vehical']),
      verient: this.toString(record['verient']),
      drive: this.toString(record['drive']),
      rhdlhd: this.toString(record['rhdlhd']),
      emission: this.toString(record['emission']),
      market: this.toString(record['market']),
      enginE_TYPE: this.toString(record['enginE_TYPE']),
      engraveCount: this.toString(record['engraveCount']),
      reEngraveDateTime: this.toNullableString(record['reEngraveDateTime']),
    };
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private readValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (source[key] !== undefined) {
        return source[key];
      }
    }
    return undefined;
  }

  private readArrayValue(
    source: Record<string, unknown> | null,
    keys: string[],
  ): unknown[] | null {
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

  private toNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private toString(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  private toNullableString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return String(value);
  }

  private showSnack(message: string, success: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: success ? ['snackbar-success'] : ['snackbar-error'],
    });
  }

  private showReportLoader(mainMessage: string, subMessage: string): void {
    this.reportLoaderMainMessage = mainMessage;
    this.reportLoaderSubMessage = subMessage;
    this.isReportLoaderVisible = true;
    this.cdr.markForCheck();
  }

  private hideReportLoader(): void {
    this.isReportLoaderVisible = false;
    this.cdr.markForCheck();
  }

  private startLoading(mainMessage: string, subMessage: string): void {
    this.loading = true;
    this.showReportLoader(mainMessage, subMessage);
    this.clearLoaderSafetyTimer();
    this.loaderSafetyTimer = setTimeout(() => {
      this.stopLoading();
    }, 20000);
  }

  private stopLoading(): void {
    this.loading = false;
    this.hideReportLoader();
    this.clearLoaderSafetyTimer();
    this.cdr.markForCheck();
  }

  private clearLoaderSafetyTimer(): void {
    if (this.loaderSafetyTimer) {
      clearTimeout(this.loaderSafetyTimer);
      this.loaderSafetyTimer = undefined;
    }
  }

  private applyDateFilter(): void {
    const list = [...this.records];
    const now = new Date();
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (this.fromDate || this.toDate) {
      const parsedFrom = this.fromDate ? this.parseDateStart(this.fromDate) : null;
      const parsedTo = this.toDate ? this.parseDateEnd(this.toDate) : null;

      if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
        fromDate = parsedTo;
        toDate = parsedFrom;
      } else {
        fromDate = parsedFrom;
        toDate = parsedTo;
      }
    }

    if (!fromDate && !toDate) {
      if (this.selectedDatePreset === '1d') {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 1);
        toDate = now;
      } else if (this.selectedDatePreset === '7d') {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        toDate = now;
      } else if (this.selectedDatePreset === '1m') {
        fromDate = new Date(now);
        fromDate.setMonth(fromDate.getMonth() - 1);
        toDate = now;
      }
    }

    if (!fromDate && !toDate) {
      this.filteredRecords = list;
      this.activeDateRangeLabel = '';
      this.cdr.markForCheck();
      return;
    }

    this.filteredRecords = list.filter((item) => {
      const date = new Date(item.rollingDate);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      if (fromDate && date < fromDate) {
        return false;
      }
      if (toDate && date > toDate) {
        return false;
      }
      return true;
    });

    const fromLabel = fromDate ? this.formatDate(fromDate.toISOString()) : 'Start';
    const toLabel = toDate ? this.formatDate(toDate.toISOString()) : 'Now';
    this.activeDateRangeLabel = `${fromLabel} to ${toLabel}`;
    this.cdr.markForCheck();
  }

  private parseDateStart(value: string): Date | null {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private parseDateEnd(value: string): Date | null {
    const date = new Date(`${value}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
