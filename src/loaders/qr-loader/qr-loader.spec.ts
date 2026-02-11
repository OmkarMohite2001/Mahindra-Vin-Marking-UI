import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QrLoader } from './qr-loader';

describe('QrLoader', () => {
  let component: QrLoader;
  let fixture: ComponentFixture<QrLoader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrLoader]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QrLoader);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
