import { inject, Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

export interface DashboardSummaryRow {
  duration: string;
  dXuv700: number;
  eXuv700: number;
  domKuv: number;
  expKuv: number;
  eXuv500: number;
  totalXuv700: number;
  totalKuv: number;
  totalXuv500: number;
  total: number;
}

export interface DashboardVehicleRow {
  dateTime: string;
  shift: string;
  batchNo: string;
  vinNo: string;
  engineSrNo: string;
  modelNo: string;
  market: string;
  country: string;
  driveType: string;
  colorCode: string;
}

export interface DashboardResponse {
  title: string;
  generatedAt: string;
  summaryRows: DashboardSummaryRow[];
  vehicleRows: DashboardVehicleRow[];
}

const DASHBOARD_DEMO_DATA: DashboardResponse = {
  title: 'Live Dashboard',
  generatedAt: '2026-05-06T10:05:00',
  summaryRows: [
    {
      duration: 'FY-2026-2027',
      dXuv700: 9415,
      eXuv700: 0,
      domKuv: 0,
      expKuv: 6,
      eXuv500: 0,
      totalXuv700: 9415,
      totalKuv: 6,
      totalXuv500: 0,
      total: 9421,
    },
    {
      duration: 'May-2026',
      dXuv700: 996,
      eXuv700: 0,
      domKuv: 0,
      expKuv: 0,
      eXuv500: 0,
      totalXuv700: 996,
      totalKuv: 0,
      totalXuv500: 0,
      total: 996,
    },
    {
      duration: '06-May-2026',
      dXuv700: 91,
      eXuv700: 0,
      domKuv: 0,
      expKuv: 0,
      eXuv500: 0,
      totalXuv700: 91,
      totalKuv: 0,
      totalXuv500: 0,
      total: 91,
    },
    {
      duration: 'C Shift',
      dXuv700: 44,
      eXuv700: 0,
      domKuv: 0,
      expKuv: 0,
      eXuv500: 0,
      totalXuv700: 44,
      totalKuv: 0,
      totalXuv500: 0,
      total: 44,
    },
    {
      duration: 'A Shift',
      dXuv700: 47,
      eXuv700: 0,
      domKuv: 0,
      expKuv: 0,
      eXuv500: 0,
      totalXuv700: 47,
      totalKuv: 0,
      totalXuv500: 0,
      total: 47,
    },
    {
      duration: 'B Shift',
      dXuv700: 0,
      eXuv700: 0,
      domKuv: 0,
      expKuv: 0,
      eXuv500: 0,
      totalXuv700: 0,
      totalKuv: 0,
      totalXuv500: 0,
      total: 0,
    },
  ],
  vehicleRows: [
    {
      dateTime: '06-05-2026 10:04',
      shift: 'A',
      batchNo: '739295',
      vinNo: 'MA1NE2ZFTT6E44760',
      engineSrNo: 'ZFT4E53606',
      modelNo: 'AW62BBZF7TF11D00BZ',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 10:00',
      shift: 'A',
      batchNo: '739294',
      vinNo: 'MA1NE2ZFTT6E44444',
      engineSrNo: 'ZTT4D85711',
      modelNo: 'AW62BCZT7TF11D00QH',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:59',
      shift: 'A',
      batchNo: '739293',
      vinNo: 'MA1NE4ZTFT6E44632',
      engineSrNo: 'ZTT4D85722',
      modelNo: 'AW64BCZT7TF11D00RX',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'AWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:54',
      shift: 'A',
      batchNo: '739292',
      vinNo: 'MA1NE2ZEAT6E44777',
      engineSrNo: 'ZET4E53644',
      modelNo: 'AW62AYZE7TA11D00OC',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:50',
      shift: 'A',
      batchNo: '739291',
      vinNo: 'MA1NE2ZTFT6E44491',
      engineSrNo: 'ZTT4D85731',
      modelNo: 'AW62BCZT7TF11D00RW',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:47',
      shift: 'A',
      batchNo: '739290',
      vinNo: 'MA1NE2ZFFT6E44747',
      engineSrNo: 'ZFT4E53534',
      modelNo: 'AW62BCZF7TF11D00YH',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:44',
      shift: 'A',
      batchNo: '739289',
      vinNo: 'MA1NE2ZSAT6E44771',
      engineSrNo: 'ZST4D86015',
      modelNo: 'AW62BCZS7TA11D00NP',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:42',
      shift: 'A',
      batchNo: '739288',
      vinNo: 'MA1NE2ZTFT6E44511',
      engineSrNo: 'ZTT4D84991',
      modelNo: 'AW62BCZT7TF11D00SE',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:39',
      shift: 'A',
      batchNo: '739287',
      vinNo: 'MA1NE2ZSAT6E44790',
      engineSrNo: 'ZST4D86129',
      modelNo: 'AW62BCZS7TA11D00BG',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:36',
      shift: 'A',
      batchNo: '739286',
      vinNo: 'MA1NE2ZFFT6E44758',
      engineSrNo: 'ZFT4E53011',
      modelNo: 'AW62BBZF7TF11D00BT',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:33',
      shift: 'A',
      batchNo: '739285',
      vinNo: 'MA1NE2ZTFT6E44508',
      engineSrNo: 'ZTT4D85920',
      modelNo: 'AW62BCZT7TF11D00QX',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
    {
      dateTime: '06-05-2026 09:30',
      shift: 'A',
      batchNo: '739284',
      vinNo: 'MA1NE2ZFFT6E44735',
      engineSrNo: 'ZFT4E53517',
      modelNo: 'AW62BCZF7TF11D00NP',
      market: 'Domestic',
      country: 'INDIA',
      driveType: 'FWD-RHD',
      colorCode: 'FF',
    },
  ],
};

@Injectable({
  providedIn: 'root',
})
export class DashboardApi {
  getDashboardData(): Observable<DashboardResponse> {
    return of(DASHBOARD_DEMO_DATA).pipe(delay(250));
  }
}
