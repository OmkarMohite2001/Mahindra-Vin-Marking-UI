import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VehicleUtils {
   // Validate VIN (17 alphanumeric characters)
  isValidVIN(data: string): boolean {
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.length === 17;
  }

  // Validate Model Number (18 alphanumeric characters)
  isValidModelNumber(data: string): boolean {
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.length === 18;
  }

  // Validate Engine Number (10 alphanumeric characters)
  isValidEngineNumber(data: string): boolean {
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '');
    return cleaned.length === 10;
  }

  // Extract 2-letter code from scanned data (e.g., for image fetching)
  extractTwoLetterCode(scannedData: string): string | null {
    const letters = scannedData.match(/[A-Za-z]/g);
    if (!letters || letters.length < 2) return null;
    return letters.slice(-2).join('').toUpperCase();
  }
}
