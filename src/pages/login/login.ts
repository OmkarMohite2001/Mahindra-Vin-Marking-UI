import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from "@angular/common";
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Auth } from '../../services/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
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
    MatProgressSpinnerModule,
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
  loading = false;

  form = this.fb.group({
    username: ['Admin', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

get username() { return this.form.controls.username; }
  get password() { return this.form.controls.password; }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const loginPayload = {
      userName: this.form.value.username,
      password: this.form.value.password
    };

    this.authService.login(loginPayload).subscribe({
      next: (res: any) => {
        this.loading = false;
        localStorage.setItem('token', res.token);

        // Static Role Validation logic
        if (this.form.value.username === 'Admin' && this.form.value.password === 'Admin') {
          localStorage.setItem('role', 'Admin');
        } else {
          localStorage.setItem('role', 'User');
        }

        this.router.navigateByUrl('/app/dashboard');
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        alert('Login Failed');
      }
    });
  }

}
