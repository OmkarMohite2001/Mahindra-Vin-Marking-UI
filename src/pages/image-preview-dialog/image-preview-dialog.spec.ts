import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImagePreviewDialog } from './image-preview-dialog';

describe('ImagePreviewDialog', () => {
  let component: ImagePreviewDialog;
  let fixture: ComponentFixture<ImagePreviewDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImagePreviewDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImagePreviewDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
