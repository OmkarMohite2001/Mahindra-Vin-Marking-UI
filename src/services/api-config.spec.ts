import { TestBed } from '@angular/core/testing';

import { ApiConfig } from './api-config';

describe('ApiConfig', () => {
  let service: ApiConfig;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiConfig);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
