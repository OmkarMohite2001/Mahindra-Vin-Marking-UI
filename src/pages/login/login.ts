import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgIf } from "@angular/common";
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
   private fb = inject(FormBuilder);
  private router = inject(Router);

  hide = true;
  loading = false;

  form = this.fb.group({
    email: ['userdummy@gmail.com', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    // Demo: simulate API
    setTimeout(() => {
      localStorage.setItem('token', 'demo-token');
      this.loading = false;
      this.router.navigateByUrl('/app/dashboard');
    }, 700);
  }

  get email() { return this.form.controls.email; }
  get password() { return this.form.controls.password; }
}
