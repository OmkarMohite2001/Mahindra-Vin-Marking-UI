import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { EngraveMachine } from './engrave-machine';

describe('EngraveMachine', () => {
  let component: EngraveMachine;
  let fixture: ComponentFixture<EngraveMachine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngraveMachine],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngraveMachine);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
