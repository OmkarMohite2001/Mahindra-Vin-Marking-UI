import { TestBed } from '@angular/core/testing';

import { PrinterTestService } from './printer-test-service';

describe('PrinterTestService', () => {
  let service: PrinterTestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrinterTestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
