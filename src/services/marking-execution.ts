import { Injectable, inject } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { EngraveApi, EngraveResponse } from './engrave-api';
import { MachineSerial } from './machine-serial';
import { MarkingModeService } from './marking-mode';
import type { MarkingMode as MarkingModeType } from './marking-mode';
import { PrinterApi } from './printer-api';
import { ProductionDataReportApi } from './production-data-report-api';
import { Serial } from './serial';

export interface MarkingExecutionInput {
  modelNo: string;
  vinNo: string;
  engineSrNo: string;
  description: string;
  qr: string;
}

export interface MarkingExecutionResult {
  mode: MarkingModeType;
  engraveMessage: string;
  productionMessage: string;
  productionSucceeded: boolean;
  printMessage: string;
}

@Injectable({
  providedIn: 'root',
})
export class MarkingExecution {
  private engraveApi = inject(EngraveApi);
  private machineSerial = inject(MachineSerial);
  private markingMode = inject(MarkingModeService);
  private printerApi = inject(PrinterApi);
  private productionApi = inject(ProductionDataReportApi);
  private scannerSerial = inject(Serial);

  executeMarking(input: MarkingExecutionInput): Observable<MarkingExecutionResult> {
    return this.execute(input, 'marking');
  }

  executeReEngrave(input: MarkingExecutionInput): Observable<MarkingExecutionResult> {
    return this.execute(input, 'reengrave');
  }

  private execute(
    input: MarkingExecutionInput,
    mode: 'marking' | 'reengrave',
  ): Observable<MarkingExecutionResult> {
    const currentMode = this.markingMode.getMode();
    const parameters = [input.modelNo, input.vinNo, input.engineSrNo];
    const engraveRequest$ =
      currentMode === 'serial'
        ? from(this.machineSerial.executeEngrave(parameters, this.scannerSerial.getCurrentPort()))
        : this.engraveApi.runWithParameter({ parameters });

    const productionPayload = {
      modelCode: input.modelNo,
      viN_NO: input.vinNo,
      engineNo: input.engineSrNo,
    };

    const printPayload = {
      modelNo: input.modelNo,
      vinNo: input.vinNo,
      engineSrNo: input.engineSrNo,
      description: input.description,
      qr: input.qr || input.vinNo,
    };

    return engraveRequest$.pipe(
      switchMap((engraveResponse: EngraveResponse) => {
        if (engraveResponse?.ok !== true) {
          return throwError(() =>
            new Error(engraveResponse?.message || this.resolveEngraveFallbackMessage(currentMode))
          );
        }

        const productionRequest$ =
          mode === 'reengrave'
            ? this.productionApi.reengrave(productionPayload)
            : this.productionApi.addProduction(productionPayload);

        return productionRequest$.pipe(
          map((response: any) => ({
            success: true,
            message:
              response?.message ||
              (mode === 'reengrave'
                ? 'Re-engrave production data updated successfully.'
                : 'Production data added successfully.'),
          })),
          catchError((error) =>
            of({
              success: false,
              message: this.resolveErrorMessage(
                error,
                mode === 'reengrave'
                  ? 'Failed to update re-engrave production data.'
                  : 'Failed to add production data.',
              ),
            }),
          ),
          switchMap((productionResult) =>
            this.printerApi.printLabel(printPayload).pipe(
              map((printResponse: any) => ({
                mode: currentMode,
                engraveMessage:
                  engraveResponse?.message || this.resolveEngraveSuccessMessage(currentMode),
                productionMessage: productionResult.message,
                productionSucceeded: productionResult.success,
                printMessage: printResponse?.message || 'Print command sent successfully.',
              })),
              catchError((error) =>
                throwError(() =>
                  new Error(this.resolveErrorMessage(error, 'Failed to print label.')),
                ),
              ),
            ),
          ),
        );
      }),
      catchError((error) =>
        throwError(() =>
          new Error(this.resolveErrorMessage(error, this.resolveEngraveFallbackMessage(currentMode))),
        ),
      ),
    );
  }

  private resolveEngraveSuccessMessage(mode: MarkingModeType): string {
    return mode === 'serial'
      ? 'Machine controller serial command completed successfully.'
      : 'Engrave response received.';
  }

  private resolveEngraveFallbackMessage(mode: MarkingModeType): string {
    return mode === 'serial' ? 'Serial engraving failed.' : 'Engrave API failed.';
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message.trim().length) {
      return error.message;
    }

    const maybeRecord = error as any;
    return (
      maybeRecord?.error?.message ||
      maybeRecord?.error?.errors?.PrintData?.[0] ||
      maybeRecord?.message ||
      fallback
    );
  }
}
