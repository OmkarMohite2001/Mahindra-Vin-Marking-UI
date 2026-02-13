import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReEngrave } from './re-engrave';

describe('ReEngrave', () => {
  let component: ReEngrave;
  let fixture: ComponentFixture<ReEngrave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReEngrave]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReEngrave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
