export class HourlyOccupancyDto {
  hour: number; // 0-23
  averageOccupancyRate: number; // Float, e.g., 65.5 for 65.5%
}

export type GetTodayOccupancyChartDto = HourlyOccupancyDto[];