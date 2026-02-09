import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Engraving, Job } from '../../services/engraving';
@Component({
  selector: 'app-engraving-testing',
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './engraving-testing.html',
  styleUrl: './engraving-testing.scss',
})
export class EngravingTesting {
 // Default values based on your C# sample
  vs0: string = '236P 320 4 B4';
  vs1: string = 'F93948.3';
  vs2: string = 'EN 10025   2 + N';
  vs3: string = 'IS 2062 E350BR';
  vs4: string = '20.5X3000X13500';
  templateName: string = 'JSW.tml';

  currentJob: Job | null = null;
  isLoading = false;
  pollingInterval: any;

  constructor(private engravingService: Engraving) {}

  sendToMachine() {
    const commands = this.generateCommands();
    this.isLoading = true;

    this.engravingService.createJob(commands).subscribe({
      next: (res) => {
        console.log('Job Created:', res);
        this.currentJob = res.job;
        this.isLoading = false;
        // Start polling to check if the agent has processed it
        this.startPolling(res.job.id);
      },
      error: (err) => {
        console.error('Error sending job:', err);
        this.isLoading = false;
        alert('Failed to send job to cloud backend.');
      }
    });
  }

  generateCommands(): string {
    // Constructing the command string exactly like the C# example
    const lines = [
      `VS 0 "${this.vs0}"`,
      `VS 1 "${this.vs1}"`,
      `VS 2 "${this.vs2}"`,
      `VS 3 "${this.vs3}"`,
      `VS 4 "${this.vs4}"`,
      `LD "${this.templateName}" 1 N`,
      `GO`
    ];

    // Join with CRLF (\r\n) as typically expected by TCP streams
    return lines.join('\r\n');
  }

  startPolling(jobId: number) {
    if (this.pollingInterval) clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      this.engravingService.getJob(jobId).subscribe({
        next: (job) => {
          this.currentJob = job;
          // Stop polling if completed or error
          if (job.status === 'COMPLETED' || job.status === 'ERROR') {
            clearInterval(this.pollingInterval);
          }
        },
        error: (err) => console.error('Polling error', err)
      });
    }, 2000); // Check every 2 seconds
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }
}
