import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
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

type ShiftFilter = 'all' | 'A' | 'B' | 'C';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  selectedShift: ShiftFilter = 'all';
  fromDate = '';
  toDate = '';
  activeDateRangeLabel = '';

  readonly displayedColumns: string[] = [
    'sequenceID',
    'modelCode',
    'viN_NO',
    'serialNo',
    'country',
    'engineNo',
    'rollingDate',
    'shift',
    'colour',
    'vehical',
    'verient',
    'drive',
    'rhdlhd',
    'emission',
    'market',
    'enginE_TYPE',
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
              this.applyFilters();
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

    this.startLoading(
      'Preparing Excel Download...',
      'Generating report file and starting download...',
    );

    await this.waitForLoaderPaint();

    try {
      const XLSX = await import('xlsx-js-style');
      const worksheet = this.buildStyledReportWorksheet(XLSX);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ProductionReport');

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `production-data-report-${stamp}.xlsx`, {
        compression: true,
      });
      this.showSnack('Report downloaded successfully.', true);
    } catch {
      this.showSnack('Unable to download report.', false);
    } finally {
      this.stopLoading();
    }
  }

  headerLabel(column: string): string {
    switch (column) {
      case 'modelCode':
        return 'ModelCode';
      case 'viN_NO':
        return 'VIN NO';
      case 'serialNo':
        return 'Serial No';
      case 'country':
        return 'Country';
      case 'engineNo':
        return 'Engine No';
      case 'rollingDate':
        return 'Rolling Date';
      case 'shift':
        return 'Shift';
      case 'colour':
        return 'Colour';
      case 'vehical':
        return 'Vehical';
      case 'verient':
        return 'Verient';
      case 'drive':
        return 'Drive';
      case 'rhdlhd':
        return 'RHDLHD';
      case 'emission':
        return 'Emission';
      case 'market':
        return 'Market';
      case 'enginE_TYPE':
        return 'ENGINE_TYPE';
      case 'sequenceID':
        return 'Sequence ID';
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
    this.applyFilters();
  }

  onShiftChange(shift: ShiftFilter): void {
    this.selectedShift = shift;
    this.applyFilters();
  }

  onFromDateChange(value: string): void {
    this.fromDate = value;
    this.selectedDatePreset = 'none';
    this.applyFilters();
  }

  onToDateChange(value: string): void {
    this.toDate = value;
    this.selectedDatePreset = 'none';
    this.applyFilters();
  }

  trackByColumn(_: number, column: string): string {
    return column;
  }

  trackBySequenceId(_: number, row: ProductionReportRecord): number {
    return row.sequenceID;
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

  private async waitForLoaderPaint(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
        return;
      }
      setTimeout(resolve, 16);
    });
  }

  private buildStyledReportWorksheet(XLSX: typeof import('xlsx-js-style')) {
    const headers = this.displayedColumns.map((column) => this.headerLabel(column));
    const dataRows = this.filteredRecords.map((record) =>
      this.displayedColumns.map((column) => this.exportCell(column, record)),
    );
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    const columnWidths = this.displayedColumns.map((column, index) =>
      this.measureColumnWidth(headers[index], dataRows, index),
    );
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));
    worksheet['!rows'] = [{ hpt: 22 }];

    if (headers.length > 0) {
      worksheet['!autofilter'] = {
        ref: XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: Math.max(dataRows.length, 1), c: headers.length - 1 },
        }),
      };
    }

    const headerStyle = {
      fill: { patternType: 'solid', fgColor: { rgb: '4F81BD' } },
      font: { bold: true, color: { rgb: 'FFFFFFFF' }, sz: 11 },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'D9E2F3' } },
        right: { style: 'thin', color: { rgb: 'D9E2F3' } },
        bottom: { style: 'thin', color: { rgb: 'D9E2F3' } },
        left: { style: 'thin', color: { rgb: 'D9E2F3' } },
      },
    };

    const bodyStyle = {
      alignment: { vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E3EAF5' } },
        right: { style: 'thin', color: { rgb: 'E3EAF5' } },
        bottom: { style: 'thin', color: { rgb: 'E3EAF5' } },
        left: { style: 'thin', color: { rgb: 'E3EAF5' } },
      },
    };

    for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
      if (worksheet[headerCell]) {
        worksheet[headerCell].s = headerStyle;
      }

      for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
        const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = bodyStyle;
        }
      }
    }

    return worksheet;
  }

  private exportCell(column: string, row: ProductionReportRecord): string | number {
    const value = row[column as keyof ProductionReportRecord];
    if (column === 'rollingDate' || column === 'reEngraveDateTime') {
      return this.formatDate(value as string | null);
    }
    if (column === 'sequenceID' && typeof value === 'number') {
      return value;
    }
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    return String(value);
  }

  private measureColumnWidth(
    header: string,
    rows: Array<Array<string | number>>,
    columnIndex: number,
  ): number {
    const contentLength = rows.reduce((max, row) => {
      const value = row[columnIndex];
      return Math.max(max, String(value ?? '').length);
    }, header.length);

    return Math.min(Math.max(contentLength + 2, 12), 24);
  }

  private applyFilters(): void {
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

    this.filteredRecords = list.filter((item) => {
      if (!this.matchesShift(item.shift)) {
        return false;
      }

      if (!fromDate && !toDate) {
        return true;
      }

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

    if (fromDate || toDate) {
      const fromLabel = fromDate ? this.formatDate(fromDate.toISOString()) : 'Start';
      const toLabel = toDate ? this.formatDate(toDate.toISOString()) : 'Now';
      this.activeDateRangeLabel = `${fromLabel} to ${toLabel}`;
    } else {
      this.activeDateRangeLabel = '';
    }

    this.cdr.markForCheck();
  }

  private matchesShift(value: string): boolean {
    if (this.selectedShift === 'all') {
      return true;
    }

    return value.trim().toUpperCase() === this.selectedShift;
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
