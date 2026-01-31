import { TestBed } from '@angular/core/testing';

import { ModelsApi } from './models-api';

describe('ModelsApi', () => {
  let service: ModelsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModelsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
