import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

type Parity = 'None' | 'Even' | 'Odd' | 'Mark' | 'Space';
type FlowControl = 'None' | 'RTS/CTS' | 'XON/XOFF';
type UsbInterface = 'USB' | 'Serial-over-USB';
type UsbDriver = 'ZPL' | 'ESC/POS' | 'RAW';

interface SerialConfig {
  id: number;
  name: string;
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: Parity;
  flowControl: FlowControl;
  autoConnect: boolean;
  enabled: boolean;
}

interface UsbConfig {
  id: number;
  name: string;
  vendorId: string;
  productId: string;
  interfaceType: UsbInterface;
  driver: UsbDriver;
  endpointIn: string;
  endpointOut: string;
  enabled: boolean;
}

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
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private fb = inject(FormBuilder).nonNullable;

  readonly parityOptions: Parity[] = ['None', 'Even', 'Odd', 'Mark', 'Space'];
  readonly flowOptions: FlowControl[] = ['None', 'RTS/CTS', 'XON/XOFF'];
  readonly baudOptions = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];
  readonly dataBitsOptions = [5, 6, 7, 8];
  readonly stopBitsOptions = [1, 1.5, 2];
  readonly usbInterfaceOptions: UsbInterface[] = ['USB', 'Serial-over-USB'];
  readonly usbDriverOptions: UsbDriver[] = ['ZPL', 'ESC/POS', 'RAW'];

  serialConfigs: SerialConfig[] = [
    {
      id: 1,
      name: 'Scanner Line-1',
      port: 'COM3',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'None',
      flowControl: 'None',
      autoConnect: true,
      enabled: true,
    },
  ];

  usbConfigs: UsbConfig[] = [
    {
      id: 1,
      name: 'Label Printer',
      vendorId: '0x1A86',
      productId: '0x7523',
      interfaceType: 'USB',
      driver: 'ZPL',
      endpointIn: '0x81',
      endpointOut: '0x01',
      enabled: true,
    },
  ];

  editingSerialId: number | null = null;
  editingUsbId: number | null = null;

  serialForm = this.fb.group({
    name: ['', Validators.required],
    port: ['', Validators.required],
    baudRate: [9600, Validators.required],
    dataBits: [8, Validators.required],
    stopBits: [1, Validators.required],
    parity: ['None' as Parity, Validators.required],
    flowControl: ['None' as FlowControl, Validators.required],
    autoConnect: [true],
    enabled: [true],
  });

  usbForm = this.fb.group({
    name: ['', Validators.required],
    vendorId: ['', Validators.required],
    productId: ['', Validators.required],
    interfaceType: ['USB' as UsbInterface, Validators.required],
    driver: ['ZPL' as UsbDriver, Validators.required],
    endpointIn: ['0x81', Validators.required],
    endpointOut: ['0x01', Validators.required],
    enabled: [true],
  });

  saveSerial(): void {
    if (this.serialForm.invalid) {
      this.serialForm.markAllAsTouched();
      return;
    }

    const formValue = this.serialForm.getRawValue();
    if (this.editingSerialId) {
      const index = this.serialConfigs.findIndex((item) => item.id === this.editingSerialId);
      if (index >= 0) {
        this.serialConfigs[index] = { id: this.editingSerialId, ...formValue };
      }
    } else {
      const nextId = this.getNextId(this.serialConfigs);
      this.serialConfigs = [...this.serialConfigs, { id: nextId, ...formValue }];
    }

    this.resetSerial();
  }

  editSerial(item: SerialConfig): void {
    this.editingSerialId = item.id;
    const { id, ...formValue } = item;
    this.serialForm.reset(formValue);
  }

  deleteSerial(id: number): void {
    this.serialConfigs = this.serialConfigs.filter((item) => item.id !== id);
    if (this.editingSerialId === id) {
      this.resetSerial();
    }
  }

  resetSerial(): void {
    this.editingSerialId = null;
    this.serialForm.reset({
      name: '',
      port: '',
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'None',
      flowControl: 'None',
      autoConnect: true,
      enabled: true,
    });
  }

  saveUsb(): void {
    if (this.usbForm.invalid) {
      this.usbForm.markAllAsTouched();
      return;
    }

    const formValue = this.usbForm.getRawValue();
    if (this.editingUsbId) {
      const index = this.usbConfigs.findIndex((item) => item.id === this.editingUsbId);
      if (index >= 0) {
        this.usbConfigs[index] = { id: this.editingUsbId, ...formValue };
      }
    } else {
      const nextId = this.getNextId(this.usbConfigs);
      this.usbConfigs = [...this.usbConfigs, { id: nextId, ...formValue }];
    }

    this.resetUsb();
  }

  editUsb(item: UsbConfig): void {
    this.editingUsbId = item.id;
    const { id, ...formValue } = item;
    this.usbForm.reset(formValue);
  }

  deleteUsb(id: number): void {
    this.usbConfigs = this.usbConfigs.filter((item) => item.id !== id);
    if (this.editingUsbId === id) {
      this.resetUsb();
    }
  }

  resetUsb(): void {
    this.editingUsbId = null;
    this.usbForm.reset({
      name: '',
      vendorId: '',
      productId: '',
      interfaceType: 'USB',
      driver: 'ZPL',
      endpointIn: '0x81',
      endpointOut: '0x01',
      enabled: true,
    });
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private getNextId(list: Array<{ id: number }>): number {
    return list.length ? Math.max(...list.map((item) => item.id)) + 1 : 1;
  }
}
