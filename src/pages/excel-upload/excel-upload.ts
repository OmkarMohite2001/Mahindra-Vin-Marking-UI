import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map, finalize } from 'rxjs/operators';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ExcelImport } from '../../services/excel-import';
import { ExcelLoader } from '../../loaders/excel-loader/excel-loader';
import { TableConvertLoader } from '../../loaders/table-convert-loader/table-convert-loader';

type InvalidExcelCell = {
  sheetName: string;
  rowNumber: number;
  columnName: string;
};

type SheetTable = {
  sheetName: string;
  columns: string[];
  dataSource: MatTableDataSource<Record<string, any>>;
  rawCount: number; // blank row नंतरचे न धरता count
};

@Component({
  selector: 'app-excel-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressBarModule,
    ExcelLoader,
    TableConvertLoader,
  ],
  templateUrl: './excel-upload.html',
  styleUrls: ['./excel-upload.scss'],
})
export class ExcelUpload {
  private readonly restrictedExcelColumns = new Set([
    'MODELNO',
    'MODELCODE',
    'VINNO',
    'ENGINENO',
  ]);

  fileName = '';
  loading = false;
  isExcelLoading = false;
  excelMainMessage = 'Uploading Excel Sheet...';
  excelSubMessage = 'Validating and importing data...';
  private excelLoadingCount = 0;
  isTableConvertLoading = false;
  tableConvertMainMessage = 'Converting Table Data...';
  tableConvertSubMessage = 'Reading sheets and building grid...';
  tables: SheetTable[] = [];
  activeIndex = 0;

  constructor(
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private snackBar: MatSnackBar,
    private excelService: ExcelImport,
  ) {}
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  onPickFile(input: HTMLInputElement) {
    input.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loading = true;
    this.showTableConvertLoader('Converting Table Data...', `Reading ${file.name}...`);
    this.fileName = file.name;
    this.tables = [];
    this.activeIndex = 0;

    this.cdr.detectChanges();

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });

      const tempTables: SheetTable[] = [];
      let invalidCell: InvalidExcelCell | null = null;

      for (const sheetName of workbook.SheetNames ?? []) {
        const ws = workbook.Sheets[sheetName];
        if (!ws) continue;

        const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
          blankrows: true,
          raw: false,
        });

        const parsed = this.parseUntilBlankRow(rows);
        if (!parsed || parsed.data.length === 0) continue;

        const detectedInvalidCell = this.findInvalidExcelCell(
          sheetName,
          parsed.data,
          parsed.rowNumbers,
        );
        if (detectedInvalidCell) {
          invalidCell = detectedInvalidCell;
          break;
        }

        const ds = new MatTableDataSource<Record<string, any>>(parsed.data);
        ds.filterPredicate = (row, filter) => {
          const f = (filter || '').toLowerCase().trim();
          if (!f) return true;
          return Object.values(row).some((v) =>
            String(v ?? '')
              .toLowerCase()
              .includes(f),
          );
        };

        tempTables.push({
          sheetName,
          columns: parsed.headers,
          dataSource: ds,
          rawCount: parsed.data.length,
        });
      }

      this.zone.run(() => {
        this.tables = invalidCell ? [] : tempTables;
        this.activeIndex = 0;
        this.loading = false;
        this.hideTableConvertLoader();

        if (invalidCell) {
          this.showSnackbar(
            `Invalid data in sheet "${invalidCell.sheetName}", row ${invalidCell.rowNumber}, column "${invalidCell.columnName}". Only A-Z and 0-9 are allowed in Model No, VIN No and Engine No; spaces and special symbols are not allowed.`,
            'error',
          );
        }

        this.cdr.detectChanges(); // force paint now
        setTimeout(() => this.attachPagingSorting(), 0);
      });
    } catch (e) {
      this.zone.run(() => {
        this.loading = false;
        this.hideTableConvertLoader();
        this.cdr.detectChanges();
      });
    } finally {
      input.value = '';
    }
  }

  onTabChange(index: number) {
    this.activeIndex = index;
    setTimeout(() => this.attachPagingSorting(), 0);
  }

  applyFilter(value: string) {
    const t = this.tables[this.activeIndex];
    if (!t) return;
    t.dataSource.filter = (value || '').trim().toLowerCase();
    t.dataSource.paginator?.firstPage();
  }

  clearAll() {
    this.fileName = '';
    this.tables = [];
    this.activeIndex = 0;
  }
  onSubmit() {
// 1. Check Data
    if (!this.tables.length) return;
    const currentSheet = this.tables[this.activeIndex];
    this.loading = true;
    this.showExcelLoader('Uploading Excel Sheet...', `Importing ${currentSheet.sheetName}...`);

    this.excelService.uploadData(currentSheet.sheetName, currentSheet.dataSource.data)
      .pipe(finalize(() => {
        this.loading = false;
        this.hideExcelLoader();
      }))
      .subscribe({
        next: (res) => {
          this.showSnackbar(`${currentSheet.sheetName} ${res.message}`, 'success');
        },
        error: (err) => {
          console.error(err);
          this.showSnackbar(`Upload Failed. ${err}`, 'error');
        }
      });
  }

  onSubmitAll() {
    if (!this.tables.length) return;
    this.loading = true;
    this.showExcelLoader('Uploading Excel Sheets...', 'Importing all sheets to server...');

    const requests = this.tables.map((table) =>
      this.excelService.uploadData(table.sheetName, table.dataSource.data).pipe(
        map((res) => ({ status: 'success', sheetName: table.sheetName, res })),
        catchError((err) => of({ status: 'error', sheetName: table.sheetName, err })),
      ),
    );

    forkJoin(requests)
      .pipe(finalize(() => {
        this.loading = false;
        this.hideExcelLoader();
      }))
      .subscribe({
      next: (results) => {
        const failures = results.filter((r) => r.status === 'error');
        const successes = results.filter((r) => r.status === 'success');

        if (failures.length > 0) {
          const failedNames = failures.map((f: any) => f.sheetName).join(', ');
          this.showSnackbar(
            `Uploaded: ${successes.length}. Failed: ${failedNames}`,
            'error',
          );
        } else {
          this.showSnackbar('All sheets uploaded successfully', 'success');
        }
      },
      error: (err) => {
        console.error(err);
        this.showSnackbar(`Upload Failed. ${err}`, 'error');
      },
    });
  }

  showSnackbar(message: string, type: 'success' | 'error') {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center', // Top Center
      verticalPosition: 'top', // Top Center
      panelClass: type === 'error' ? ['error-snackbar'] : ['success-snackbar'],
    });
  }

  private showExcelLoader(mainMessage: string, subMessage: string) {
    this.excelLoadingCount += 1;
    this.excelMainMessage = mainMessage;
    this.excelSubMessage = subMessage;
    this.isExcelLoading = true;
    this.cdr.markForCheck();
  }

  private hideExcelLoader() {
    this.excelLoadingCount = Math.max(0, this.excelLoadingCount - 1);
    if (this.excelLoadingCount === 0) {
      this.isExcelLoading = false;
      this.cdr.markForCheck();
    }
  }

  private showTableConvertLoader(mainMessage: string, subMessage: string) {
    this.tableConvertMainMessage = mainMessage;
    this.tableConvertSubMessage = subMessage;
    this.isTableConvertLoading = true;
    this.cdr.markForCheck();
  }

  private hideTableConvertLoader() {
    this.isTableConvertLoading = false;
    this.cdr.markForCheck();
  }

  private attachPagingSorting() {
    const t = this.tables[this.activeIndex];
    if (!t) return;

    if (this.paginator) t.dataSource.paginator = this.paginator;
    if (this.sort) t.dataSource.sort = this.sort;
  }

  private parseUntilBlankRow(
    rows: any[][],
  ): { headers: string[]; data: Record<string, any>[]; rowNumbers: number[] } | null {
    if (!rows || rows.length === 0) return null;

    const isBlankRow = (r: any[]) =>
      !r || r.length === 0 || r.every((c) => String(c ?? '').trim() === '');

    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (!isBlankRow(rows[i])) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex === -1) return null;

    const headerRow = rows[headerIndex].map((h) => String(h ?? '').trim());
    const headers = headerRow.map((h, idx) => (h ? h : `Column_${idx + 1}`));

    const data: Record<string, any>[] = [];
    const rowNumbers: number[] = [];

    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];
      if (isBlankRow(row)) break;

      const obj: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = (row[c] ?? '').toString().trim();
      }
      const hasAny = Object.values(obj).some((v) => String(v ?? '').trim() !== '');
      if (hasAny) {
        data.push(obj);
        rowNumbers.push(r + 1);
      }
    }

    return { headers, data, rowNumbers };
  }

  private findInvalidExcelCell(
    sheetName: string,
    data: Record<string, any>[],
    rowNumbers: number[],
  ): InvalidExcelCell | null {
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      for (const [key, value] of Object.entries(row)) {
        if (!this.restrictedExcelColumns.has(this.normalizeColumnName(key))) {
          continue;
        }

        const cellValue = String(value ?? '').trim();
        if (!cellValue) {
          continue;
        }

        if (!/^[A-Za-z0-9]+$/.test(cellValue)) {
          return {
            sheetName,
            rowNumber: rowNumbers[rowIndex] ?? rowIndex + 2,
            columnName: key,
          };
        }
      }
    }

    return null;
  }

  private normalizeColumnName(value: string): string {
    return String(value ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }
}
