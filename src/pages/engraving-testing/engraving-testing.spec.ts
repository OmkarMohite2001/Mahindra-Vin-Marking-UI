import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EngravingTesting } from './engraving-testing';

describe('EngravingTesting', () => {
  let component: EngravingTesting;
  let fixture: ComponentFixture<EngravingTesting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngravingTesting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EngravingTesting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
