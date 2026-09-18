import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngraveCommunication } from './engrave-communication';

describe('EngraveCommunication', () => {
  let component: EngraveCommunication;
  let fixture: ComponentFixture<EngraveCommunication>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngraveCommunication]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngraveCommunication);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
