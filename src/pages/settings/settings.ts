import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import {
  EngravingOption,
  EngravingSettingsApi,
  EngravingSettingsByTransport,
  EngravingSettingsModel,
  EngravingSettingsResponse,
  EngravingTransport,
} from '../../services/engraving-settings';
import { ScannerFlowControl, ScannerParity, Serial } from '../../services/serial';

@Component({
  selector: 'app-settings',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private fb = inject(FormBuilder).nonNullable;
  private destroyRef = inject(DestroyRef);
  private scannerSerial = inject(Serial);
  private engravingSettingsApi = inject(EngravingSettingsApi);
  private snackBar = inject(MatSnackBar);
  private defaultEngravingResponse = this.engravingSettingsApi.createFallbackResponse();
  private engravingSettingsByTransport: EngravingSettingsByTransport =
    this.defaultEngravingResponse.settingsByTransport;

  readonly scannerSavedSettings = {
    name: 'Scanner Line-1',
    baudRate: 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'None' as ScannerParity,
    flowControl: 'None' as ScannerFlowControl,
    autoConnect: 'On',
  };

  scannerConnected = false;
  scannerPortSummary = 'No scanner port selected in this session';
  transportOptions: EngravingOption[] = this.defaultEngravingResponse.options.transports;
  portOptions = this.defaultEngravingResponse.options.ports;
  baudOptions = this.defaultEngravingResponse.options.baudRates;
  dataBitsOptions = this.defaultEngravingResponse.options.dataBits;
  stopBitsOptions = this.defaultEngravingResponse.options.stopBits;
  parityOptions = this.defaultEngravingResponse.options.parities;
  flowOptions = this.defaultEngravingResponse.options.flowControls;
  isSavingSettings = false;

  engravingForm = this.fb.group({
    fileName: [this.defaultEngravingResponse.settings.fileName, Validators.required],
    ipAddress: [this.defaultEngravingResponse.settings.ipAddress, Validators.required],
    port: [this.defaultEngravingResponse.settings.port, Validators.required],
    baudRate: [this.defaultEngravingResponse.settings.baudRate, Validators.required],
    dataBits: [this.defaultEngravingResponse.settings.dataBits, Validators.required],
    stopBits: [this.defaultEngravingResponse.settings.stopBits, Validators.required],
    parity: [this.defaultEngravingResponse.settings.parity, Validators.required],
    flowControl: [this.defaultEngravingResponse.settings.flowControl, Validators.required],
    transport: [this.defaultEngravingResponse.settings.transport, Validators.required],
  });

  constructor() {
    this.scannerConnected = this.scannerSerial.connectionState.getValue();
    this.scannerPortSummary = this.scannerSerial.getPortSummary();

    this.scannerSerial.connectionState
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((connected) => {
        this.scannerConnected = connected;
        this.scannerPortSummary = this.scannerSerial.getPortSummary();
      });
  }

  ngOnInit(): void {
    this.engravingForm.controls.transport.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((transport) => this.selectTransportSettings(transport));

    this.selectTransportSettings(this.engravingForm.controls.transport.value);
    this.loadEngravingSettings();
  }

  get scannerPortDisplay(): string {
    return this.scannerConnected ? this.scannerSerial.getPortName() : 'Disconnected';
  }

  get scannerNameDisplay(): string {
    return this.scannerSerial.getPortName();
  }

  async connectScanner(): Promise<void> {
    await this.scannerSerial.requestPort();
    this.scannerPortSummary = this.scannerSerial.getPortSummary();
  }

  loadEngravingSettings(): void {
    this.engravingSettingsApi
      .getSettings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.applyEngravingResponse(response);
      });
  }

  get isSerialTransport(): boolean {
    return this.normalizeTransport(this.engravingForm.controls.transport.value) === 'serial';
  }

  get isEthernetTransport(): boolean {
    return this.normalizeTransport(this.engravingForm.controls.transport.value) === 'ethernet';
  }

  saveEngraving(): void {
    if (this.engravingForm.invalid) {
      this.engravingForm.markAllAsTouched();
      return;
    }

    const transport = this.normalizeTransport(this.engravingForm.controls.transport.value);
    const selectedSettings = this.engravingSettingsByTransport[transport];
    const formValue = this.engravingForm.getRawValue();
    const payload = {
      id: selectedSettings.id,
      transport,
      fileName: formValue.fileName,
      ipAddress: formValue.ipAddress,
      port: formValue.port,
      baudRate: formValue.baudRate,
      dataBits: formValue.dataBits,
      stopBits: formValue.stopBits,
      parity: formValue.parity,
      flowControl: formValue.flowControl,
    };

    this.isSavingSettings = true;
    this.engravingSettingsApi
      .updateSettings(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSavingSettings = false;
          this.engravingSettingsByTransport = {
            ...this.engravingSettingsByTransport,
            [response.settings.transport]: { ...response.settings, isActive: true },
            [this.getOtherTransport(response.settings.transport)]: {
              ...this.engravingSettingsByTransport[this.getOtherTransport(response.settings.transport)],
              isActive: false,
            },
          };
          this.applySettingsToForm(response.settings);
          this.snackBar.open(response.message || 'Settings updated successfully', 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
        },
        error: (error) => {
          this.isSavingSettings = false;
          this.snackBar.open(this.readErrorMessage(error), 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
        },
      });
  }

  private applyEngravingResponse(response: EngravingSettingsResponse): void {
    this.engravingSettingsByTransport = {
      serial: { ...response.settingsByTransport.serial },
      ethernet: { ...response.settingsByTransport.ethernet },
    };
    this.transportOptions = response.options.transports;
    this.portOptions = response.options.ports;
    this.baudOptions = response.options.baudRates;
    this.dataBitsOptions = response.options.dataBits;
    this.stopBitsOptions = response.options.stopBits;
    this.parityOptions = response.options.parities;
    this.flowOptions = response.options.flowControls;

    this.applySettingsToForm(response.settings);
  }

  private readErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const root = error as Record<string, unknown>;
      const responseError =
        root['error'] && typeof root['error'] === 'object' ? (root['error'] as Record<string, unknown>) : null;

      const message =
        (typeof responseError?.['message'] === 'string' && responseError['message']) ||
        (typeof root['message'] === 'string' && root['message']);

      if (message) {
        return message;
      }
    }

    return 'Unable to update settings';
  }

  private selectTransportSettings(transport: string | null | undefined): void {
    const normalizedTransport = this.normalizeTransport(transport);
    const settings = this.engravingSettingsByTransport[normalizedTransport];
    this.applySettingsToForm(settings);
  }

  private applySettingsToForm(settings: EngravingSettingsModel): void {
    this.engravingForm.patchValue(
      {
        fileName: settings.fileName,
        ipAddress: settings.ipAddress,
        port: settings.port,
        baudRate: settings.baudRate,
        dataBits: settings.dataBits,
        stopBits: settings.stopBits,
        parity: settings.parity,
        flowControl: settings.flowControl,
        transport: settings.transport,
      },
      { emitEvent: false },
    );

    this.applyTransportMode(settings.transport);
  }

  private applyTransportMode(transport: EngravingTransport): void {
    const normalizedTransport = this.normalizeTransport(transport);
    const fileNameControl = this.engravingForm.controls.fileName;
    const ipAddressControl = this.engravingForm.controls.ipAddress;
    const portControl = this.engravingForm.controls.port;
    const baudRateControl = this.engravingForm.controls.baudRate;
    const dataBitsControl = this.engravingForm.controls.dataBits;
    const stopBitsControl = this.engravingForm.controls.stopBits;
    const parityControl = this.engravingForm.controls.parity;
    const flowControlControl = this.engravingForm.controls.flowControl;

    if (normalizedTransport === 'serial') {
      fileNameControl.setValidators([Validators.required]);
      ipAddressControl.clearValidators();
      portControl.setValidators([Validators.required]);
      baudRateControl.setValidators([Validators.required]);
      dataBitsControl.setValidators([Validators.required]);
      stopBitsControl.setValidators([Validators.required]);
      parityControl.setValidators([Validators.required]);
      flowControlControl.setValidators([Validators.required]);

      const portValue = `${portControl.value ?? ''}`.trim().toUpperCase();
      if (!portValue || !portValue.startsWith('COM')) {
        portControl.setValue(this.portOptions[0] ?? 'COM1', { emitEvent: false });
      }
    } else {
      fileNameControl.setValidators([Validators.required]);
      ipAddressControl.setValidators([Validators.required]);
      portControl.setValidators([Validators.required]);
      baudRateControl.clearValidators();
      dataBitsControl.clearValidators();
      stopBitsControl.clearValidators();
      parityControl.clearValidators();
      flowControlControl.clearValidators();

      const portValue = `${portControl.value ?? ''}`.trim().toUpperCase();
      if (!portValue || portValue.startsWith('COM')) {
        portControl.setValue('55555', { emitEvent: false });
      }
    }

    fileNameControl.updateValueAndValidity({ emitEvent: false });
    ipAddressControl.updateValueAndValidity({ emitEvent: false });
    portControl.updateValueAndValidity({ emitEvent: false });
    baudRateControl.updateValueAndValidity({ emitEvent: false });
    dataBitsControl.updateValueAndValidity({ emitEvent: false });
    stopBitsControl.updateValueAndValidity({ emitEvent: false });
    parityControl.updateValueAndValidity({ emitEvent: false });
    flowControlControl.updateValueAndValidity({ emitEvent: false });
  }

  private getOtherTransport(transport: EngravingTransport): EngravingTransport {
    return transport === 'serial' ? 'ethernet' : 'serial';
  }

  private normalizeTransport(value: string | null | undefined): EngravingTransport {
    return `${value ?? ''}`.trim().toLowerCase() === 'ethernet' ? 'ethernet' : 'serial';
  }
}
