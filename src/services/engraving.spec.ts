import { TestBed } from '@angular/core/testing';

import { Engraving } from './engraving';

describe('Engraving', () => {
  let service: Engraving;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Engraving);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
