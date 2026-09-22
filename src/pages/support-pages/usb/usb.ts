import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsbApi } from '../../../services/usb-api';

@Component({
  selector: 'app-usb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
  ],
  templateUrl: './usb.html',
  styleUrls: ['./usb.scss'],
})
export class Usb {
  private readonly usbApi = inject(UsbApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  isBusy = false;
  statusMessage = 'Click a button below to test USB printer APIs.';
  statusTone: 'info' | 'success' | 'error' = 'info';

  responseTitle = 'Response Console';
  responseText = 'Waiting for action...';

  // Form for /api/Usb/print
  printForm = this.fb.group({
    modelNo: ['W601', Validators.required],
    vinNo: ['MA1TESTVIN1234567', Validators.required],
    engineSrNo: ['ENG987654321', Validators.required],
    description: ['MAHINDRA SCORPIO-N'],
    qr: ['USB-QR-TEST-2026'],
  });

  /**
   * 1. TSPL Print Action (POST /api/Usb/tspl_print)
   */
  onTsplPrint(): void {
    const defaultTsplPayload = {
      printData: 'TEST TSPL PRINT',
      vendorId: '1203',
      productId: '0230',
      useMacValidation: false,
      macAddressList: '',
      matchMacAddress: '',
      noOfBytes: 0,
    };

    this.isBusy = true;
    this.statusMessage = 'Executing TSPL Print...';
    this.statusTone = 'info';
    this.responseTitle = 'TSPL Print Output';
    this.responseText = 'Sending POST /api/Usb/tspl_print...';
    this.cdr.markForCheck();

    this.usbApi.printTspL(defaultTsplPayload).subscribe({
      next: (res: any) => {
        this.isBusy = false;
        this.statusMessage = res?.message || 'TSPL Print executed successfully!';
        this.statusTone = 'success';
        this.responseText = JSON.stringify(res || { ok: true, message: this.statusMessage }, null, 2);
        this.snackBar.open(this.statusMessage, 'OK', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBusy = false;
        const msg = err.error?.message || err.message || 'TSPL print failed';
        this.statusMessage = `TSPL Print Error: ${msg}`;
        this.statusTone = 'error';
        this.responseText = JSON.stringify(err.error || { error: msg }, null, 2);
        this.snackBar.open(this.statusMessage, 'Close', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * 2. Print In One Action (POST /api/Usb/printinone)
   */
  onPrintInOne(): void {
    const defaultPrintInOnePayload = {
      command: '1203|0230|false||^^NO|45|CLS\r\nTEXT 10,10,"0",0,10,10,"www.credentialsintegrated.com"\r\nPRINT 1,1\r\nEOJ\r\n',
    };

    this.isBusy = true;
    this.statusMessage = 'Executing Print In One...';
    this.statusTone = 'info';
    this.responseTitle = 'Print In One Output';
    this.responseText = 'Sending POST /api/Usb/printinone...';
    this.cdr.markForCheck();

    this.usbApi.printInOne(defaultPrintInOnePayload).subscribe({
      next: (res: any) => {
        this.isBusy = false;
        this.statusMessage = res?.message || 'Print In One executed successfully!';
        this.statusTone = 'success';
        this.responseText = JSON.stringify(res || { ok: true, message: this.statusMessage }, null, 2);
        this.snackBar.open(this.statusMessage, 'OK', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBusy = false;
        const msg = err.error?.message || err.message || 'Print In One failed';
        this.statusMessage = `Print In One Error: ${msg}`;
        this.statusTone = 'error';
        this.responseText = JSON.stringify(err.error || { error: msg }, null, 2);
        this.snackBar.open(this.statusMessage, 'Close', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * 3. Print Label Action (POST /api/Usb/print)
   */
  onPrintLabel(): void {
    if (this.printForm.invalid) {
      this.snackBar.open('Please fill in required fields.', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    const payload = this.printForm.getRawValue();
    this.isBusy = true;
    this.statusMessage = 'Sending USB print command...';
    this.statusTone = 'info';
    this.responseTitle = 'USB Print Output';
    this.responseText = 'Sending POST /api/Usb/print...';
    this.cdr.markForCheck();

    this.usbApi.print(payload).subscribe({
      next: (res: any) => {
        this.isBusy = false;
        this.statusMessage = res?.message || 'USB print command sent successfully!';
        this.statusTone = 'success';
        this.responseText = JSON.stringify(res || { ok: true, message: this.statusMessage }, null, 2);
        this.snackBar.open(this.statusMessage, 'OK', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBusy = false;
        const msg = err.error?.message || err.message || 'USB print failed';
        this.statusMessage = `USB Print Error: ${msg}`;
        this.statusTone = 'error';
        this.responseText = JSON.stringify(err.error || { error: msg }, null, 2);
        this.snackBar.open(this.statusMessage, 'Close', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
    });
  }
}
