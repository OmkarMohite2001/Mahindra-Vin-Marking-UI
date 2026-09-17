import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Usb } from './usb';

describe('Usb', () => {
  let component: Usb;
  let fixture: ComponentFixture<Usb>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Usb]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Usb);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
