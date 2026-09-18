import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EngraveMachineService } from './engrave-machine-service';

describe('EngraveMachineService', () => {
  let service: EngraveMachineService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EngraveMachineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
