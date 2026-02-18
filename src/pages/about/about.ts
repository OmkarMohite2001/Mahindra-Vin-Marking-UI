import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';

interface AboutPoint {
  label: string;
  value: string;
}

interface FeatureItem {
  title: string;
  description: string;
  icon: string;
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
  readonly developedBy = 'CISPL Engineering Team';
  readonly productOwner = 'Mahindra Manufacturing IT';
  readonly supportEmail = 'yogeshm@credentialsintegrated.com';
  readonly supportHours = 'Mon-Sat, 9:00 AM to 6:00 PM';
  readonly currentYear = new Date().getFullYear();

  readonly details: AboutPoint[] = [
    { label: 'Application ID', value: 'MVM-UI-LOCAL' },
    { label: 'Environment', value: 'Local Deployment (Offline Ready) Port (4200)' },
    { label: 'Frontend', value: 'Angular 21 + Angular Material' },
    { label: 'Core Modules', value: 'VIN Marking, Reports, User Management' },
    { label: 'Backend Endpoint', value: 'http://localhost:7192/api' },
    { label: 'Authentication', value: 'Role Based Access (Admin/Supervisor/Operator)' },
  ];

  readonly features: FeatureItem[] = [
    {
      title: 'Production Focused Workflow',
      description: 'Optimized flow for marking, re-engraving, and operation continuity on shop floor.',
      icon: 'precision_manufacturing',
    },
    {
      title: 'Traceability and Reports',
      description: 'Enables searchable records and report-ready operational data for audit and review.',
      icon: 'description',
    },
    {
      title: 'Controlled User Access',
      description: 'Role-based menu and routing helps restrict actions by responsibility.',
      icon: 'verified_user',
    },
    {
      title: 'Local Network Ready',
      description: 'Designed for local setup where internet access may be unavailable.',
      icon: 'lan',
    },
  ];
}
