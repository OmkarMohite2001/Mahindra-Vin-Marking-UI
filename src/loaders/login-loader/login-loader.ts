import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-login-loader',
  imports: [],
  templateUrl: './login-loader.html',
  styleUrl: './login-loader.scss',
})
export class LoginLoader {
  @Input() message: string = 'Authenticating Credentials...';
}

