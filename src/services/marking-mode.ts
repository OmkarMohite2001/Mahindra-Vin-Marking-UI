import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type MarkingMode = 'serial' | 'ethernet';

@Injectable({
  providedIn: 'root',
})
export class MarkingModeService {
  private readonly storageKey = 'markingMode';
  private readonly modeSubject = new BehaviorSubject<MarkingMode>(this.readMode());

  readonly mode$ = this.modeSubject.asObservable();

  getMode(): MarkingMode {
    return this.modeSubject.getValue();
  }

  setMode(mode: MarkingMode): void {
    localStorage.setItem(this.storageKey, mode);
    this.modeSubject.next(mode);
  }

  isSerialMode(): boolean {
    return this.getMode() === 'serial';
  }

  isEthernetMode(): boolean {
    return this.getMode() === 'ethernet';
  }

  private readMode(): MarkingMode {
    const storedMode = (localStorage.getItem(this.storageKey) ?? '').trim().toLowerCase();
    return storedMode === 'serial' ? 'serial' : 'ethernet';
  }
}
