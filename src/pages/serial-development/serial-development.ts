import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MachineSerial } from '../../services/machine-serial';
import { Serial } from '../../services/serial';

type LineEndingOption = '\\r\\n' | '\\n' | '\\r';

@Component({
  selector: 'app-serial-development',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './serial-development.html',
  styleUrl: './serial-development.scss',
})
export class SerialDevelopment {
  private fb = inject(FormBuilder).nonNullable;
  private machineSerial = inject(MachineSerial);
  private scannerSerial = inject(Serial);
  private snackBar = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('scrollMe') private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly lineEndingOptions: readonly { value: LineEndingOption; label: string }[] = [
    { value: '\\r\\n', label: 'CRLF' },
    { value: '\\n', label: 'LF' },
    { value: '\\r', label: 'CR' },
  ];

  logs: string[] = [];
  machineConnected = false;
  scannerConnected = false;

  form = this.fb.group({
    command: ['', Validators.required],
    lineEnding: ['\\r\\n' as LineEndingOption, Validators.required],
    readTimeoutMs: [3000, Validators.required],
  });

  constructor() {
    this.machineSerial.connectionState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((connected) => {
        this.machineConnected = connected;
        this.cdr.markForCheck();
      });

    this.scannerSerial.connectionState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((connected) => {
        this.scannerConnected = connected;
        this.cdr.markForCheck();
      });

    this.machineSerial.dataSubject
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((line) => {
        this.pushLog(`RX ${line}`);
      });
  }

  get scannerPortSummary(): string {
    return this.scannerSerial.getSavedPortSummary();
  }

  get machinePortSummary(): string {
    return this.machineSerial.getSavedPortSummary();
  }

  async connectMachinePort(): Promise<void> {
    try {
      await this.machineSerial.requestPort(this.scannerSerial.getCurrentPort());
      this.showSnack('Machine serial port connected.', true);
    } catch (error) {
      this.showSnack(this.resolveErrorMessage(error, 'Unable to connect machine port.'), false);
    }
  }

  async sendCommand(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const command = formValue.command.trim();
    if (!command.length) {
      return;
    }

    this.pushLog(`TX ${command}`);

    try {
      const response = await this.machineSerial.sendCustomCommand(
        command,
        {
          lineEnding: this.resolveLineEnding(formValue.lineEnding),
          readTimeoutMs: Number(formValue.readTimeoutMs),
        },
        this.scannerSerial.getCurrentPort(),
      );

      this.pushLog(response.trim().length ? `ACK ${response}` : 'ACK <no response>');
      this.form.patchValue({ command: '' });
      this.showSnack('Command sent to machine port.', true);
    } catch (error) {
      const message = this.resolveErrorMessage(error, 'Command send failed.');
      this.pushLog(`ERR ${message}`);
      this.showSnack(message, false);
    }
  }

  clearLog(): void {
    this.logs = [];
  }

  private pushLog(line: string): void {
    this.logs = [...this.logs.slice(-199), line];
    setTimeout(() => {
      if (!this.scrollContainer) {
        return;
      }

      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    }, 0);
  }

  private resolveLineEnding(value: LineEndingOption): string {
    if (value === '\\n') {
      return '\n';
    }
    if (value === '\\r') {
      return '\r';
    }
    return '\r\n';
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
