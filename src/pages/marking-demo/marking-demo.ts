import { ChangeDetectorRef, Component, inject, model, NgZone, Inject, ViewChild, ElementRef } from '@angular/core';
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
  private sanitizer = inject(DomSanitizer);

  @ViewChild('nameplatCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  countryFlag: SafeUrl | null = null;
  private isFetchingImage = false; // Flag to prevent duplicate image API calls

  // Mapping of backend country names to image names
  countryImageMap: { [key: string]: string } = {
    'INDIA': 'INDIA',
    'USA': 'usa',
    'UK': 'uk',
    'JAPAN': 'japan',
    'GERMANY': 'germany',
    'AUSTRALIA': 'australia'
  };

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
  batchNo: [''],
  date: [''],
  vinNo: [''],        // HTML: formControlName="vinNo"
  engineSrNo: [''],   // HTML: formControlName="engineSrNo"
  cngTankId: [''],      // HTML: formControlName="cngTankId"
  cngInstallDate: [''], // HTML: formControlName="cngInstallDate"
  cngRetestDate: [''],  // HTML: formControlName="cngRetestDate"
  waterCapacity: [''],  // HTML: formControlName="waterCapacity"
  vinLast8: [''],       // HTML: formControlName="vinLast8"
  sticker: ['vin']      // HTML: formControlName="sticker"
});

  ngOnInit(): void {
    // Load default country image (INDIA)
    this.loadCountryImage('INDIA');

    // Listen for country changes from form
    this.form.get('country')?.valueChanges.subscribe((countryName) => {
      if (countryName) {
        this.loadCountryImage(countryName);
      }
    });

    this.serialService.dataSubject.subscribe((scannedData) => {
      this.ngZone.run(() => {
        console.log("Scanner Scanned:", scannedData);

        // Check if it's a combined QR code (contains underscores)
        if (scannedData.includes('_')) {
          this.processCombinedQRCode(scannedData);
        } else {
          // Single scan - determine type by length
          this.processSingleScan(scannedData);
        }
      });
    });

    this.serialService.autoConnect();
  }

  // Process combined QR code (VIN_MODEL_ENGINE format)
  private processCombinedQRCode(qrData: string) {
    // Expected format: VIN_MODEL_COLOR (underscore separated)
    const parts = qrData.split('_');

    if (parts.length >= 2) {
      const vinNumber = parts[0];
      const modelNumber = parts[1];
      const color = parts.length >= 3 ? parts.slice(2).join('_') : null; // color may contain spaces/underscores

      // Validate VIN and Model
      if (!this.isValidVIN(vinNumber)) {
        this.snackBar.open('Invalid VIN format in QR code (expected 17 digits)', 'Close', { duration: 3000 });
        return;
      }
      if (!this.isValidModelNumber(modelNumber)) {
        this.snackBar.open('Invalid Model Number format in QR code (expected 18 digits)', 'Close', { duration: 3000 });
        return;
      }

      // Process VIN and Model
      this.processVINScan(vinNumber);
      this.processModelScan(modelNumber);

      // If color present, patch form
      if (color) {
        this.form.patchValue({ color: color });
      }

      this.snackBar.open('QR code processed ✅', 'OK', { duration: 2500 });
    } else {
      this.snackBar.open('Invalid QR code format (expected VIN_MODEL_... )', 'Close', { duration: 3000 });
    }
  }

  // Process single scan based on length
  private processSingleScan(scannedData: string) {
    const cleanedData  = scannedData.replace(/[^A-Za-z0-9]/g, ''); // Extract only digits

    if (this.isValidVIN(cleanedData)) {
      this.processVINScan(cleanedData);
    } else if (this.isValidModelNumber(cleanedData)) {
      this.processModelScan(cleanedData);
    } else if (this.isValidEngineNumber(cleanedData)) {
      this.processEngineScan(cleanedData);
    } else {
      this.snackBar.open('Invalid scan data! Expected VIN (17), Model (18), or Engine (10) digits', 'Close', { duration: 3000 });
    }
  }

  // Validate VIN (17 digits)
  private isValidVIN(data: string): boolean {
    // VINs are alphanumeric (17 characters). Accept letters & digits, ignore other chars.
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.length === 17;
  }

  // Validate Model Number (18 digits)
  private isValidModelNumber(data: string): boolean {
    // Model number may contain letters and digits — count alphanumeric characters.
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.length === 18;
  }

  // Validate Engine Number (10 digits)
  private isValidEngineNumber(data: string): boolean {
    // Engine number can be alphanumeric; validate by alphanumeric length.
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.length === 10;
  }

  // Process VIN scan
  private processVINScan(vinNumber: string) {
    this.form.patchValue({ vinNo: vinNumber });
    this.snackBar.open('VIN Number scanned successfully ✅', 'OK', { duration: 2000 });
  }

  // Process Engine scan
  private processEngineScan(engineNumber: string) {
    this.form.patchValue({ engineSrNo: engineNumber });
    this.snackBar.open('Engine Number scanned successfully ✅', 'OK', { duration: 2000 });
  }

  // Process Model scan
  private processModelScan(modelNumber: string) {
    // Extract 2-letter code from model number
    const twoLetterCode = this.extractTwoLetterCode(modelNumber);
    if (!twoLetterCode) {
      this.snackBar.open('Cannot extract letter code from model number', 'Close', { duration: 3000 });
      return;
    }

    console.log("Two Letter Code:", twoLetterCode);

    // Fetch vehicle image using GET API
    this.fetchVehicleImage(twoLetterCode, modelNumber);
  }

  // Extract 2-letter code from scanned data
  private extractTwoLetterCode(scannedData: string): string | null {
    // Collect all alphabetic characters and take the last two letters.
    const letters = scannedData.match(/[A-Za-z]/g);
    if (!letters || letters.length < 2) return null;
    const lastTwo = letters.slice(-2).join('').toUpperCase();
    return lastTwo;
  }

  // Fetch vehicle image by image name
  private fetchVehicleImage(imageName: string, modelNumber: string) {
    // Prevent duplicate API calls
    if (this.isFetchingImage) {
      console.log('Image fetch already in progress, ignoring duplicate request');
      return;
    }

    this.isFetchingImage = true;
    this.vehicleImageService.getVehicleImages({ imageName }).subscribe({
      next: (response: any) => {
        this.isFetchingImage = false;
        console.log("Vehicle Image Response:", response);

        if (response?.success && response?.data) {
          // API may return the base64 under different keys or already include the data: prefix.
          const data = response.data;
          const rawBase64 = data.imageBase64 || data.base64Image || data.base64 || data.base64Img || null;

          if (!rawBase64) {
            this.snackBar.open('Vehicle image not found', 'Close', { duration: 3000 });
            return;
          }

          // If the returned string already contains the data URL prefix, use as-is.
          const dataUrl = rawBase64.startsWith('data:')
            ? rawBase64
            : `data:${data.contentType || 'image/png'};base64,${rawBase64}`;

          // Show image in popup
          this.showImagePopup(dataUrl, modelNumber);
        } else {
          this.snackBar.open('Vehicle image not found', 'Close', { duration: 3000 });
        }
      },
      error: (err: any) => {
        this.isFetchingImage = false;
        console.error("Image Fetch Error:", err);
        this.snackBar.open('Failed to fetch vehicle image', 'Close', { duration: 3000 });
      }
    });
  }

  // Show image popup with OK/Cancel buttons
  private showImagePopup(imageBase64: string, modelNumber: string) {
    const dialogRef = this.dialog.open(ImagePreviewDialog, {
      width: '400px',
      data: { imageBase64 }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === 'ok') {
        // User clicked OK - proceed to fetch model details
        this.form.patchValue({ modelNo: modelNumber });
        this.fetchModelDetails(modelNumber);
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

  private loadCountryImage(countryName: string) {
    // Get image name from mapping
    const imageName = this.countryImageMap[countryName] || countryName;

    // Check if image is jpeg or svg
    const extension = imageName === 'INDIA' ? '.jpeg' : '.svg';
    const imagePath = `/assets/countries/${imageName}${extension}`;
    this.countryFlag = this.sanitizer.bypassSecurityTrustUrl(imagePath);
    this.cdr.markForCheck();
  }

  // Clear all form fields (Refresh button)
  clearForm() {
    this.form.reset({
      country: 'INDIA',
      sticker: 'vin'
    });
    this.loadCountryImage('INDIA');
    this.snackBar.open('Form cleared ✅', 'OK', { duration: 2000 });
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
    const imageBase64 = this.data?.imageBase64 || this.data?.base64Image || this.data?.base64 || '';
    if (!imageBase64) return '';

    // If caller already passed a full data URL, use it. Otherwise, prefix with content type.
    if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(imageBase64);
    }

    const prefix = this.data?.contentType ? `data:${this.data.contentType};base64,` : 'data:image/png;base64,';
    return this.sanitizer.bypassSecurityTrustUrl(`${prefix}${imageBase64}`);
  }

  onOk() {
    this.dialogRef.close('ok');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
