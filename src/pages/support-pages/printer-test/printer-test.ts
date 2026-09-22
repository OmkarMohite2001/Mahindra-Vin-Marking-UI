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
import {
  PrinterTestService,
  ZebraConfigurationResponse,
  ZebraPrintPayload,
  ZebraTestPrintResponse,
} from '../../../services/printer-test-service';

@Component({
  selector: 'app-printer-test',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './printer-test.html',
  styleUrl: './printer-test.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterTest {
  private printerService = inject(PrinterTestService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  isBusy = false;
  statusMessage = 'Click a button below to test printer APIs.';
  statusTone: 'info' | 'success' | 'error' = 'info';

  responseTitle = 'Response Console';
  responseText = 'Waiting for action...';

  // Simple input form for Print Label API
  printForm = this.fb.group({
    modelNo: ['W601', Validators.required],
    vinNo: ['MA1TESTVIN1234567', Validators.required],
    engineSrNo: ['ENG987654321', Validators.required],
    description: ['MAHINDRA SCORPIO-N'],
    qr: ['TEST-QR-2026'],
    copies: [1, [Validators.required, Validators.min(1)]],
  });

  /**
   * Helper to convert Zebra response codes into user-friendly messages
   */
  private formatCodeMessage(code: number | null | undefined, serverMessage?: string): { text: string; isSuccess: boolean } {
    switch (code) {
      case 0:
        return { text: 'SUCCESS (0): Test print completed successfully.', isSuccess: true };
      case 1:
        return { text: 'MAC_MATCH_SUCCESS (1): MAC address matched and print succeeded.', isSuccess: true };
      case -2:
        return { text: 'DEVICE_NOT_FOUND (-2): Zebra printer device was not found.', isSuccess: false };
      case -3:
        return { text: 'CREATEFILE_FAILED (-3): Failed to create printer device file.', isSuccess: false };
      case -4:
        return { text: 'WRITE_FAILED (-4): Failed to write print data to printer.', isSuccess: false };
      case -10:
        return { text: 'INVALID_VID_PID (-10): Invalid Vendor ID / Product ID settings.', isSuccess: false };
      case -20:
        return { text: 'ENUMERATION_FAILED (-20): USB device enumeration failed.', isSuccess: false };
      case -30:
        return { text: 'MAC_MISMATCH (-30): Device MAC address does not match configuration.', isSuccess: false };
      default:
        if (serverMessage) {
          return { text: serverMessage, isSuccess: false };
        }
        return { text: code !== null && code !== undefined ? `Response Code: ${code}` : 'No response code returned.', isSuccess: false };
    }
  }

  /**
   * 1. Test Print Button Action (POST /api/zebra/test-print)
   */
  onTestPrint(): void {
    this.isBusy = true;
    this.statusMessage = 'Running Zebra test print...';
    this.statusTone = 'info';
    this.responseTitle = 'Test Print Output';
    this.responseText = 'Sending POST /api/zebra/test-print...';
    this.cdr.markForCheck();

    this.printerService.testPrint().subscribe({
      next: (res: ZebraTestPrintResponse) => {
        this.isBusy = false;
        const codeInfo = this.formatCodeMessage(res.code, res.message);

        this.statusMessage = codeInfo.text;
        this.statusTone = res.ok || codeInfo.isSuccess ? 'success' : 'error';

        this.responseText = JSON.stringify(res, null, 2);

        this.snackBar.open(this.statusMessage, 'OK', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBusy = false;
        const errData = err.error || {};
        const codeInfo = this.formatCodeMessage(errData.code, errData.message || err.message);

        this.statusMessage = codeInfo.text;
        this.statusTone = 'error';

        this.responseText = JSON.stringify(err.error || { error: err.message }, null, 2);

        this.snackBar.open(this.statusMessage, 'Close', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * 2. Get Configuration Button Action (GET /api/Configuration)
   */
  onGetConfiguration(): void {
    this.isBusy = true;
    this.statusMessage = 'Fetching configuration...';
    this.statusTone = 'info';
    this.responseTitle = 'Configuration Settings';
    this.responseText = 'Requesting /api/Configuration...';
    this.cdr.markForCheck();

    this.printerService.getConfiguration().subscribe({
      next: (config: ZebraConfigurationResponse) => {
        this.isBusy = false;
        this.statusMessage = 'Configuration loaded successfully.';
        this.statusTone = 'success';

        this.responseText = JSON.stringify(config, null, 2);

        this.snackBar.open(this.statusMessage, 'OK', { duration: 4000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBusy = false;
        this.statusMessage = `Failed to get configuration: ${err.message || err.statusText}`;
        this.statusTone = 'error';

        this.responseText = JSON.stringify(err.error || { error: err.message }, null, 2);

        this.snackBar.open(this.statusMessage, 'Close', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * 3. Print Label Button Action (POST /api/zebra/print)
   */
  onPrintLabel(): void {
    if (this.printForm.invalid) {
      this.snackBar.open('Please fill in required fields.', 'Close', { duration: 3000, verticalPosition: 'top' });
      return;
    }

    const payload = this.printForm.getRawValue() as ZebraPrintPayload;
    this.isBusy = true;
    this.statusMessage = 'Sending print command...';
    this.statusTone = 'info';
    this.responseTitle = 'Print API Output';
    this.responseText = 'Sending POST /api/zebra/print...';
    this.cdr.markForCheck();

    this.printerService.printLabel(payload).subscribe({
      next: (res: any) => {
        this.isBusy = false;
        this.statusMessage = res?.message || 'Print command sent successfully!';
        this.statusTone = 'success';

        this.responseText = JSON.stringify(res || { ok: true, message: this.statusMessage }, null, 2);

        this.snackBar.open(this.statusMessage, 'OK', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isBusy = false;
        const msg = err.error?.message || err.error?.errors?.PrintData?.[0] || err.message || 'Print failed';
        this.statusMessage = `Print Error: ${msg}`;
        this.statusTone = 'error';

        this.responseText = JSON.stringify(err.error || { error: msg }, null, 2);

        this.snackBar.open(this.statusMessage, 'Close', { duration: 5000, verticalPosition: 'top' });
        this.cdr.markForCheck();
      },
    });
  }
}
