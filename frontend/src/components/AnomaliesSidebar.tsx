import React, { useCallback } from 'react';
import { AnomalyEvent } from '../types';

interface AnomaliesSidebarProps {
  anomalies: AnomalyEvent[];
  onDismiss: (alertId: string) => void;
}

interface AnomalyItemProps {
  anomaly: AnomalyEvent;
  onDismiss: () => void;
}

const AnomalyItem: React.FC<AnomalyItemProps> = ({ anomaly, onDismiss }) => {
  const formatSensorId = useCallback((sensorId: string) =>
    `${sensorId.substring(0, 8)}...`, []
  );

  const formatTimestamp = useCallback((timestamp: string) =>
    new Date(timestamp).toLocaleTimeString(), []
  );

  const getSeverityLevel = useCallback((value: number) => {
    if (value > 80) return { level: 'Critical', color: '#dc2626' };
    if (value > 70) return { level: 'High', color: '#ea580c' };
    if (value > 60) return { level: 'Medium', color: '#d97706' };
    return { level: 'Low', color: '#059669' };
  }, []);

  const severity = getSeverityLevel(anomaly.reading.value);

  return (
    <div
      className="anomaly-item"
      title={`Sensor: ${anomaly.reading.sensorId}\nValue: ${anomaly.reading.value.toFixed(2)}\nReason: ${anomaly.reason}\nTime: ${formatTimestamp(anomaly.reading.timestamp)}`}
    >
      <div className="anomaly-header">
        <div className="anomaly-sensor">
          {formatSensorId(anomaly.reading.sensorId)}
        </div>
        <div className="anomaly-time">
          {formatTimestamp(anomaly.reading.timestamp)}
        </div>
      </div>

      <div className="anomaly-value">
        {anomaly.reading.value.toFixed(2)}
      </div>

      <div className="anomaly-reason">
        {anomaly.reason}
      </div>

      <div className="anomaly-actions">
        <button
          className="anomaly-dismiss"
          onClick={() => onDismiss()}
          title="Dismiss anomaly"
        >
          ×
        </button>
      </div>
    </div>
  );
};

const AnomaliesSidebar: React.FC<AnomaliesSidebarProps> = ({ anomalies, onDismiss }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 9;

  // Optimize sorting with useMemo and limit total anomalies for memory efficiency
  const sortedAnomalies = React.useMemo(() => {
    // Limit to last 1000 anomalies to prevent memory issues
    const limitedAnomalies = anomalies.length > 1000 ? anomalies.slice(-1000) : anomalies;
    return [...limitedAnomalies].sort((a, b) =>
      new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }, [anomalies]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedAnomalies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageAnomalies = sortedAnomalies.slice(startIndex, endIndex);

  // Reset to first page when new anomalies arrive (debounced)
  const resetPageRef = React.useRef<NodeJS.Timeout>();
  React.useEffect(() => {
    if (resetPageRef.current) {
      clearTimeout(resetPageRef.current);
    }
    resetPageRef.current = setTimeout(() => {
      setCurrentPage(1);
    }, 100);

    return () => {
      if (resetPageRef.current) {
        clearTimeout(resetPageRef.current);
      }
    };
  }, [sortedAnomalies.length]);

  if (anomalies.length === 0) {
    return (
      <div className="anomalies-sidebar">
        <div className="anomalies-header">
          <h3>Anomalies</h3>
          <div className="anomalies-count">0</div>
        </div>
        <div className="no-anomalies">
          No anomalies detected<br />
          <small>System operating normally</small>
        </div>
      </div>
    );
  }

  return (
    <div className="anomalies-sidebar">
      <div className="anomalies-header">
        <h3>Anomalies</h3>
        <div className="anomalies-count">{anomalies.length}</div>
      </div>

      <div className="anomalies-grid">
        {currentPageAnomalies.map((anomaly) => (
          <AnomalyItem
            key={anomaly.detectedAt}
            anomaly={anomaly}
            onDismiss={() => onDismiss(anomaly.detectedAt)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="anomalies-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            title="Previous page"
          >
            ‹
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            title="Next page"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(AnomaliesSidebar);
