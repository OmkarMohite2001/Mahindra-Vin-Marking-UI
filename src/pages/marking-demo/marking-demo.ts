import { ChangeDetectorRef, Component, inject, model, NgZone, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Serial } from '../../services/serial';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModelsApi } from '../../services/models-api';
import { VehicleImageApi } from '../../services/vehicle-image-api';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-marking-demo',
  imports: [ReactiveFormsModule, FormsModule, MatDialogModule, CommonModule],
  templateUrl: './marking-demo.html',
  styleUrl: './marking-demo.scss',
})
export class MarkingDemo {
private fb = inject(FormBuilder);
  private serialService = inject(Serial);
  private modelService = inject(ModelsApi);
  private vehicleImageService = inject(VehicleImageApi);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  form = this.fb.group({
  // --- जुने ---
  modelNo: [''],
  description: [''],
  description1: [''],
  market: [''],
  country: ['INDIA'],
  driveType: [''],
  trim: [''],
  flw: [''],
  gvw: [''],
  faw: [''],
  raw: [''],
  seatCode: [''],
  color: [''],
  engine: [''],
  bsStage: [''],
  batchNo: ['700071'],
  date: [''],

  // --- हे नवीन आहेत (हे check करा) ---
  vinNo: [''],        // HTML: formControlName="vinNo"
  engineSrNo: [''],   // HTML: formControlName="engineSrNo"

  // --- CNG चे नवीन ---
  cngTankId: [''],      // HTML: formControlName="cngTankId"
  cngInstallDate: [''], // HTML: formControlName="cngInstallDate"
  cngRetestDate: [''],  // HTML: formControlName="cngRetestDate"
  waterCapacity: [''],  // HTML: formControlName="waterCapacity"
  vinLast8: [''],       // HTML: formControlName="vinLast8"
  sticker: ['vin']      // HTML: formControlName="sticker"
});

  ngOnInit(): void {
    this.serialService.dataSubject.subscribe((scannedData) => {
      this.ngZone.run(() => {
        console.log("Scanner Scanned:", scannedData);

        // Validate scanned data
        if (!this.validateScannedData(scannedData)) {
          this.snackBar.open('Invalid scan data format! Expected format with 2 letter code', 'Close', { duration: 3000 });
          return;
        }

        // Extract 2-letter code (first 2 letters from scanned data)
        const twoLetterCode = this.extractTwoLetterCode(scannedData);
        if (!twoLetterCode) {
          this.snackBar.open('Cannot extract letter code from scanned data', 'Close', { duration: 3000 });
          return;
        }

        console.log("Two Letter Code:", twoLetterCode);

        // Fetch vehicle image using GET API
        this.fetchVehicleImage(twoLetterCode, scannedData);
      });
    });

    this.serialService.autoConnect();
  }

  // Validate scanned data format
  private validateScannedData(scannedData: string): boolean {
    // Check if scanned data has at least 2 characters and contains letters
    const letterMatch = scannedData.match(/[A-Za-z]{2,}/);
    return scannedData.length >= 2 && letterMatch !== null;
  }

  // Extract 2-letter code from scanned data
  private extractTwoLetterCode(scannedData: string): string | null {
    const match = scannedData.match(/[A-Za-z]{2}/);
    return match ? match[0] : null;
  }

  // Fetch vehicle image by image name
  private fetchVehicleImage(imageName: string, scannedData: string) {
    this.vehicleImageService.getVehicleImages({ imageName }).subscribe({
      next: (response: any) => {
        console.log("Vehicle Image Response:", response);

        if (response?.success && response?.data?.imageBase64) {
          // Show image in popup
          this.showImagePopup(response.data.imageBase64, scannedData);
        } else {
          this.snackBar.open('Vehicle image not found', 'Close', { duration: 3000 });
        }
      },
      error: (err: any) => {
        console.error("Image Fetch Error:", err);
        this.snackBar.open('Failed to fetch vehicle image', 'Close', { duration: 3000 });
      }
    });
  }

  // Show image popup with OK/Cancel buttons
  private showImagePopup(imageBase64: string, scannedData: string) {
    const dialogRef = this.dialog.open(ImagePreviewDialog, {
      width: '400px',
      data: { imageBase64 }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'ok') {
        // User clicked OK - proceed to fetch model details
        this.form.patchValue({ modelNo: scannedData });
        this.fetchModelDetails(scannedData);
      }
      // If cancelled, do nothing
    });
  }

  fetchModelDetails(modelNo: string) {

    this.modelService.getModelDetails(modelNo).subscribe({
      next: (response: any) => {
        console.log("API Response:", response);

        if (response.success && response.data) {
          const apiData = response.data;
          this.form.patchValue({
            description: apiData.description,
            description1: apiData.description1,
            market: apiData.marketName,
            country: apiData.country,
            driveType: apiData.driveType,
            trim: apiData.trim,
            seatCode: apiData.seatCode,
            color: apiData.colorCode,
            engine: apiData.engineType,
            bsStage: apiData.bsStage
          });

          this.snackBar.open('Data Auto-filled Successfully! ✅', 'OK', { duration: 3000 });
        } else {
          this.snackBar.open('Model not found in Database ❌', 'Close', { duration: 3000 });
        }
      },
      error: (err: any) => {
        console.error("API Error:", err);
        this.snackBar.open('API Connection Failed ⚠️', 'Close', { duration: 3000 });
      }
    });
  }
}

// Image Preview Dialog Component
@Component({
  selector: 'app-image-preview-dialog',
  template: `
    <div style="text-align: center;">
      <h2 mat-dialog-title>Vehicle Image Preview</h2>
      <div style="margin: 20px 0;">
        <img [src]="getImageUrl()" alt="Vehicle" style="max-width: 100%; max-height: 400px; border-radius: 8px;">
      </div>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button (click)="onOk()" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
          OK
        </button>
        <button (click)="onCancel()" style="padding: 10px 20px; background-color: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Cancel
        </button>
      </div>
    </div>
  `,
  standalone: true,
  imports: []
})
export class ImagePreviewDialog {
  constructor(
    public dialogRef: MatDialogRef<ImagePreviewDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sanitizer: DomSanitizer
  ) {}

  getImageUrl(): SafeUrl {
    const imageBase64 = this.data?.imageBase64;
    if (imageBase64) {
      return this.sanitizer.bypassSecurityTrustUrl(`data:image/png;base64,${imageBase64}`);
    }
    return '';
  }

  onOk() {
    this.dialogRef.close('ok');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
