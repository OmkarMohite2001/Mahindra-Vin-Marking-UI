import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SerialTerminal } from './serial-terminal';

describe('SerialTerminal', () => {
  let component: SerialTerminal;
  let fixture: ComponentFixture<SerialTerminal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SerialTerminal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SerialTerminal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
