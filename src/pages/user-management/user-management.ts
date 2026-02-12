import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { UserManagementStore, UserRecord, UserRole } from '../../services/user-management-store';

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
    MatDividerModule,
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement {
  private fb = inject(FormBuilder).nonNullable;
  private store = inject(UserManagementStore);

  readonly roleOptions: UserRole[] = ['Admin', 'Supervisor', 'User'];

  users: UserRecord[] = [];
  editingUserId: number | null = null;
  selectedUserId: number | null = null;
  showSelectedPassword = false;

  userForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    role: ['User' as UserRole, Validators.required],
  });

  constructor() {
    this.refreshUsers();
  }

  get selectedUser(): UserRecord | null {
    if (!this.selectedUserId) {
      return null;
    }
    return this.users.find((user) => user.id === this.selectedUserId) ?? null;
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const formValue = this.userForm.getRawValue();

    if (this.editingUserId) {
      this.store.updateUser(this.editingUserId, formValue);
    } else {
      this.store.addUser(formValue);
    }

    this.refreshUsers();
    this.clearForm();
  }

  editUser(user: UserRecord): void {
    this.editingUserId = user.id;
    this.userForm.reset({
      username: user.username,
      password: user.password,
      role: user.role,
    });
  }

  viewUser(user: UserRecord): void {
    this.selectedUserId = user.id;
    this.showSelectedPassword = false;
  }

  deleteUser(id: number): void {
    this.store.deleteUser(id);
    this.refreshUsers();

    if (this.editingUserId === id) {
      this.clearForm();
    }

    if (this.selectedUserId === id) {
      this.clearView();
    }
  }

  clearForm(): void {
    this.editingUserId = null;
    this.userForm.reset({
      username: '',
      password: '',
      role: 'User',
    });
  }

  clearView(): void {
    this.selectedUserId = null;
    this.showSelectedPassword = false;
  }

  togglePasswordVisibility(): void {
    this.showSelectedPassword = !this.showSelectedPassword;
  }

  trackByUserId(_: number, user: UserRecord): number {
    return user.id;
  }

  private refreshUsers(): void {
    this.users = this.store.getUsers();
  }
}
