import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Usb } from '../support-pages/usb/usb';

interface SupportTab {
  label: string;
  description: string;
  details: string[];
}

@Component({
  selector: 'app-support',
  imports: [CommonModule, Usb],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class Support {
  readonly navItems: SupportTab[] = [
    {
      label: 'Printer',
      description: 'Print configuration and label testing for the assigned thermal printer.',
      details: ['Check USB / driver connectivity', 'Verify label format', 'Validate print output'],
    },
    {
      label: 'Serial Terminal',
      description: 'Live terminal for machine and port debugging during testing.',
      details: ['Open communication log', 'Inspect incoming/outgoing frames', 'Test command payloads'],
    },
    {
      label: 'Serial Ports',
      description: 'Inspect available serial devices and current connection mapping.',
      details: ['List active COM ports', 'Confirm device mapping', 'Check port status'],
    },
    {
      label: 'USB',
      description: 'USB connectivity checks for scanner, printer, and machine peripherals.',
      details: ['Validate device enumeration', 'Confirm USB permissions', 'Check connection stability'],
    },
    {
      label: 'Engrave Machine',
      description: 'Engraving machine testing panel for parameter validation and command flow.',
      details: ['Check engrave parameter payload', 'Verify machine handshake', 'Validate engraved output'],
    },
    {
      label: 'Communication',
      description: 'Communication layer health check for all integrated devices.',
      details: ['Review protocol state', 'Monitor ping and response time', 'Confirm fallback logic'],
    }
  ];

  selectedTab = 'USB';

  selectTab(label: string): void {
    this.selectedTab = label;
  }

  get activeTab(): SupportTab {
    return this.navItems.find((item) => item.label === this.selectedTab) ?? this.navItems[0];
  }
}
