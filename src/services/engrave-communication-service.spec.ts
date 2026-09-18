import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EngraveCommunicationService } from './engrave-communication-service';

describe('EngraveCommunicationService', () => {
  let service: EngraveCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EngraveCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
