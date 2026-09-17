import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class VehicleUtils {
  private readonly modelCountryCodeMap: Record<string, string> = {
    '00': 'INDIA',
    '06': 'INDIA',
    '08': 'INDIA'
  };

  // Validate VIN (must be 17 alphanumeric characters and start with MA1)
  isValidVIN(data: string): boolean {
    const cleaned = data.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return cleaned.length === 17 && cleaned.startsWith('MA1');
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

  // Check if engine number’s first two letters match model number positions 7 and 8
  matchesModelEnginePrefix(modelNumber: string, engineNumber: string): boolean {
    const cleanedModel = (modelNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanedEngine = (engineNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    if (!cleanedModel || !cleanedEngine || cleanedModel.length < 8 || cleanedEngine.length < 2) {
      return false;
    }

    const modelPrefix = cleanedModel.slice(6, 8);
    const enginePrefix = cleanedEngine.slice(0, 2);
    return modelPrefix === enginePrefix;
  }

  // Extract 2-letter code from scanned data (e.g., for image fetching)
  extractTwoLetterCode(scannedData: string): string | null {
    const letters = scannedData.match(/[A-Za-z]/g);
    if (!letters || letters.length < 2) return null;
    return letters.slice(-2).join('').toUpperCase();
  }

  getCountryCodeFromModelNumber(modelNumber: string): string | null {
    const sanitized = (modelNumber || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (sanitized.length < 16) {
      return null;
    }

    const countryCode = sanitized.slice(14, 16);
    return countryCode || null;
  }

  getCountryNameFromModelNumber(modelNumber: string): string | null {
    const countryCode = this.getCountryCodeFromModelNumber(modelNumber);
    if (!countryCode) {
      return null;
    }

    return this.modelCountryCodeMap[countryCode] || null;
  }
}
