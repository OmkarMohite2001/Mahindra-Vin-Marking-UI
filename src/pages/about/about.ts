import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

interface AboutPoint {
  label: string;
  value: string;
  helper?: string;
  href?: string;
}

interface SupportItem {
  label: string;
  value: string;
  icon: string;
  href?: string;
}

@Component({
  selector: 'app-about',
  imports: [CommonModule, MatCardModule, MatIconModule, MatDividerModule],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  readonly appName = 'Mahindra VIN Marking';
  readonly appVersion = 'V1.0.0-PRODUCTION';
  readonly developedBy = 'Vinayak Industries';
  readonly productOwner = 'Mahindra Manufacturing IT';
  readonly supportEmail = 'vinayakind2@gmail.com';
  readonly supportMobile = '+91 9822022213 / +91 7276837117';
  readonly supportHours = 'Mon-Sat, 9:00 AM to 6:00 PM';
  readonly currentYear = new Date().getFullYear();

  readonly details: AboutPoint[] = [
    { label: 'Application ID', value: 'MVM IIS Server' },
    {
      label: 'Environment',
      value: 'Frontend Client',
      helper: 'http://localhost:4200',
      href: 'http://localhost:4200',
    },
    { label: 'Frontend', value: 'Angular 21 + Angular Material' },
    { label: 'Core Modules', value: 'VIN Marking, Reports, User Management' },
    {
      label: 'Backend',
      value: 'ASP.NET Core .NET Web API',
      helper: 'http://localhost:7192/api',
      href: 'http://localhost:7192/api',
    },
    { label: 'Authentication', value: 'Role Based Access (Admin/Supervisor/Operator)' },
  ];

  readonly supportItems: SupportItem[] = [
    {
      label: 'Developed By',
      value: this.developedBy,
      icon: 'apartment',
    },
    {
      label: 'Support Email',
      value: this.supportEmail,
      icon: 'mail',
      href: `mailto:${this.supportEmail}`,
    },
    {
      label: 'Mobile Number',
      value: this.supportMobile,
      icon: 'call',
    },
    {
      label: 'Support Window',
      value: this.supportHours,
      icon: 'schedule',
    },
  ];
}
