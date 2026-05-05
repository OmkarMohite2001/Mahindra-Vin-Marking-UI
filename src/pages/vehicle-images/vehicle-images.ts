import { Component, inject, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { VehicleImageApi } from '../../services/vehicle-image-api';
import { VehicleImageLoader } from '../../loaders/vehicle-image-loader/vehicle-image-loader';

@Component({
  selector: 'app-vehicle-images',
  imports: [CommonModule, FormsModule, MatSnackBarModule, VehicleImageLoader],
  templateUrl: './vehicle-images.html',
  styleUrls: ['./vehicle-images.scss'],
})
export class VehicleImages implements OnInit {
  private vehicleImageApi = inject(VehicleImageApi);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);

  selectedFile: File | null = null;
  selectedFiles: File[] = [];
  loading = false;
  loaderMainMessage = 'Syncing Vehicle Assets';
  loaderSubMessage = 'Uploading vehicle image...';
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  ngOnInit() {
    // Component initialized
  }

  // Handle single file selection
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      // Validate file
      if (!this.validateFile(file)) {
        // Clear the selection if invalid
        const fileInput = document.getElementById('singleFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        this.selectedFile = null;
        return;
      }
      this.selectedFile = file;
    }
  }

  // Handle multiple file selection
  onMultipleFilesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    const validFiles = files.filter(f => this.validateFile(f));

    if (validFiles.length !== files.length) {
      this.showSnackbar(`${files.length - validFiles.length} file(s) were invalid`, false);
    }

    this.selectedFiles = validFiles;
  }

  // Validate file size and type
  private validateFile(file: File): boolean {
    if (file.size === 0) {
      this.showSnackbar('File is empty', false);
      return false;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      this.showSnackbar(`File size exceeds 5MB limit`, false);
      return false;
    }

    if (!file.type.startsWith('image/')) {
      this.showSnackbar('Only image files are allowed', false);
      return false;
    }

    return true;
  }

  // Helper to show snackbar
  private showSnackbar(message: string, isSuccess: boolean = true) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: isSuccess ? ['success-snackbar'] : ['error-snackbar'],
    });
  }

  // Upload single image
  uploadSingleImage() {
    if (!this.selectedFile) {
      this.showSnackbar('Please select a file first', false);
      return;
    }

    // Validate file again before upload
    if (!this.validateFile(this.selectedFile)) {
      this.selectedFile = null;
      const fileInput = document.getElementById('singleFile') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      return;
    }

    this.loaderMainMessage = 'Syncing Vehicle Assets';
    this.loaderSubMessage = 'Uploading single image...';
    this.loading = true;
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('Image', this.selectedFile);

    this.vehicleImageApi.uploadImage(formData).pipe(
      finalize(() => {
        // This will always run - whether success or error
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.markForCheck();
        });
      })
    ).subscribe({
      next: (response: any) => {
        if (response?.success === false) {
          this.showSnackbar(response?.message || 'Upload failed', false);
          return;
        }
        const message = response?.message || 'Image uploaded successfully';
        this.showSnackbar(message, true);
        // Clear the selected file and input
        this.selectedFile = null;
        const fileInput = document.getElementById('singleFile') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error: any) => {
        const errorMsg = error?.error?.message || 'Error uploading image';
        this.showSnackbar(errorMsg, false);
      }
    });
  }

  // Bulk upload images
  bulkUploadImages() {
    if (this.selectedFiles.length === 0) {
      this.showSnackbar('Please select files first', false);
      return;
    }

    this.loaderMainMessage = 'Syncing Vehicle Assets';
    this.loaderSubMessage = `Uploading ${this.selectedFiles.length} images...`;
    this.loading = true;
    this.cdr.markForCheck();

    const formData = new FormData();
    this.selectedFiles.forEach((file: File) => {
      formData.append('Images', file);
    });

    this.vehicleImageApi.bulkUploadImages(formData).pipe(
      finalize(() => {
        // This will always run - whether success or error
        this.ngZone.run(() => {
          this.loading = false;
          this.cdr.markForCheck();
        });
      })
    ).subscribe({
      next: (response: any) => {
        if (response?.success === false) {
          this.showSnackbar(response?.message || 'Upload failed', false);
          return;
        }
        const message = response?.message || `${this.selectedFiles.length} images uploaded successfully`;
        this.showSnackbar(message, true);
        // Clear the selected files and input
        this.selectedFiles = [];
        const fileInput = document.getElementById('multipleFiles') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error: any) => {
        const errorMsg = error?.error?.message || 'Error uploading images';
        this.showSnackbar(errorMsg, false);
      }
    });
  }

  // Clear selected file
  clearSingleFile() {
    this.selectedFile = null;
  }

  // Clear selected files
  clearMultipleFiles() {
    this.selectedFiles = [];
  }
}
