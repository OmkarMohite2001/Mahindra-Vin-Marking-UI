import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs/operators';
import { UserManagementApi, UserManagementRecord } from '../../services/user-management-api';

interface UserDetailsDialogData {
  user: UserManagementRecord;
  roleOptions: readonly string[];
}

@Component({
  selector: 'app-user-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './user-details-dialog.html',
  styleUrl: './user-details-dialog.scss',
})
export class UserDetailsDialog {
  private fb = inject(FormBuilder).nonNullable;
  private userApi = inject(UserManagementApi);
  private dialogRef = inject(MatDialogRef<UserDetailsDialog>);
  private snackBar = inject(MatSnackBar);

  actionInProgress = false;
  statusMessage = '';
  statusTone: 'success' | 'error' | 'info' = 'info';

  readonly userForm;
  readonly passwordForm;

  constructor(@Inject(MAT_DIALOG_DATA) public data: UserDetailsDialogData) {
    this.userForm = this.fb.group({
      userName: [this.data.user.userName, [Validators.required]],
      userRole: [this.resolveRole(this.data.user.userRole), Validators.required],
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.matchFieldsValidator('newPassword', 'confirmPassword') });
  }

  updateUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    if (!window.confirm(`Update user ${this.userForm.getRawValue().userName}?`)) {
      return;
    }

    const formValue = this.userForm.getRawValue();
    this.actionInProgress = true;
    this.userApi
      .updateUser({
        userId: this.data.user.userId,
        userName: formValue.userName,
        userRole: formValue.userRole,
        updatedBy: this.getAuditUserId(),
      })
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(response, 'User updated successfully.');
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');
          if (!result.ok) {
            return;
          }
          this.data.user = {
            ...this.data.user,
            userName: formValue.userName,
            userRole: formValue.userRole,
          };
          this.dialogRef.close(true);
        },
        error: () => {
          const message = 'Unable to update user. Please try again.';
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    if (!window.confirm(`Change password for ${this.data.user.userName}?`)) {
      return;
    }

    const newPassword = this.passwordForm.getRawValue().newPassword;
    this.actionInProgress = true;
    this.userApi
      .resetUserPassword({
        userId: this.data.user.userId,
        userName: this.data.user.userName,
        newPassword,
        updatedBy: this.getAuditUserId(),
      })
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(response, 'Password changed successfully.');
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');
          if (!result.ok) {
            return;
          }
          this.passwordForm.reset({ newPassword: '', confirmPassword: '' });
        },
        error: () => {
          const message = 'Unable to change password. Please try again.';
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  toggleStatus(): void {
    const nextStatus = !this.data.user.isActive;
    if (!window.confirm(`Mark user ${nextStatus ? 'Active' : 'Inactive'}?`)) {
      return;
    }

    this.actionInProgress = true;
    this.userApi
      .updateUserStatus({
        userId: this.data.user.userId,
        isActive: nextStatus,
        updatedBy: this.getAuditUserId(),
      })
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(
            response,
            `User marked ${nextStatus ? 'Active' : 'Inactive'}.`,
          );
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');
          if (!result.ok) {
            return;
          }
          this.data.user = { ...this.data.user, isActive: nextStatus };
          this.dialogRef.close(true);
        },
        error: () => {
          const message = 'Unable to update status. Please try again.';
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  deleteUser(): void {
    if (!window.confirm(`Delete user ${this.data.user.userName}? This action cannot be undone.`)) {
      return;
    }

    this.actionInProgress = true;
    this.userApi
      .deleteUser({
        userId: this.data.user.userId,
        updatedBy: this.getAuditUserId(),
      })
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: (response) => {
          const result = this.resolveApiResult(response, 'User deleted successfully.');
          this.showSnack(result.message, result.ok);
          this.setStatus(result.message, result.ok ? 'success' : 'error');
          if (!result.ok) {
            return;
          }
          this.dialogRef.close(true);
        },
        error: () => {
          const message = 'Unable to delete user. Please try again.';
          this.showSnack(message, false);
          this.setStatus(message, 'error');
        },
      });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  private setStatus(message: string, tone: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusTone = tone;
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

  private showSnack(message: string, ok: boolean): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
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

  private toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value as Record<string, unknown>;
  }

  private readValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (source[key] !== undefined) {
        return source[key];
      }
    }
    return undefined;
  }

  private resolveRole(role: string): string {
    return this.data.roleOptions.includes(role) ? role : 'Operator';
  }
}
