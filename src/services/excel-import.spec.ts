import { TestBed } from '@angular/core/testing';

import { ExcelImport } from './excel-import';

describe('ExcelImport', () => {
  let service: ExcelImport;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExcelImport);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
