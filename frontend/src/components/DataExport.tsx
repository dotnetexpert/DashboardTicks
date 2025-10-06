import React, { useState } from 'react';
import { dataExportService, DataSummary } from '../services/dataExportService';

interface DataExportProps {
  className?: string;
}

const DataExport: React.FC<DataExportProps> = ({ className = '' }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  React.useEffect(() => {
    // Set default date range (last 24 hours)
    const defaultRange = dataExportService.getDefaultDateRange();
    setStartDate(defaultRange.startDate);
    setEndDate(defaultRange.endDate);

    // Load initial summary
    loadSummary(defaultRange.startDate, defaultRange.endDate);
  }, []);

  const loadSummary = async (start: string, end: string) => {
    try {
      setIsLoading(true);
      const dataSummary = await dataExportService.getDataSummary({ startDate: start, endDate: end });
      setSummary(dataSummary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }

    // Update summary when dates change
    if (startDate && endDate) {
      loadSummary(field === 'start' ? value : startDate, field === 'end' ? value : endDate);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await dataExportService.exportData({ startDate, endDate });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = async (hours: number) => {
    try {
      setIsExporting(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(startDate.getHours() - hours);

      await dataExportService.exportData({
        startDate: dataExportService.formatDateForExport(startDate),
        endDate: dataExportService.formatDateForExport(endDate)
      });
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`data-export ${className}`}>
      <div className="export-header">
        <h3>Data Export</h3>
        <p>Export sensor data and anomalies as CSV</p>
      </div>

      <div className="export-controls">
        <div className="date-range">
          <div className="date-input">
            <label>Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="date-input">
            <label>End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="quick-export">
          <label>Quick Export:</label>
          <div className="quick-buttons">
            <button onClick={() => handleQuickExport(1)} disabled={isExporting}>
              Last Hour
            </button>
            <button onClick={() => handleQuickExport(24)} disabled={isExporting}>
              Last 24h
            </button>
            <button onClick={() => handleQuickExport(168)} disabled={isExporting}>
              Last 7 Days
            </button>
          </div>
        </div>

        <button
          className="export-button"
          onClick={handleExport}
          disabled={isExporting || !startDate || !endDate}
        >
          {isExporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {summary && (
        <div className="export-summary">
          <h4>Data Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Readings:</span>
              <span className="summary-value">{summary.totalReadings.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Anomalies:</span>
              <span className="summary-value">{summary.totalAnomalies.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Anomaly Rate:</span>
              <span className="summary-value">{summary.anomalyRate.toFixed(2)}%</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg Value:</span>
              <span className="summary-value">{summary.averageValue.toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Range:</span>
              <span className="summary-value">{summary.minValue.toFixed(1)} - {summary.maxValue.toFixed(1)}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Sensors:</span>
              <span className="summary-value">{summary.uniqueSensors}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(DataExport);
