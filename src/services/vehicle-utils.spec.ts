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

  it('should read India country code from the 15th and 16th characters of an alphanumeric model number', () => {
    const nonIndiaModelNumber = '123456789012345600';
    expect(service.getCountryCodeFromModelNumber(nonIndiaModelNumber)).toBe('56');
    expect(service.getCountryNameFromModelNumber(nonIndiaModelNumber)).toBeNull();

    const indiaModelNumber = '123456789012340000';
    expect(service.getCountryCodeFromModelNumber(indiaModelNumber)).toBe('00');
    expect(service.getCountryNameFromModelNumber(indiaModelNumber)).toBe('INDIA');

    const alphanumericIndiaModelNumber = 'AAZ1LPRJ5TC06B06QH';
    expect(service.getCountryCodeFromModelNumber(alphanumericIndiaModelNumber)).toBe('06');
    expect(service.getCountryNameFromModelNumber(alphanumericIndiaModelNumber)).toBe('INDIA');
  });

  it('should validate engine prefix against model number characters 7 and 8', () => {
    const validModelNumber = '123456AB123456789';
    const validEngineNumber = 'AB12345678';
    const invalidEngineNumber = 'CD12345678';

    expect(service.matchesModelEnginePrefix(validModelNumber, validEngineNumber)).toBeTrue();
    expect(service.matchesModelEnginePrefix(validModelNumber, invalidEngineNumber)).toBeFalse();
  });

  it('should validate engine prefix against VIN number characters 7 and 8 (excluding MA1)', () => {
    // VIN: MA1 + 123456 (chars 1-6) + AB (chars 7-8) + 123456 (chars 9-14)
    const validVinNumber = 'MA1123456AB123456';
    const validEngineNumber = 'AB12345678';
    const invalidEngineNumber = 'CD12345678';

    expect(service.matchesVinEnginePrefix(validVinNumber, validEngineNumber)).toBeTrue();
    expect(service.matchesVinEnginePrefix(validVinNumber, invalidEngineNumber)).toBeFalse();
  });
});
