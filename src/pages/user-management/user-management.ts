import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { UserManagementApi, UserManagementRecord } from '../../services/user-management-api';
import { UserDetailsDialog } from './user-details-dialog';

@Component({
  selector: 'app-user-management',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement {
  private fb = inject(FormBuilder).nonNullable;
  private userApi = inject(UserManagementApi);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  readonly roleOptions = ['Admin', 'Supervisor', 'Operator'] as const;

  users: UserManagementRecord[] = [];
  loadingUsers = false;
  actionInProgress = false;

  statusMessage = '';
  statusTone: 'success' | 'error' | 'info' = 'info';

  userForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(4)]],
    role: ['Operator', Validators.required],
  }, { validators: this.matchFieldsValidator('password', 'confirmPassword') });

  constructor() {
    this.loadUsers();
  }

  get activeUsersCount(): number {
    return this.users.filter((user) => user.isActive).length;
  }

  get inactiveUsersCount(): number {
    return this.users.length - this.activeUsersCount;
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.getRawValue();
    this.actionInProgress = true;
    this.userApi
      .addUser({
        userName: formValue.username,
        password: formValue.password,
        userRole: formValue.role,
        createdBy: this.getAuditUserId(),
      })
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(response, 'User added successfully.');
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');
          if (!result.ok) {
            return;
          }
          this.clearForm();
          this.loadUsers();
        },
        error: () => {
          const message = 'Unable to add user. Please try again.';
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  viewUser(user: UserManagementRecord): void {
    const dialogRef = this.dialog.open(UserDetailsDialog, {
      data: {
        user,
        roleOptions: this.roleOptions,
      },
      width: '760px',
      maxWidth: '95vw',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((changed) => {
      if (changed) {
        this.loadUsers();
      }
    });
  }

  toggleUserStatus(user: UserManagementRecord): void {
    const label = user.isActive ? 'Inactive' : 'Active';
    if (!window.confirm(`Set ${user.userName} as ${label}?`)) {
      return;
    }

    this.userApi
      .updateUserStatus({
        userId: user.userId,
        isActive: !user.isActive,
        updatedBy: this.getAuditUserId(),
      })
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(response, `User marked as ${label}.`);
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');
          if (!result.ok) {
            return;
          }
          this.loadUsers();
        },
        error: () => {
          const message = 'Unable to update status. Please try again.';
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  clearForm(): void {
    this.userForm.reset({
      username: '',
      password: '',
      confirmPassword: '',
      role: 'Operator',
    });
  }

  trackByUserId(_: number, user: UserManagementRecord): number {
    return user.userId;
  }

  private loadUsers(): void {
    this.loadingUsers = true;
    this.userApi
      .getAllUsers()
      .pipe(
        finalize(() => {
          this.runUiUpdate(() => {
            this.loadingUsers = false;
          });
        }),
      )
      .subscribe({
        next: (response) => {
          this.runUiUpdate(() => {
            this.users = this.extractUsers(response);
            if (!this.users.length) {
              this.setStatus('Users fetched but no records matched UI model.', 'info');
              return;
            }
            this.statusMessage = '';
          });
        },
        error: () => {
          this.runUiUpdate(() => {
            this.users = [];
            this.setStatus('Unable to fetch users list. Check API connection.', 'error');
          });
        },
      });
  }

  private extractUsers(response: unknown): UserManagementRecord[] {
    const responseValue =
      typeof response === 'string'
        ? (() => {
            try {
              return JSON.parse(response) as unknown;
            } catch {
              return null;
            }
          })()
        : response;

    const root = this.toRecord(responseValue);
    const dataArray = this.extractArrayFromResponse(root, responseValue);

    if (!Array.isArray(dataArray)) {
      return [];
    }

    return dataArray
      .map((item) => this.mapUser(item))
      .filter((item): item is UserManagementRecord => item !== null)
      .filter((item) => !this.isDeleted(item, dataArray));
  }

  private extractArrayFromResponse(
    root: Record<string, unknown> | null,
    responseValue: unknown,
  ): unknown[] | null {
    if (Array.isArray(responseValue)) {
      return responseValue;
    }

    if (!root) {
      return null;
    }

    const topLevelArray = this.readArrayValue(root, ['data', 'items', 'result', 'users']);
    if (topLevelArray) {
      return topLevelArray;
    }

    const dataObject = this.toRecord(root['data']);
    if (dataObject) {
      return this.readArrayValue(dataObject, ['data', 'items', 'result', 'users']);
    }

    return null;
  }

  private mapUser(value: unknown): UserManagementRecord | null {
    const source = this.toRecord(value);
    if (!source) {
      return null;
    }

    const userIdValue = this.readValue(source, ['userId', 'id']);
    const parsedUserId = this.toNumber(userIdValue);
    const userNameValue = this.readValue(source, ['userName', 'username']);
    const userRoleValue = this.readValue(source, ['userRole', 'role']);
    const isActiveValue = this.readValue(source, ['isActive', 'active']);

    if (parsedUserId === null || typeof userNameValue !== 'string') {
      return null;
    }

    return {
      userId: parsedUserId,
      userName: userNameValue,
      userRole: typeof userRoleValue === 'string' ? userRoleValue : 'User',
      isActive: this.toBoolean(isActiveValue),
    };
  }

  private isDeleted(user: UserManagementRecord, rawList: unknown[]): boolean {
    const raw = rawList.find((item) => {
      const record = this.toRecord(item);
      const rawId = this.toNumber(this.readValue(record ?? {}, ['userId', 'id']));
      return rawId === user.userId;
    });
    const record = this.toRecord(raw);
    return this.toBoolean(this.readValue(record ?? {}, ['isDeleted', 'deleted']));
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private readArrayValue(source: Record<string, unknown> | null, keys: string[]): unknown[] | null {
    if (!source) {
      return null;
    }

    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    return null;
  }

  private readValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (source[key] !== undefined) {
        return source[key];
      }
    }
    return undefined;
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value === 1;
    }
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'active';
    }
    return false;
  }

  private getAuditUser(): string {
    return (
      localStorage.getItem('username') ??
      localStorage.getItem('userName') ??
      localStorage.getItem('role') ??
      'System'
    );
  }

  private getAuditUserId(): string {
    return localStorage.getItem('userId') ?? '0';
  }

  private setStatus(message: string, tone: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
  }

  private showSnack(message: string, ok: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ok ? ['snackbar-success'] : ['snackbar-error'],
    });
  }

  private resolveApiResult(
    response: unknown,
    successFallbackMessage: string,
  ): { ok: boolean; message: string } {
    const root = this.toRecord(response);
    const successRaw = this.readValue(root ?? {}, ['success', 'isSuccess']);
    const dataRaw = this.readValue(root ?? {}, ['data']);
    const messageRaw = this.readValue(root ?? {}, ['message', 'errorMessage']);

    let ok = true;
    if (typeof successRaw === 'boolean') {
      ok = successRaw;
    } else if (typeof dataRaw === 'boolean') {
      ok = dataRaw;
    }

    const message =
      typeof messageRaw === 'string' && messageRaw.trim().length
        ? messageRaw
        : ok
          ? successFallbackMessage
          : 'Operation failed.';

    return { ok, message };
  }

  private runUiUpdate(work: () => void): void {
    if (NgZone.isInAngularZone()) {
      work();
      this.cdr.detectChanges();
      return;
    }

    this.zone.run(() => {
      work();
      this.cdr.detectChanges();
    });
  }

  private matchFieldsValidator(field: string, confirmField: string): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const source = group.get(field)?.value;
      const confirm = group.get(confirmField)?.value;
      if (!source || !confirm) {
        return null;
      }
      return source === confirm ? null : { fieldMismatch: true };
    };
  }
}
