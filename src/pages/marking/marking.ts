import { ChangeDetectorRef, Component, DestroyRef, inject, NgZone, Inject, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Serial } from '../../services/serial';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ModelsApi } from '../../services/models-api';
import { VehicleImageApi } from '../../services/vehicle-image-api';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { VehicleUtils } from '../../services/vehicle-utils';
import { ImagePreviewDialog } from '../image-preview-dialog/image-preview-dialog';
import { PrinterApi } from '../../services/printer-api';
import { QrLoader } from '../../loaders/qr-loader/qr-loader';
import { finalize } from 'rxjs/operators';
@Component({
  selector: 'app-marking',
  imports: [
    ReactiveFormsModule, FormsModule, MatDialogModule, CommonModule, QrLoader
  ],
  templateUrl: './marking.html',
  styleUrls: ['./marking.scss'],
})
export class Marking {
 private printerService = inject(PrinterApi);
private fb = inject(FormBuilder);
  private serialService = inject(Serial);
  private modelService = inject(ModelsApi);
  private vehicleImageService = inject(VehicleImageApi);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);
  private vehicleUtils = inject(VehicleUtils);
private lastLabelUrl: string | null = null;

  @ViewChild('nameplatCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  countryFlag: SafeUrl | null = null;
  labelPreviewImage: SafeUrl | null = null;
  scannedQrCode: string = '';
  private isFetchingImage = false; // Flag to prevent duplicate image API calls
  private activeDialogRef: MatDialogRef<ImagePreviewDialog> | null = null;
  isScanLoading = false;
  loaderMainMessage = 'Scanning QR Code';
  loaderSubMessage = 'Processing scanned data...';
  private scanLoadingCount = 0;

  // Mapping of backend country names to image names
  countryImageMap: { [key: string]: string } = {
    'INDIA': 'INDIA',
    'USA': 'usa',
    'UK': 'uk',
    'JAPAN': 'japan',
    'GERMANY': 'germany',
    'AUSTRALIA': 'AUSTRALIA'
  };

  form = this.fb.group({
  modelNo: [''],
  description: [''],
  description1: [''],
  market: [''],
  country: [null],
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
  vinNo: [''],
  engineSrNo: [''],
  cngTankId: [''],
  cngInstallDate: [''],
  cngRetestDate: [''],
  waterCapacity: [''],
  vinLast8: [''],
  sticker: ['vin']
});

  ngOnInit(): void {
    // Listen for country changes from form
    this.form.get('country')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((countryName) => {
        if (countryName) {
          this.loadCountryImage(countryName);
        } else {
          this.countryFlag = null;
        }
      });

    // Listen for changes in Model, VIN, and Engine fields to update the canvas automatically
    ['modelNo', 'vinNo', 'engineSrNo'].forEach(field => {
      this.form.get(field)?.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.updateCanvas());
    });

    this.serialService.dataSubject
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((scannedData) => {
        this.ngZone.run(() => {
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
      if (!this.vehicleUtils.isValidVIN(vinNumber)) {
        this.snackBar.open('Invalid VIN format in QR code (expected 17 digits)', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
        return;
      }
      if (!this.vehicleUtils.isValidModelNumber(modelNumber)) {
        this.snackBar.open('Invalid Model Number format in QR code (expected 18 digits)', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
        return;
      }

      // Bind VIN/color only after user confirms popup by clicking OK.
      this.processModelScan(modelNumber, { vinNumber, color, qrData });
    } else {
      this.snackBar.open('Invalid QR code format (expected VIN_MODEL_... )', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
    }
  }

  // Process single scan based on length
  private processSingleScan(scannedData: string) {
    this.scannedQrCode = scannedData;
    const cleanedData = scannedData.replace(/[^A-Za-z0-9]/g, '');

    if (this.vehicleUtils.isValidVIN(cleanedData)) {
      this.processVINScan(cleanedData);
    } else if (this.vehicleUtils.isValidModelNumber(cleanedData)) {
      this.processModelScan(cleanedData);
    } else if (this.vehicleUtils.isValidEngineNumber(cleanedData)) {
      this.processEngineScan(cleanedData);
    } else {
      this.snackBar.open('Invalid scan data! Expected VIN (17), Model (18), or Engine (10) digits', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
    }
  }

  // Process VIN scan
  private processVINScan(vinNumber: string) {
    this.form.patchValue({ vinNo: vinNumber });
    this.updateCanvas();
    this.fetchLabelPreview();
    this.snackBar.open('VIN Number scanned successfully', 'OK', { duration: 2000, verticalPosition: 'top', horizontalPosition: 'center' });
  }

  // Process Engine scan
  private processEngineScan(engineNumber: string) {
    this.form.patchValue({ engineSrNo: engineNumber });
    this.updateCanvas();
    this.fetchLabelPreview();
    this.snackBar.open('Engine Number scanned successfully', 'OK', { duration: 2000, verticalPosition: 'top', horizontalPosition: 'center' });
  }

  // Process Model scan
  private processModelScan(
    modelNumber: string,
    combinedData?: { vinNumber: string; color: string | null; qrData: string }
  ) {
    // Extract 2-letter code from model number
    const twoLetterCode = this.vehicleUtils.extractTwoLetterCode(modelNumber);
    if (!twoLetterCode) {
      this.snackBar.open('Cannot extract letter code from model number', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
      return;
    }

    // Fetch vehicle image using GET API
    this.fetchVehicleImage(twoLetterCode, modelNumber, combinedData);
  }

  // Fetch vehicle image by image name
  private fetchVehicleImage(
    imageName: string,
    modelNumber: string,
    combinedData?: { vinNumber: string; color: string | null; qrData: string }
  ) {
    // Prevent duplicate API calls
    if (this.isFetchingImage) {
      return;
    }

    this.isFetchingImage = true;
    this.showScanLoader('Scanning QR Code', 'Fetching vehicle image...');
    this.vehicleImageService.getVehicleImages({ imageName }).pipe(
      finalize(() => this.hideScanLoader())
    ).subscribe({
      next: (response: any) => {
        this.isFetchingImage = false;

        if (response?.success && response?.data) {
          // API may return the base64 under different keys or already include the data: prefix.
          const data = response.data;
          const rawBase64 = data.imageBase64 || data.base64Image || data.base64 || data.base64Img || null;

          if (!rawBase64) {
            this.snackBar.open('Vehicle image not found', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
            return;
          }

          // If the returned string already contains the data URL prefix, use as-is.
          const dataUrl = rawBase64.startsWith('data:')
            ? rawBase64
            : `data:${data.contentType || 'image/png'};base64,${rawBase64}`;

          // Show image in popup
          this.showImagePopup(dataUrl, modelNumber, combinedData);
        } else {
          this.snackBar.open('Vehicle image not found', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
        }
      },
      error: (err: any) => {
        this.isFetchingImage = false;
        console.error('Image Fetch Error:', err);
        this.snackBar.open('Failed to fetch vehicle image', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
      }
    });
  }

  // Show image popup with OK/Cancel buttons
  private showImagePopup(
    imageBase64: string,
    modelNumber: string,
    combinedData?: { vinNumber: string; color: string | null; qrData: string }
  ) {
    if (this.activeDialogRef) {
      this.activeDialogRef.close();
    }

    const dialogRef = this.dialog.open(ImagePreviewDialog, {
      width: '400px',
      data: { imageBase64 }
    });

    this.activeDialogRef = dialogRef;

    dialogRef.afterClosed().subscribe((result) => {
      if (this.activeDialogRef === dialogRef) {
        this.activeDialogRef = null;
      }

      if (result === 'ok') {
        if (combinedData) {
          this.scannedQrCode = combinedData.qrData;
          this.form.patchValue({
            vinNo: combinedData.vinNumber,
            ...(combinedData.color ? { color: combinedData.color } : {})
          });
          this.updateCanvas();
          this.snackBar.open('QR code processed successfully', 'OK', { duration: 2000, verticalPosition: 'top', horizontalPosition: 'center' });
        }

        // User clicked OK - proceed to fetch model details
        this.form.patchValue({ modelNo: modelNumber });
        this.fetchModelDetails(modelNumber, combinedData?.color ?? null);
      }
      // If cancelled, do nothing
    });
  }

  fetchModelDetails(modelNo: string, preferredColor?: string | null) {

    this.showScanLoader('Scanning QR Code', 'Fetching model details...');
    this.modelService.getModelDetails(modelNo).pipe(
      finalize(() => this.hideScanLoader())
    ).subscribe({
      next: (response: any) => {
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

          if (preferredColor) {
            this.form.patchValue({ color: preferredColor });
          }

          this.updateCanvas();
          this.fetchLabelPreview();
          this.snackBar.open('Data Auto-filled Successfully!', 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
        } else {
          this.snackBar.open('Model not found in Database', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
        }
      },
      error: (err: any) => {
        console.error('API Error:', err);
        this.snackBar.open('API Connection Failed', 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
      }
    });
  }
  fetchLabelPreview() {
    const formData = this.form.getRawValue();
    const payload = {
      modelNo: formData.modelNo,
      vinNo: formData.vinNo,
      engineSrNo: formData.engineSrNo,
      description: formData.description,
      qr: this.scannedQrCode || formData.vinNo // Use scanned QR or fallback to VIN
    };

    this.showScanLoader('Preparing Preview', 'Generating print preview...');
    this.printerService.getLabelPreview(payload).pipe(
      finalize(() => this.hideScanLoader())
    ).subscribe({
      next: (blob: Blob) => {
      // जुना URL release
      if (this.lastLabelUrl) URL.revokeObjectURL(this.lastLabelUrl);

      const objectUrl = URL.createObjectURL(blob);
      this.lastLabelUrl = objectUrl;

      this.labelPreviewImage = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
      this.cdr.markForCheck();
    },
    error: (err) => {
      console.error('Label Preview API Error:', err);
      this.labelPreviewImage = null;
      this.cdr.markForCheck();
    }
  });
  }

  onPrint() {
    const formData = this.form.getRawValue();
    const payload = {
      modelNo: formData.modelNo,
      vinNo: formData.vinNo,
      engineSrNo: formData.engineSrNo,
      description: formData.description,
      qr: this.scannedQrCode || formData.vinNo
    };

    this.printerService.printLabel(payload).subscribe({
      next: (response: any) => {
        const msg = response?.message || 'Print command sent successfully';
        this.snackBar.open(msg, 'OK', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
      },
      error: (err) => {
        console.error('Print API Error:', err);
        let msg = 'Failed to print label ';
        if (err.error?.errors?.PrintData?.[0]) {
          msg = err.error.errors.PrintData[0];
        }
        this.snackBar.open(msg, 'Close', { duration: 3000, verticalPosition: 'top', horizontalPosition: 'center' });
      }
    });
  }

  private loadCountryImage(countryName: string) {
    // Get image name from mapping
    const imageName = this.countryImageMap[countryName] || countryName;

    // Check if image is jpeg or svg
    // const extension = imageName === 'INDIA' ? '.jpeg' : '.svg';
    const extension ='.jpeg';
    const imagePath = `/assets/countries/${imageName}${extension}`;
    this.countryFlag = this.sanitizer.bypassSecurityTrustUrl(imagePath);
    this.cdr.markForCheck();
  }

  // Update the canvas with current form data (Number Plate)
  private updateCanvas() {
    // Use setTimeout to ensure the DOM is ready and values are updated
    setTimeout(() => {
      this.cdr.detectChanges(); // Force UI update before drawing
      if (!this.canvasRef || !this.canvasRef.nativeElement) {
        console.warn("Canvas element not found!");
        return;
      }

      const canvas = this.canvasRef.nativeElement;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set Background & Border
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Draw Text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial'; // Slightly larger font
      const data = this.form.getRawValue(); // Get all values including disabled ones

      ctx.fillText(`Model : ${data.modelNo || ''}`, 15, 35);
      ctx.fillText(`VIN   : ${data.vinNo || ''}`, 15, 65);
      ctx.fillText(`Engine: ${data.engineSrNo || ''}`, 15, 95);
    }, 50);
  }

  // Clear all form fields (Refresh button)
  clearForm() {
    if (this.activeDialogRef) {
      this.activeDialogRef.close();
      this.activeDialogRef = null;
    }

    this.scannedQrCode = '';
    this.scanLoadingCount = 0;
    this.isScanLoading = false;
    if (this.lastLabelUrl) {
      URL.revokeObjectURL(this.lastLabelUrl);
      this.lastLabelUrl = null;
    }
    this.labelPreviewImage = null;
    this.countryFlag = null;

    this.form.reset({
      country: null,
      sticker: 'vin'
    });
    this.updateCanvas();
    this.cdr.markForCheck();
    this.snackBar.open('Form cleared successfully', 'OK', { duration: 2000, verticalPosition: 'top', horizontalPosition: 'center' });
  }

  private showScanLoader(mainMessage: string, subMessage: string) {
    this.scanLoadingCount += 1;
    this.loaderMainMessage = mainMessage;
    this.loaderSubMessage = subMessage;
    this.isScanLoading = true;
    this.cdr.markForCheck();
  }

  private hideScanLoader() {
    this.scanLoadingCount = Math.max(0, this.scanLoadingCount - 1);
    if (this.scanLoadingCount === 0) {
      this.isScanLoading = false;
      this.cdr.markForCheck();
    }
  }
}

