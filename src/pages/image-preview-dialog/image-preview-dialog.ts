import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-image-preview-dialog',
  imports: [MatDialogModule, CommonModule],
  templateUrl: './image-preview-dialog.html',
  styleUrl: './image-preview-dialog.scss',
})
export class ImagePreviewDialog {
constructor(
    public dialogRef: MatDialogRef<ImagePreviewDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private sanitizer: DomSanitizer
  ) {}

  getImageUrl(): SafeUrl {
    const imageBase64 = this.data?.imageBase64 || this.data?.base64Image || this.data?.base64 || '';
    if (!imageBase64) return '';

    // If caller already passed a full data URL, use it. Otherwise, prefix with content type.
    if (typeof imageBase64 === 'string' && imageBase64.startsWith('data:')) {
      return this.sanitizer.bypassSecurityTrustUrl(imageBase64);
    }

    const prefix = this.data?.contentType ? `data:${this.data.contentType};base64,` : 'data:image/png;base64,';
    return this.sanitizer.bypassSecurityTrustUrl(`${prefix}${imageBase64}`);
  }

  onOk() {
    this.dialogRef.close('ok');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
