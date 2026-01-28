import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Marking } from './marking';

describe('Marking', () => {
  let component: Marking;
  let fixture: ComponentFixture<Marking>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Marking]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Marking);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
