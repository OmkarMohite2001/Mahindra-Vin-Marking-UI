import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VehicleImages } from './vehicle-images';
import { VehicleImageApi } from '../../services/vehicle-image-api';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';

describe('VehicleImages Component', () => {
  let component: VehicleImages;
  let fixture: ComponentFixture<VehicleImages>;
  let vehicleImageService: any;

  beforeEach(async () => {
    const vehicleImageSpy = {
      uploadImage: () => of({ success: true, message: 'Image uploaded' }),
      bulkUploadImages: () => of({ success: true, message: 'Images uploaded' }),
    };

    await TestBed.configureTestingModule({
      imports: [VehicleImages, MatSnackBarModule],
      providers: [
        { provide: VehicleImageApi, useValue: vehicleImageSpy },
      ],
    }).compileComponents();

    vehicleImageService = TestBed.inject(VehicleImageApi);
    fixture = TestBed.createComponent(VehicleImages);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should upload single image', () => {
    const file = new File(['test'], 'test.png', { type: 'image/png' });
    component.selectedFile = file;

    component.uploadSingleImage();

    expect(component.loading).toBeFalsy();
  });

  it('should bulk upload images', () => {
    const file1 = new File(['test1'], 'test1.png', { type: 'image/png' });
    const file2 = new File(['test2'], 'test2.png', { type: 'image/png' });
    component.selectedFiles = [file1, file2];

    component.bulkUploadImages();

    expect(component.loading).toBeFalsy();
  });

  it('should show error if no file selected for single upload', () => {
    component.selectedFile = null;
    spyOn(component['snackBar'], 'open');

    component.uploadSingleImage();

    expect(component['snackBar'].open).toHaveBeenCalledWith(
      'Please select a file first',
      'Close',
      jasmine.any(Object)
    );
  });

  it('should show error if no files selected for bulk upload', () => {
    component.selectedFiles = [];
    spyOn(component['snackBar'], 'open');

    component.bulkUploadImages();

    expect(component['snackBar'].open).toHaveBeenCalledWith(
      'Please select files first',
      'Close',
      jasmine.any(Object)
    );
  });

  it('should clear single file', () => {
    component.selectedFile = new File(['test'], 'test.png', {
      type: 'image/png',
    });
    component.clearSingleFile();

    expect(component.selectedFile).toBeNull();
  });

  it('should clear multiple files', () => {
    component.selectedFiles = [
      new File(['test'], 'test.png', { type: 'image/png' }),
    ];
    component.clearMultipleFiles();

    expect(component.selectedFiles.length).toBe(0);
  });
});
