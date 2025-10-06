import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { WebSocketService } from '../services/websocketService';
import RealtimeChart from './RealtimeChart';
import StatisticsPanel from './StatisticsPanel';
import AnomaliesSidebar from './AnomaliesSidebar';
import DataExport from './DataExport';

const Dashboard: React.FC = () => {
  const { state, dispatch } = useDashboard();
  const wsServiceRef = useRef<WebSocketService | null>(null);

  const handleDismissAlert = useCallback((alertId: string) => {
    dispatch({ type: 'REMOVE_ANOMALY_ALERT', payload: alertId });
  }, [dispatch]);

  const systemMetrics = useMemo(() => ({
    totalReadings: state.sensorReadings.length,
    activeAlerts: state.anomalyAlerts.length,
    avgValue: state.sensorReadings.length > 0
      ? state.sensorReadings.reduce((sum, r) => sum + r.value, 0) / state.sensorReadings.length
      : 0,
    anomalyRate: state.sensorReadings.length > 0
      ? (state.sensorReadings.filter(r => r.isAnomaly).length / state.sensorReadings.length) * 100
      : 0,
    lastUpdate: state.sensorReadings.length > 0
      ? new Date(state.sensorReadings[state.sensorReadings.length - 1].timestamp).toLocaleTimeString()
      : 'No data'
  }), [state.sensorReadings, state.anomalyAlerts]);

  useEffect(() => {
    const wsService = new WebSocketService();
    wsServiceRef.current = wsService;

    const connectAndSetupListeners = async () => {
      try {
        await wsService.connect();
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: true });

        wsService.onSensorData((reading) => {
          dispatch({ type: 'ADD_SENSOR_READING', payload: reading });
        });

        wsService.onAggregation((aggregation) => {
          dispatch({ type: 'UPDATE_AGGREGATION', payload: aggregation });
        });

        wsService.onAnomaly((anomaly) => {
          dispatch({ type: 'ADD_ANOMALY_ALERT', payload: anomaly });
        });

        const checkConnection = setInterval(() => {
          const isConnected = wsService.isConnected();
          dispatch({ type: 'SET_CONNECTION_STATUS', payload: isConnected });
        }, 10000); // Reduced frequency

        const cleanupOldData = setInterval(() => {
          dispatch({ type: 'CLEAR_OLD_READINGS' });
        }, 60000); // Reduced frequency

        return () => {
          clearInterval(checkConnection);
          clearInterval(cleanupOldData);
        };
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        dispatch({ type: 'SET_CONNECTION_STATUS', payload: false });
      }
    };

    connectAndSetupListeners();

    return () => {
      wsServiceRef.current?.disconnect();
    };
  }, [dispatch]);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-header-main">
          <div className="dashboard-title-row">
            <h1>Real-time Analytics Dashboard</h1>
            <div className={`connection-status ${state.isConnected ? 'connected' : 'disconnected'}`}>
              {state.isConnected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="dashboard-header-status">
          <div className="status-item">
            <span className="status-label">Stability:</span>
            <span className="status-value" style={{
              color: systemMetrics.anomalyRate > 5 ? '#dc3545' : '#28a745'
            }}>
              {systemMetrics.anomalyRate > 5 ? 'Low' : systemMetrics.anomalyRate > 2 ? 'Medium' : 'High'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Range:</span>
            <span className="status-value">
              {state.currentAggregation ?
                (state.currentAggregation.max60s - state.currentAggregation.min60s).toFixed(1) :
                '--'
              }
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Updated:</span>
            <span className="status-value">{systemMetrics.lastUpdate}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className="status-value" style={{
              color: state.isConnected ? '#28a745' : '#dc3545'
            }}>
              {state.isConnected ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      <div className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-grid">
            <div className="card">
              <StatisticsPanel aggregation={state.currentAggregation} />
            </div>

            <div className="card">
              <h3>Live Metrics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{systemMetrics.totalReadings.toLocaleString()}</div>
                  <div className="stat-label">Total Readings</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: systemMetrics.activeAlerts > 0 ? '#dc3545' : '#28a745' }}>
                    {systemMetrics.activeAlerts}
                  </div>
                  <div className="stat-label">Active Alerts</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{systemMetrics.avgValue.toFixed(1)}</div>
                  <div className="stat-label">Avg Value</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value" style={{ color: systemMetrics.anomalyRate > 5 ? '#dc3545' : '#28a745' }}>
                    {systemMetrics.anomalyRate.toFixed(1)}%
                  </div>
                  <div className="stat-label">Anomaly Rate</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{systemMetrics.totalReadings > 0 ?
                    Math.round((systemMetrics.totalReadings / 1000) * 100) / 100 + 'k' : '0'}</div>
                  <div className="stat-label">Data Points</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{state.currentAggregation ?
                    state.currentAggregation.anomalyCount.toString() : '0'}</div>
                  <div className="stat-label">Current Anomalies</div>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-chart card">
            <div className="card-tooltip">Live sensor data stream with anomaly detection overlay</div>
            <RealtimeChart
              data={state.sensorReadings}
              maxDataPoints={1000}
            />
          </div>

          <DataExport />
        </div>

        <AnomaliesSidebar
          anomalies={state.anomalyAlerts}
          onDismiss={handleDismissAlert}
        />
      </div>
    </div>
  );
};

export default Dashboard;