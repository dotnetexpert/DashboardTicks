interface HistoricalDataRequest {
  startDate: string;
  endDate: string;
}

interface SensorReading {
  sensorId: string;
  value: number;
  timestamp: string;
  isAnomaly: boolean;
}

interface AnomalyEvent {
  reading: SensorReading;
  reason: string;
  detectedAt: string;
}

interface HistoricalDataResponse {
  readings: SensorReading[];
  anomalies: AnomalyEvent[];
}

class HistoricalDataService {
  private baseUrl = 'http://localhost:5000/api';

  async fetchHistoricalData(request: HistoricalDataRequest): Promise<HistoricalDataResponse> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', request.startDate);
      params.append('endDate', request.endDate);

      // Fetch readings
      const readingsResponse = await fetch(`${this.baseUrl}/SensorData/historical?${params.toString()}`);
      if (!readingsResponse.ok) {
        throw new Error('Failed to fetch historical readings');
      }
      const readings = await readingsResponse.json();

      // Fetch anomalies
      const anomaliesResponse = await fetch(`${this.baseUrl}/SensorData/anomalies?${params.toString()}`);
      if (!anomaliesResponse.ok) {
        throw new Error('Failed to fetch historical anomalies');
      }
      const anomalies = await anomaliesResponse.json();

      return { readings, anomalies };
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      throw error;
    }
  }

  async fetchReadingsForTimeRange(startTime: Date, endTime: Date): Promise<SensorReading[]> {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startTime.toISOString());
      params.append('endDate', endTime.toISOString());

      const response = await fetch(`${this.baseUrl}/SensorData/historical?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch readings for time range');
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch readings for time range:', error);
      return [];
    }
  }

  formatDateForAPI(date: Date): string {
    return date.toISOString();
  }

  parseAPIDate(dateString: string): Date {
    return new Date(dateString);
  }

  // Calculate appropriate time range based on zoom level
  getTimeRangeForZoom(zoomLevel: number, centerTime: Date): { start: Date; end: Date } {
    const now = new Date();
    const center = centerTime || now;
    
    // Extended zoom levels for better range
    // zoomLevel 1 = 24 hours, 2 = 12 hours, 3 = 6 hours, 4 = 3 hours, etc.
    // Negative zoom levels for zooming out beyond current data
    let timeSpanHours: number;
    
    if (zoomLevel <= 1) {
      // Live mode or minimal zoom
      timeSpanHours = 24;
    } else if (zoomLevel > 1) {
      // Zoom in: 12h, 6h, 3h, 1.5h, 45m, 22.5m, 11.25m, 5.6m, 2.8m, 1.4m
      timeSpanHours = 12 / Math.pow(2, zoomLevel - 2);
    } else {
      // Zoom out: 48h, 96h, 192h, etc.
      timeSpanHours = 24 * Math.pow(2, Math.abs(zoomLevel));
    }
    
    const timeSpanMs = timeSpanHours * 60 * 60 * 1000;
    
    return {
      start: new Date(center.getTime() - timeSpanMs / 2),
      end: new Date(center.getTime() + timeSpanMs / 2)
    };
  }

  // Get zoom level from time span
  getZoomLevelFromTimeSpan(timeSpanMs: number): number {
    const timeSpanHours = timeSpanMs / (60 * 60 * 1000);
    
    if (timeSpanHours <= 24) {
      // Zoom in levels
      return Math.max(1, Math.ceil(Math.log2(12 / timeSpanHours)) + 2);
    } else {
      // Zoom out levels
      return Math.min(0, -Math.ceil(Math.log2(timeSpanHours / 24)));
    }
  }
}

export const historicalDataService = new HistoricalDataService();
export type { HistoricalDataRequest, SensorReading, AnomalyEvent, HistoricalDataResponse };
