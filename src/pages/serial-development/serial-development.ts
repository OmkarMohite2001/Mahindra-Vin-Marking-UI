import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, ElementRef, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MACHINE_SERIAL_DEFAULTS } from '../../services/engrave-defaults';
import { MachineSerial } from '../../services/machine-serial';
import { Serial } from '../../services/serial';

@Component({
  selector: 'app-serial-development',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
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

  logs: string[] = [];
  machineConnected = false;
  scannerConnected = false;
  isRunningBackendFlow = false;

  form = this.fb.group({
    command: ['', Validators.required],
    readTimeoutMs: [MACHINE_SERIAL_DEFAULTS.responseTimeoutMs, Validators.required],
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
      console.log('[SerialDevelopment] Connect machine port requested');
      await this.machineSerial.requestPort(this.scannerSerial.getCurrentPort());
      this.showSnack('Machine serial port connected.', true);
    } catch (error) {
      console.error('[SerialDevelopment] Connect machine port failed', error);
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

    console.log('[SerialDevelopment] Manual send', {
      command,
      sentHex: this.machineSerial.getCommandHex(command),
      readTimeoutMs: Number(formValue.readTimeoutMs),
    });
    this.pushLog(`TX ${command} [${this.machineSerial.getCommandHex(command)}]`);

    try {
      const response = await this.machineSerial.sendCustomCommand(
        command,
        {
          readTimeoutMs: Number(formValue.readTimeoutMs),
        },
        this.scannerSerial.getCurrentPort(),
      );

      this.pushLog(response.trim().length ? `RESP ${this.flattenResponse(response)}` : 'RESP <no immediate response>');
      console.log('[SerialDevelopment] Manual send response', {
        response,
        escapedResponse: this.flattenResponse(response),
      });
      this.form.patchValue({ command: '' });
      this.showSnack('Command sent to machine port.', true);
    } catch (error) {
      const message = this.resolveErrorMessage(error, 'Command send failed.');
      console.error('[SerialDevelopment] Manual send failed', error);
      this.pushLog(`ERR ${message}`);
      this.showSnack(message, false);
    }
  }

  async runBackendFlow(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.getRawValue();
    const command = formValue.command.trim();
    const parameters = this.resolveSequenceParameters(command);
    if (!parameters.length) {
      return;
    }

    console.log('[SerialDevelopment] Backend-style run', {
      sourceInput: command,
      parameters,
      readTimeoutMs: Number(formValue.readTimeoutMs),
    });
    this.isRunningBackendFlow = true;
    this.pushLog(`FLOW Start backend-style run for ${parameters.length} parameter(s)`);

    try {
      const result = await this.machineSerial.runDevelopmentSequence(
        parameters,
        {
          readTimeoutMs: Number(formValue.readTimeoutMs),
        },
        this.scannerSerial.getCurrentPort(),
      );

      result.log.forEach((line) => this.pushLog(`FLOW ${line}`));
      if (result.response.trim().length) {
        this.pushLog(`RESP ${this.flattenResponse(result.response)}`);
      }
      if (result.st?.raw?.trim().length) {
        this.pushLog(`ST ${this.flattenResponse(result.st.raw)}`);
      }

      console.log('[SerialDevelopment] Backend-style result', result);
      this.pushLog(result.ok ? `DONE ${result.message}` : `FAIL ${result.message}`);
      this.showSnack(
        result.ok ? 'Backend-style machine flow completed.' : result.message,
        result.ok,
      );
    } catch (error) {
      const message = this.resolveErrorMessage(error, 'Backend-style run failed.');
      console.error('[SerialDevelopment] Backend-style run failed', error);
      this.pushLog(`ERR ${message}`);
      this.showSnack(message, false);
    } finally {
      this.isRunningBackendFlow = false;
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

  private resolveSequenceParameters(command: string): string[] {
    return command
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const match = line.match(/^VS\s+\d+\s+"([\s\S]*)"$/i);
        return match ? match[1].trim() : line;
      })
      .filter((line) => line.length > 0)
      .slice(0, 10);
  }

  private flattenResponse(value: string): string {
    return value.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
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
