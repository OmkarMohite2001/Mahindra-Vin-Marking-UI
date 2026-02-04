import { TestBed } from '@angular/core/testing';

import { VehicleUtils } from './vehicle-utils';

describe('VehicleUtils', () => {
  let service: VehicleUtils;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VehicleUtils);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
