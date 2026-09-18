import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import {
  EngraveMachineService,
  EngraveRunPayload,
  EngraveRunSerialPayload,
  EngraveRunWithParameterPayload,
} from '../../../services/engrave-machine-service';

@Component({
  selector: 'app-engrave-machine',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSnackBarModule,
  ],
  templateUrl: './engrave-machine.html',
  styleUrl: './engrave-machine.scss',
})
export class EngraveMachine {
  private fb = inject(FormBuilder);
  private engraveMachineService = inject(EngraveMachineService);
  private snackBar = inject(MatSnackBar);

  loadingAction = '';
  connected = false;
  healthOk: boolean | null = null;
  statusMessage = 'Ready';
  statusTone: 'success' | 'error' | 'info' = 'info';
  responseTitle = 'Machine response';
  responseText = 'No API response yet.';
  latestData = '';
  selectedTool: 'command' | 'run' | 'dynamic' | 'serial' = 'command';

  private readonly ipPattern =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

  connectionForm = this.fb.nonNullable.group({
    ip: ['192.168.1.11', [Validators.required, Validators.pattern(this.ipPattern)]],
    port: [55555, [Validators.required, Validators.min(1), Validators.max(65535)]],
    timeoutMs: [3000, [Validators.required, Validators.min(500), Validators.max(60000)]],
  });

  commandForm = this.fb.nonNullable.group({
    command: ['ST', [Validators.required]],
    readTimeoutMs: [3000, [Validators.required, Validators.min(500), Validators.max(60000)]],
    lineEnding: ['\\r\\n'],
  });

  runForm = this.fb.nonNullable.group({
    template: ['TEST.tml', [Validators.required]],
    parametersText: ['MODEL001\nVIN001\nENGINE001'],
    interDelayMs: [1000, [Validators.required, Validators.min(0), Validators.max(60000)]],
    readTimeoutMs: [15000, [Validators.required, Validators.min(1000), Validators.max(120000)]],
    completionToken: ['GO F'],
    lineEnding: ['\\r\\n'],
  });

  dynamicForm = this.fb.nonNullable.group({
    parametersText: ['MODEL001\nVIN001\nENGINE001'],
    isReengrave: [false],
  });

  serialForm = this.fb.nonNullable.group({
    comPort: ['COM4', [Validators.required]],
    baudRate: [9600, [Validators.required, Validators.min(300), Validators.max(115200)]],
    template: ['TEST.tml', [Validators.required]],
    parametersText: ['MODEL001\nVIN001\nENGINE001'],
    lineEnding: ['\\r\\n'],
    interDelayMs: [2000, [Validators.required, Validators.min(0), Validators.max(60000)]],
    readTimeoutMs: [15000, [Validators.required, Validators.min(1000), Validators.max(120000)]],
  });

  ngOnInit(): void {
    this.refreshStatus();
    this.checkHealth();
  }

  get isBusy(): boolean {
    return !!this.loadingAction;
  }

  get healthLabel(): string {
    if (this.healthOk === null) {
      return 'Not checked';
    }
    return this.healthOk ? 'Reachable' : 'Not reachable';
  }

  selectTool(tool: 'command' | 'run' | 'dynamic' | 'serial'): void {
    this.selectedTool = tool;
  }

  checkHealth(): void {
    if (this.connectionForm.invalid) {
      this.connectionForm.markAllAsTouched();
      return;
    }

    const { ip, port } = this.connectionForm.getRawValue();
    this.runAction('health', () => this.engraveMachineService.health(ip.trim(), Number(port)), {
      title: 'GET /api/engrave/machine/health',
      successMessage: 'Machine health checked.',
      afterSuccess: (response) => {
        const ok = this.readBoolean(response, 'ok');
        this.healthOk = ok;
        this.setStatus(ok ? 'Machine is reachable.' : this.readMessage(response, 'Machine is not reachable.'), ok ? 'success' : 'error');
      },
    });
  }

  connect(): void {
    if (this.connectionForm.invalid) {
      this.connectionForm.markAllAsTouched();
      return;
    }

    const value = this.connectionForm.getRawValue();
    this.runAction(
      'connect',
      () =>
        this.engraveMachineService.connect({
          ip: value.ip.trim(),
          port: Number(value.port),
          timeoutMs: Number(value.timeoutMs),
        }),
      {
        title: 'POST /api/engrave/machine/connect',
        successMessage: 'Machine connected.',
        afterSuccess: (response) => {
          this.connected = this.readBoolean(response, 'connected');
          this.healthOk = true;
        },
      },
    );
  }

  disconnect(): void {
    this.runAction('disconnect', () => this.engraveMachineService.disconnect(), {
      title: 'POST /api/engrave/machine/disconnect',
      successMessage: 'Machine disconnected.',
      afterSuccess: (response) => {
        this.connected = this.readBoolean(response, 'connected');
      },
    });
  }

  refreshStatus(): void {
    this.runAction('status', () => this.engraveMachineService.status(), {
      title: 'GET /api/engrave/machine/status',
      successMessage: 'Machine status loaded.',
      silent: true,
      afterSuccess: (response) => {
        this.connected = this.readBoolean(response, 'connected');
        this.setStatus(this.connected ? 'Machine connected.' : 'Machine disconnected.', this.connected ? 'success' : 'info');
      },
    });
  }

  readLatest(clear = false): void {
    this.runAction('readLatest', () => this.engraveMachineService.readLatest(clear), {
      title: 'GET /api/engrave/machine/read-latest',
      successMessage: 'Latest machine data loaded.',
      afterSuccess: (response) => {
        this.latestData = this.readString(response, 'data');
        this.connected = this.readBoolean(response, 'connected');
      },
    });
  }

  sendCommand(): void {
    if (this.commandForm.invalid) {
      this.commandForm.markAllAsTouched();
      return;
    }

    const value = this.commandForm.getRawValue();
    this.runAction(
      'send',
      () =>
        this.engraveMachineService.send({
          command: value.command.trim(),
          readTimeoutMs: Number(value.readTimeoutMs),
          lineEnding: this.decodeLineEnding(value.lineEnding),
        }),
      {
        title: 'POST /api/engrave/machine/send',
        successMessage: 'Command sent.',
        afterSuccess: (response) => {
          this.latestData = this.readString(response, 'latest') || this.readString(response, 'response');
        },
      },
    );
  }

  runEngrave(): void {
    if (this.connectionForm.invalid || this.runForm.invalid) {
      this.connectionForm.markAllAsTouched();
      this.runForm.markAllAsTouched();
      return;
    }

    const connection = this.connectionForm.getRawValue();
    const run = this.runForm.getRawValue();
    const payload: EngraveRunPayload = {
      ip: connection.ip.trim(),
      port: Number(connection.port),
      template: run.template.trim(),
      parameters: this.parseParameters(run.parametersText),
      interDelayMs: Number(run.interDelayMs),
      readTimeoutMs: Number(run.readTimeoutMs),
      completionToken: run.completionToken.trim() || 'GO F',
      lineEnding: this.decodeLineEnding(run.lineEnding),
    };

    this.runAction('run', () => this.engraveMachineService.run(payload), {
      title: 'POST /api/engrave/run',
      successMessage: 'Engrave run completed.',
    });
  }

  runDynamic(): void {
    if (this.dynamicForm.invalid) {
      this.dynamicForm.markAllAsTouched();
      return;
    }

    const value = this.dynamicForm.getRawValue();
    const payload: EngraveRunWithParameterPayload = {
      parameters: this.parseParameters(value.parametersText),
      isReengrave: value.isReengrave,
    };

    this.runAction('dynamic', () => this.engraveMachineService.runDynamic(payload), {
      title: 'POST /api/engrave/run-dynamic',
      successMessage: 'Dynamic engrave request completed.',
    });
  }

  runWithParameter(): void {
    if (this.dynamicForm.invalid) {
      this.dynamicForm.markAllAsTouched();
      return;
    }

    const value = this.dynamicForm.getRawValue();
    this.runAction(
      'withParameter',
      () =>
        this.engraveMachineService.runWithParameter({
          parameters: this.parseParameters(value.parametersText),
          isReengrave: value.isReengrave,
        }),
      {
        title: 'POST /api/engrave/runwithparameter',
        successMessage: 'Parameterized engrave request completed.',
      },
    );
  }

  runSerial(): void {
    if (this.serialForm.invalid) {
      this.serialForm.markAllAsTouched();
      return;
    }

    const value = this.serialForm.getRawValue();
    const payload: EngraveRunSerialPayload = {
      comPort: value.comPort.trim(),
      baudRate: Number(value.baudRate),
      template: value.template.trim(),
      parameters: this.parseParameters(value.parametersText),
      lineEnding: this.decodeLineEnding(value.lineEnding),
      interDelayMs: Number(value.interDelayMs),
      readTimeoutMs: Number(value.readTimeoutMs),
    };

    this.runAction('serial', () => this.engraveMachineService.runSerial(payload), {
      title: 'POST /api/engrave/run-serial',
      successMessage: 'Serial engrave command sent.',
    });
  }

  private runAction(
    action: string,
    requestFactory: () => Observable<unknown>,
    options: {
      title: string;
      successMessage: string;
      silent?: boolean;
      afterSuccess?: (response: unknown) => void;
    },
  ): void {
    this.loadingAction = action;
    this.responseTitle = options.title;

    requestFactory()
      .pipe(finalize(() => (this.loadingAction = '')))
      .subscribe({
        next: (response: unknown) => {
          this.responseText = this.stringify(response);
          options.afterSuccess?.(response);
          const ok = this.readBoolean(response, 'ok');
          const message = this.readMessage(response, options.successMessage);
          this.setStatus(message, ok ? 'success' : 'error');
          if (!options.silent) {
            this.showSnack(message, ok);
          }
        },
        error: (error: unknown) => {
          const message = this.readErrorMessage(error, 'Machine API request failed.');
          this.responseText = this.stringify(this.extractError(error));
          this.setStatus(message, 'error');
          this.showSnack(message, false);
        },
      });
  }

  private parseParameters(value: string): string[] {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  private decodeLineEnding(value: string): string {
    return value.replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  }

  private setStatus(message: string, tone: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
  }

  private showSnack(message: string, ok: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 4500,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ok ? ['snackbar-success'] : ['snackbar-error'],
    });
  }

  private readBoolean(value: unknown, key: string): boolean {
    const record = this.toRecord(value);
    return typeof record?.[key] === 'boolean' ? record[key] : false;
  }

  private readString(value: unknown, key: string): string {
    const raw = this.toRecord(value)?.[key];
    return typeof raw === 'string' ? raw : '';
  }

  private readMessage(value: unknown, fallback: string): string {
    const record = this.toRecord(value);
    const message = record?.['message'] ?? record?.['reason'] ?? record?.['error'];
    return typeof message === 'string' && message.trim() ? message : fallback;
  }

  private readErrorMessage(error: unknown, fallback: string): string {
    const root = this.toRecord(error);
    const responseError = this.toRecord(root?.['error']);
    return (
      this.readMessage(responseError, '') ||
      (typeof root?.['message'] === 'string' ? root['message'] : '') ||
      fallback
    );
  }

  private extractError(error: unknown): unknown {
    const root = this.toRecord(error);
    return root?.['error'] ?? error;
  }

  private stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }

}
