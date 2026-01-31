import { TestBed } from '@angular/core/testing';

import { Serial } from './serial';

describe('Serial', () => {
  let service: Serial;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Serial);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
