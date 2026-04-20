import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MACHINE_SERIAL_DEFAULTS, SCANNER_SERIAL_DEFAULTS } from '../../services/engrave-defaults';
import { MachineSerial } from '../../services/machine-serial';
import { Serial } from '../../services/serial';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private fb = inject(FormBuilder).nonNullable;
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private scannerSerial = inject(Serial);
  private machineSerial = inject(MachineSerial);

  readonly baudOptions = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
  readonly checksumOptions: readonly { value: boolean; label: string }[] = [
    { value: false, label: 'Off (recommended)' },
    { value: true, label: 'On' },
  ];

  scannerConnected = false;
  machineConnected = false;
  scannerPortSummary = 'No scanner port selected';
  machinePortSummary = 'No machine port selected';

  serialSettingsForm = this.fb.group({
    scannerBaudRate: this.fb.control<number>(SCANNER_SERIAL_DEFAULTS.baudRate, {
      validators: [Validators.required],
    }),
    scannerAutoConnect: this.fb.control<boolean>(SCANNER_SERIAL_DEFAULTS.autoConnect, {
      validators: [Validators.required],
    }),
    machineBaudRate: this.fb.control<number>(MACHINE_SERIAL_DEFAULTS.baudRate, {
      validators: [Validators.required],
    }),
    machineTemplate: this.fb.control<string>(MACHINE_SERIAL_DEFAULTS.template, {
      validators: [Validators.required],
    }),
    machineCompletionToken: this.fb.control<string>(MACHINE_SERIAL_DEFAULTS.completionToken, {
      validators: [Validators.required],
    }),
    machineUseChecksum: this.fb.control<boolean>(MACHINE_SERIAL_DEFAULTS.useChecksum, {
      validators: [Validators.required],
    }),
    machineInterDelayMs: this.fb.control<number>(MACHINE_SERIAL_DEFAULTS.interDelayMs, {
      validators: [Validators.required, Validators.min(0)],
    }),
    machineResponseTimeoutMs: this.fb.control<number>(
      MACHINE_SERIAL_DEFAULTS.responseTimeoutMs,
      {
        validators: [Validators.required, Validators.min(1000)],
      },
    ),
  });

  constructor() {
    this.loadSettingsFromStorage();
    this.refreshPortSummaries();

    this.scannerSerial.connectionState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((connected) => {
        this.scannerConnected = connected;
      });

    this.machineSerial.connectionState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((connected) => {
        this.machineConnected = connected;
      });
  }

  async chooseScannerPort(): Promise<void> {
    try {
      await this.scannerSerial.requestPort();
      this.refreshPortSummaries();
      this.showSnack('Scanner read-only port selected and saved for this browser.', true);
    } catch (error) {
      this.showSnack(this.resolveErrorMessage(error, 'Unable to select scanner port.'), false);
    }
  }

  async chooseMachinePort(): Promise<void> {
    try {
      await this.machineSerial.requestPort(this.scannerSerial.getCurrentPort());
      this.refreshPortSummaries();
      this.showSnack('Machine read/write port selected and saved for this browser.', true);
    } catch (error) {
      this.showSnack(this.resolveErrorMessage(error, 'Unable to select machine port.'), false);
    }
  }

  clearScannerSelection(): void {
    this.scannerSerial.clearSavedPortPreference();
    this.refreshPortSummaries();
    this.showSnack('Saved scanner port selection cleared.', true);
  }

  clearMachineSelection(): void {
    this.machineSerial.clearSavedPortPreference();
    this.refreshPortSummaries();
    this.showSnack('Saved machine port selection cleared.', true);
  }

  saveSerialSettings(): void {
    if (this.serialSettingsForm.invalid) {
      this.serialSettingsForm.markAllAsTouched();
      return;
    }

    const formValue = this.serialSettingsForm.getRawValue();
    localStorage.setItem('scannerSerial.baudRate', String(formValue.scannerBaudRate));
    localStorage.setItem('scannerSerial.autoConnect', String(formValue.scannerAutoConnect));
    localStorage.setItem('machineSerial.baudRate', String(formValue.machineBaudRate));
    localStorage.setItem('machineSerial.template', formValue.machineTemplate.trim());
    localStorage.setItem('machineSerial.completionToken', formValue.machineCompletionToken.trim());
    localStorage.setItem('machineSerial.useChecksum', String(formValue.machineUseChecksum));
    localStorage.setItem('machineSerial.interDelayMs', String(formValue.machineInterDelayMs));
    localStorage.setItem(
      'machineSerial.responseTimeoutMs',
      String(formValue.machineResponseTimeoutMs),
    );
    localStorage.removeItem('machineSerial.lineTerminator');

    this.showSnack('Serial communication settings saved in this browser.', true);
  }

  resetSerialSettings(): void {
    this.serialSettingsForm.reset({
      scannerBaudRate: SCANNER_SERIAL_DEFAULTS.baudRate,
      scannerAutoConnect: SCANNER_SERIAL_DEFAULTS.autoConnect,
      machineBaudRate: MACHINE_SERIAL_DEFAULTS.baudRate,
      machineTemplate: MACHINE_SERIAL_DEFAULTS.template,
      machineCompletionToken: MACHINE_SERIAL_DEFAULTS.completionToken,
      machineUseChecksum: MACHINE_SERIAL_DEFAULTS.useChecksum,
      machineInterDelayMs: MACHINE_SERIAL_DEFAULTS.interDelayMs,
      machineResponseTimeoutMs: MACHINE_SERIAL_DEFAULTS.responseTimeoutMs,
    });
  }

  private loadSettingsFromStorage(): void {
    this.serialSettingsForm.reset({
      scannerBaudRate: this.readNumber(
        'scannerSerial.baudRate',
        SCANNER_SERIAL_DEFAULTS.baudRate,
        1,
      ),
      scannerAutoConnect: this.readBoolean(
        'scannerSerial.autoConnect',
        SCANNER_SERIAL_DEFAULTS.autoConnect,
      ),
      machineBaudRate: this.readNumber(
        'machineSerial.baudRate',
        MACHINE_SERIAL_DEFAULTS.baudRate,
        1,
      ),
      machineTemplate: localStorage.getItem('machineSerial.template') || MACHINE_SERIAL_DEFAULTS.template,
      machineCompletionToken:
        localStorage.getItem('machineSerial.completionToken') ||
        MACHINE_SERIAL_DEFAULTS.completionToken,
      machineUseChecksum: this.readBoolean(
        'machineSerial.useChecksum',
        MACHINE_SERIAL_DEFAULTS.useChecksum,
      ),
      machineInterDelayMs: this.readNumber(
        'machineSerial.interDelayMs',
        MACHINE_SERIAL_DEFAULTS.interDelayMs,
        0,
      ),
      machineResponseTimeoutMs: this.readNumber(
        'machineSerial.responseTimeoutMs',
        MACHINE_SERIAL_DEFAULTS.responseTimeoutMs,
        1000,
      ),
    });
  }

  private refreshPortSummaries(): void {
    this.scannerPortSummary = this.scannerSerial.getSavedPortSummary();
    this.machinePortSummary = this.machineSerial.getSavedPortSummary();
  }

  private readNumber(storageKey: string, fallback: number, minValue?: number): number {
    const parsedValue = Number(localStorage.getItem(storageKey));
    if (!Number.isFinite(parsedValue)) {
      return fallback;
    }

    if (minValue !== undefined && parsedValue < minValue) {
      return fallback;
    }

    return parsedValue;
  }

  private readBoolean(storageKey: string, fallback: boolean): boolean {
    const rawValue = localStorage.getItem(storageKey);
    return rawValue === null ? fallback : rawValue === 'true';
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message.trim().length ? error.message : fallback;
  }

  private showSnack(message: string, success: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: success ? ['snackbar-success'] : ['snackbar-error'],
    });
  }
}
