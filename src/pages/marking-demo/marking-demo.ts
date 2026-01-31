import { ChangeDetectorRef, Component, inject, model, NgZone } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Serial } from '../../services/serial';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ModelsApi } from '../../services/models-api';

@Component({
  selector: 'app-marking-demo',
  imports: [ReactiveFormsModule,FormsModule],
  templateUrl: './marking-demo.html',
  styleUrl: './marking-demo.scss',
})
export class MarkingDemo {
private fb = inject(FormBuilder);
  private serialService = inject(Serial);
  private modelService = inject(ModelsApi);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  private snackBar = inject(MatSnackBar);

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
        this.form.patchValue({ modelNo: scannedData });

        this.fetchModelDetails(scannedData);
      });
    });

    this.serialService.autoConnect();
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
