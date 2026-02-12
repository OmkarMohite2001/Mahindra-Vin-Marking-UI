import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Auth } from '../../services/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginLoader } from '../../loaders/login-loader/login-loader';
import { BehaviorSubject, asyncScheduler, of } from 'rxjs';
import { catchError, finalize, observeOn, timeout } from 'rxjs/operators';
@Component({
  selector: 'app-login',
  imports: [
      CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    LoginLoader,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(Auth);
  private snackBar = inject(MatSnackBar);

  hide = true;
  loading$ = new BehaviorSubject<boolean>(false);
  private loadingTimeoutRef?: ReturnType<typeof setTimeout>;

  form = this.fb.group({
    username: ['Admin', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  get username() { return this.form.controls.username; }
  get password() { return this.form.controls.password; }

  private startLoading() {
    this.loading$.next(true);
    if (this.loadingTimeoutRef) {
      clearTimeout(this.loadingTimeoutRef);
    }

    // UI never stays blocked forever, even if stream/errors behave unexpectedly.
    this.loadingTimeoutRef = setTimeout(() => {
      this.loading$.next(false);
    }, 4000);
  }

  private stopLoading() {
    if (this.loadingTimeoutRef) {
      clearTimeout(this.loadingTimeoutRef);
      this.loadingTimeoutRef = undefined;
    }
    this.loading$.next(false);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.startLoading();

    const loginPayload = {
      userName: this.form.value.username,
      password: this.form.value.password
    };

    this.authService.login(loginPayload).pipe(
      timeout(15000),
      observeOn(asyncScheduler),
      catchError((err) => {
        console.error(err);
        this.snackBar.open('Login Failed', 'Close', { duration: 3000, horizontalPosition: 'center', verticalPosition: 'top' });
        return of(null);
      }),
      finalize(() => {
        this.stopLoading();
      })
    ).subscribe((res: any) => {
      const token = res?.token ?? res?.data?.token;
      const apiRole = res?.role ?? res?.data?.role;

      if (!token || res?.success === false) {
        if (res !== null) {
          this.snackBar.open(res?.message || 'Login Failed', 'Close', { duration: 3000 });
        }
        return;
      }

      localStorage.setItem('token', token);

      const fallbackRole =
        this.form.value.username === 'Admin' && this.form.value.password === 'Admin'
          ? 'Admin'
          : 'User';
      localStorage.setItem('role', apiRole || fallbackRole);

      this.router.navigateByUrl('/app/excel-upload');
    });
  }

}
