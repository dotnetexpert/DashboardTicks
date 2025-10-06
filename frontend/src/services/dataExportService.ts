interface ExportOptions {
  startDate?: string;
  endDate?: string;
}

interface DataSummary {
  dateRange: {
    start: string;
    end: string;
  };
  totalReadings: number;
  totalAnomalies: number;
  averageValue: number;
  minValue: number;
  maxValue: number;
  anomalyRate: number;
  uniqueSensors: number;
}

class DataExportService {
  private baseUrl = 'http://localhost:5000/api/DataExport';

  async exportData(options: ExportOptions = {}): Promise<void> {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) {
        params.append('startDate', options.startDate);
      }
      
      if (options.endDate) {
        params.append('endDate', options.endDate);
      }

      const url = `${this.baseUrl}/export?${params.toString()}`;
      
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `sensor_data_${options.startDate || 'latest'}_${options.endDate || 'now'}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Failed to export data');
    }
  }

  async getDataSummary(options: ExportOptions = {}): Promise<DataSummary> {
    try {
      const params = new URLSearchParams();
      
      if (options.startDate) {
        params.append('startDate', options.startDate);
      }
      
      if (options.endDate) {
        params.append('endDate', options.endDate);
      }

      const url = `${this.baseUrl}/summary?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch data summary');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to get data summary:', error);
      throw new Error('Failed to get data summary');
    }
  }

  formatDateForExport(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  getDefaultDateRange(): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1); // Last 24 hours
    
    return {
      startDate: this.formatDateForExport(startDate),
      endDate: this.formatDateForExport(endDate)
    };
  }
}

export const dataExportService = new DataExportService();
export type { ExportOptions, DataSummary };
