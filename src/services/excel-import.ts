import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExcelImport {
private baseUrl = 'https://localhost:7192/api';

  // Endpoint Configuration
  private apiEndpoints: Record<string, string> = {
    'ModelMaster':  '/model/bulk-add',
    'COLOR_CODE':   '/colorcode/bulk-add',
    'ENGINE_TYPE':  '/enginetype/bulk-add',
    'BS Stage':     '/bsstage/bulk-add',
    'MARKET_NAME':  '/marketname/bulk-add',
    'DRIVE_TYPE':   '/drivetype/bulk-add',
    'NAMEPLATE':    '/nameplate/bulk-add',
    'SEAT_CODE':    '/seatcode/bulk-add',
    'TRIM_CODE':    '/trimcode/bulk-add',
    'COUNTRY_CODE': '/countrycode/bulk-add'
  };

  constructor(private http: HttpClient) {}

  // Main Function to Call
  uploadData(sheetName: string, rawData: any[]): Observable<any> {
    const endpoint = this.apiEndpoints[sheetName];

    if (!endpoint) {
      return throwError(() => new Error(`API endpoint not found for sheet: "${sheetName}"`));
    }

    // Data Map करा (Excel Keys -> API Keys)
    const payload = this.transformData(sheetName, rawData);

    // Backend la pathva
    return this.http.post(`${this.baseUrl}${endpoint}`, payload);
  }

  // === MAPPING LOGIC ===
  private transformData(sheetName: string, data: any[]): any[] {
    switch (sheetName) {

      case 'ModelMaster':
        return data.map(row => ({
          modelNo:      row['MODEL_NO'] || '',
          description:  row['DESCRIPTION'] || '',
          description1: row['DESCRIPTION1'] || '',
          marketName:   row['MARKET_NAME'] || '',
          country:      row['COUNTRY'] || '',
          driveType:    row['DRIVE_TYPE'] || '',
          flw:          row['FLW'] || '',
          gvw:          row['GVW'] || '',
          faw:          row['FAW'] || '',
          raw:          row['RAW'] || '',
          seatCode:     row['SEAT_CODE'] || '',
          colorCode:    row['COLOR_CODE'] || '',
          trim:         row['TRIM_CODE'] || row['TRIM'] || '', // Handle variations
          engineType:   row['ENGINE_TYPE'] || '',
          bsStage:      row['BS_STAGE'] || '',
          namePlate:    row['NAMEPLATE'] || '',
          variant:      row['VARIANT'] || '',
          isActive:     true // Payload madhe he field ahe, excel madhe nasel tr true pathva
        }));

      case 'COLOR_CODE':
        return data.map(row => ({
          colorCode: row['COLOR_CODE'] || '',
          colorName: row['COLOR_NAME'] || '',
          isActive: true
        }));
      default:
        console.warn(`No mapping logic for ${sheetName}, sending raw data.`);
        return data;
    }
  }
}
