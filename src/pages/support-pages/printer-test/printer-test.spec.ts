import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrinterTest } from './printer-test';

describe('PrinterTest', () => {
  let component: PrinterTest;
  let fixture: ComponentFixture<PrinterTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrinterTest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrinterTest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
