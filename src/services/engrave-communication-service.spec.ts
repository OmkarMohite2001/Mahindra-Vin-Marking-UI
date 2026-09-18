import { TestBed } from '@angular/core/testing';

import { EngraveCommunicationService } from './engrave-communication-service';

describe('EngraveCommunicationService', () => {
  let service: EngraveCommunicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EngraveCommunicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
