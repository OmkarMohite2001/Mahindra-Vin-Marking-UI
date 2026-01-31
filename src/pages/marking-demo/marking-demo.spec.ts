import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkingDemo } from './marking-demo';

describe('MarkingDemo', () => {
  let component: MarkingDemo;
  let fixture: ComponentFixture<MarkingDemo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarkingDemo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarkingDemo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
