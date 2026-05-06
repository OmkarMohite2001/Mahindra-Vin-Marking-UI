import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardApi, DashboardSummaryRow, DashboardVehicleRow } from '../../services/dashboard-api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private dashboardApi = inject(DashboardApi);

  readonly dashboard$ = this.dashboardApi.getDashboardData();

  readonly summaryColumns = [
    { key: 'duration', label: 'Duration' },
    { key: 'dXuv700', label: 'D-XUV700' },
    { key: 'eXuv700', label: 'E-XUV700' },
    { key: 'domKuv', label: 'DOMKUV' },
    { key: 'expKuv', label: 'EXPKUV' },
    { key: 'eXuv500', label: 'E-XUV500' },
    { key: 'totalXuv700', label: 'TotalXUV700' },
    { key: 'totalKuv', label: 'TotalKUV' },
    { key: 'totalXuv500', label: 'TotalXUV500' },
    { key: 'total', label: 'Total' },
  ] as const;

  readonly detailColumns = [
    { key: 'dateTime', label: 'Date' },
    { key: 'shift', label: 'Shift' },
    { key: 'batchNo', label: 'Batch No' },
    { key: 'vinNo', label: 'VIN No' },
    { key: 'engineSrNo', label: 'Engine Sr. No.' },
    { key: 'modelNo', label: 'Model No' },
    { key: 'market', label: 'Market' },
    { key: 'country', label: 'Country' },
    { key: 'driveType', label: 'Drive Type' },
    { key: 'colorCode', label: 'Color Code' },
  ] as const;

  trackSummaryRow = (_index: number, row: DashboardSummaryRow) => row.duration;

  trackVehicleRow = (_index: number, row: DashboardVehicleRow) =>
    `${row.batchNo}-${row.vinNo}-${row.dateTime}`;
}
