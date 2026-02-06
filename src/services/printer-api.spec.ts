import { TestBed } from '@angular/core/testing';

import { PrinterApi } from './printer-api';

describe('PrinterApi', () => {
  let service: PrinterApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrinterApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
