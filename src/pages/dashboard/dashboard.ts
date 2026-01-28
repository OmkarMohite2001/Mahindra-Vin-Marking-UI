import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import * as XLSX from 'xlsx';
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

type SheetTable = {
  sheetName: string;
  columns: string[];
  dataSource: MatTableDataSource<Record<string, any>>;
  rawCount: number; // blank row नंतरचे न धरता count
};

;

@Component({
  selector: 'app-dashboard',
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
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class Dashboard {

   fileName = '';
  loading = false;
  tables: SheetTable[] = [];
  activeIndex = 0;

  constructor(private cdr: ChangeDetectorRef, private zone: NgZone) {}
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  onPickFile(input: HTMLInputElement) {
    input.click();
  }

  // async onFileSelected(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   const file = input.files?.[0];
  //   if (!file) return;

  //   this.fileName = file.name;
  //   this.loading = true;
  //   this.tables = [];

  //   try {
  //     const buffer = await file.arrayBuffer();
  //     const workbook = XLSX.read(buffer, { type: 'array' });

  //     const sheetNames = workbook.SheetNames ?? [];
  //     for (const sheetName of sheetNames) {
  //       const ws = workbook.Sheets[sheetName];
  //       if (!ws) continue;

  //       // 2D array - header:1 => rows as arrays, blank cells preserved
  //       const rows: any[][] = XLSX.utils.sheet_to_json(ws, {
  //         header: 1,
  //         defval: '',
  //         blankrows: true,
  //         raw: false,
  //         dateNF: 'yyyy-mm-dd',
  //       });

  //       const parsed = this.parseUntilBlankRow(rows);
  //       if (!parsed || parsed.data.length === 0) continue;

  //       const ds = new MatTableDataSource<Record<string, any>>(parsed.data);
  //       ds.filterPredicate = (row, filter) => {
  //         const f = (filter || '').toLowerCase().trim();
  //         if (!f) return true;
  //         return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(f));
  //       };

  //       this.tables.push({
  //         sheetName,
  //         columns: parsed.headers,
  //         dataSource: ds,
  //         rawCount: parsed.data.length,
  //       });
  //     }

  //     // attach paginator/sort to first tab
  //     setTimeout(() => this.attachPagingSorting(), 0);
  //   } finally {
  //     this.loading = false;
  //     // same file पुन्हा select करायचा असेल म्हणून reset
  //     input.value = '';
  //   }
  // }
async onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  this.loading = true;
  this.fileName = file.name;
  this.tables = [];
  this.activeIndex = 0;

  this.cdr.detectChanges();

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    const tempTables: SheetTable[] = [];

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

      const ds = new MatTableDataSource<Record<string, any>>(parsed.data);
      ds.filterPredicate = (row, filter) => {
        const f = (filter || '').toLowerCase().trim();
        if (!f) return true;
        return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(f));
      };

      tempTables.push({
        sheetName,
        columns: parsed.headers,
        dataSource: ds,
        rawCount: parsed.data.length,
      });
    }

    this.zone.run(() => {
      this.tables = tempTables;
      this.activeIndex = 0;
      this.loading = false;

      this.cdr.detectChanges(); // force paint now
      setTimeout(() => this.attachPagingSorting(), 0);
    });
  } catch (e) {
    this.zone.run(() => {
      this.loading = false;
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
  // next step: इथे tables -> JSON बनवून API ला send करायचं
  console.log('Submit clicked. Sheets:', this.tables.length);
}

  private attachPagingSorting() {
    const t = this.tables[this.activeIndex];
    if (!t) return;

    if (this.paginator) t.dataSource.paginator = this.paginator;
    if (this.sort) t.dataSource.sort = this.sort;
  }

  private parseUntilBlankRow(rows: any[][]): { headers: string[]; data: Record<string, any>[] } | null {
    if (!rows || rows.length === 0) return null;

    const isBlankRow = (r: any[]) =>
      !r || r.length === 0 || r.every(c => String(c ?? '').trim() === '');

    // header row = first non-blank row
    let headerIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (!isBlankRow(rows[i])) {
        headerIndex = i;
        break;
      }
    }
    if (headerIndex === -1) return null;

    const headerRow = rows[headerIndex].map(h => String(h ?? '').trim());
    const headers = headerRow.map((h, idx) => (h ? h : `Column_${idx + 1}`));

    const data: Record<string, any>[] = [];

    for (let r = headerIndex + 1; r < rows.length; r++) {
      const row = rows[r] ?? [];

      // blank row आला की reading stop
      if (isBlankRow(row)) break;

      const obj: Record<string, any> = {};
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = (row[c] ?? '').toString().trim();
      }

      // जर row मध्ये values असतीलच तर push
      const hasAny = Object.values(obj).some(v => String(v ?? '').trim() !== '');
      if (hasAny) data.push(obj);
    }

    return { headers, data };
  }
}
