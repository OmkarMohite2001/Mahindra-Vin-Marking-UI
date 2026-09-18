import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ReEngrave } from './re-engrave';

describe('ReEngrave', () => {
  let component: ReEngrave;
  let fixture: ComponentFixture<ReEngrave>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReEngrave, HttpClientTestingModule, NoopAnimationsModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReEngrave);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should include the extra model parameter for re-engraving payloads', () => {
    const engraveSpy = jasmine.createSpy().and.returnValue(of({ ok: true, message: 'Engrave ok' }));
    const reengraveSpy = jasmine.createSpy().and.returnValue(of({ message: 'Re-engrave ok' }));
    const printSpy = jasmine.createSpy().and.returnValue(of({ message: 'Printed' }));

    component['engraveService'] = { runWithParameter: engraveSpy } as any;
    component['productionDataReportApi'] = { reengrave: reengraveSpy } as any;
    component['printerService'] = { printLabel: printSpy } as any;
    component['snackBar'] = { open: jasmine.createSpy() } as any;

    component.form.patchValue({
      modelNo: 'M123',
      vinNo: 'MA1ABCDEFGH1234567',
      engineSrNo: 'ENG1234567',
      description1: 'DESCRIPTION-1',
      flw: 'FLW1',
      gvw: 'GVW1',
      faw: 'FAW1',
      raw: 'RAW1'
    });
    component.currentPlateType = '06';

    component.onEngrave();

    expect(engraveSpy).toHaveBeenCalledWith({
      parameters: ['M123', 'DESCRIPTION-1', 'ABCDEFGH1234567', 'FLW1', 'GVW1', 'FAW1', 'RAW1', 'M123'],
      isReengrave: true
    });
  });
});
