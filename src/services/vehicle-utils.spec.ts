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

  it('should validate VIN when it is 17 chars and starts with MA1', () => {
    expect(service.isValidVIN('MA1NE2ZTFT6A46659')).toBeTrue();
  });

  it('should reject VIN when it does not start with MA1', () => {
    expect(service.isValidVIN('AB1NE2ZTFT6A46659')).toBeFalse();
  });

  it('should reject VIN when length is not 17', () => {
    expect(service.isValidVIN('MA1NE2ZTFT6A4665')).toBeFalse();
  });
});
