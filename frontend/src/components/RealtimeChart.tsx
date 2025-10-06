import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { SensorReading } from '../types';
import { historicalDataService } from '../services/historicalDataService';

interface RealtimeChartProps {
  data: SensorReading[];
  maxDataPoints: number;
}

interface ChartDataPoint {
  timestamp: string;
  value: number;
  isAnomaly: boolean;
  time: string;
  anomalyValue?: number;
}

const CustomDot: React.FC<any> = ({ cx, cy, payload }) => {
  if (payload?.isAnomaly) {
    return <Dot cx={cx} cy={cy} r={2} fill="#dc3545" stroke="#fff" strokeWidth={0.5} />;
  }
  return null;
};

const RealtimeChart: React.FC<RealtimeChartProps> = ({ data, maxDataPoints = 1000 }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [centerTime, setCenterTime] = useState<Date>(new Date());
  const [historicalData, setHistoricalData] = useState<SensorReading[]>([]);
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Calculate time range based on zoom level
  const timeRange = useMemo(() => {
    return historicalDataService.getTimeRangeForZoom(zoomLevel, centerTime);
  }, [zoomLevel, centerTime]);

  // Fetch historical data when zoom level changes
  useEffect(() => {
    if (zoomLevel !== 1) {
      setIsLoadingHistorical(true);
      historicalDataService.fetchReadingsForTimeRange(timeRange.start, timeRange.end)
        .then(fetchedData => {
          setHistoricalData(fetchedData);
        })
        .catch(error => {
          console.error('Failed to fetch historical data:', error);
        })
        .finally(() => {
          setIsLoadingHistorical(false);
        });
    } else {
      setHistoricalData([]);
    }
  }, [zoomLevel, timeRange.start, timeRange.end]);

  // Mouse wheel zoom handler
  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();

    const delta = event.deltaY;
    const zoomFactor = delta > 0 ? 0.9 : 1.1; // Zoom out or in

    setZoomLevel(prevLevel => {
      // Calculate new zoom level
      const newLevel = prevLevel * zoomFactor;

      // Limit zoom range
      const minZoom = 0.1; // Very zoomed out (days/weeks)
      const maxZoom = 20;  // Very zoomed in (minutes)

      return Math.max(minZoom, Math.min(maxZoom, newLevel));
    });
  }, []);

  // Mouse move handler to track cursor position
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  }, []);

  // Setup mouse event listeners
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousemove', handleMouseMove);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleWheel, handleMouseMove]);

  const chartData = useMemo(() => {
    // Combine historical and real-time data based on zoom level and time range
    let sourceData: SensorReading[] = [];

    if (zoomLevel !== 1 && historicalData.length > 0) {
      // Use historical data when zoomed in/out
      sourceData = historicalData;
    } else {
      // Use real-time data for live view
      sourceData = data;
    }

    // Filter data to time range if we have historical data
    if (zoomLevel !== 1 && timeRange) {
      sourceData = sourceData.filter(reading => {
        const readingTime = new Date(reading.timestamp);
        return readingTime >= timeRange.start && readingTime <= timeRange.end;
      });
    }

    // Limit data points for better performance (but allow more for historical data)
    const limitedMaxPoints = zoomLevel !== 1 ? 5000 : Math.min(maxDataPoints, 1000);
    const recentData = sourceData.slice(-limitedMaxPoints);

    // Optimize calculations
    const values = recentData.map(r => r.value);
    const avg = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return recentData.map((reading): ChartDataPoint => ({
      timestamp: reading.timestamp,
      value: reading.value,
      isAnomaly: reading.isAnomaly,
      time: new Date(reading.timestamp).toLocaleTimeString(),
      anomalyValue: reading.isAnomaly ? reading.value : undefined
    }));
  }, [data, maxDataPoints, zoomLevel, historicalData, timeRange]);

  const chartStats = useMemo(() => {
    const values = chartData.map(d => d.value);
    const anomalies = chartData.filter(d => d.isAnomaly);

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0,
      anomalyCount: anomalies.length,
      latestValue: values[values.length - 1] || 0
    };
  }, [chartData]);

  const handleChartClick = useCallback((data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const clickedTime = new Date(data.activePayload[0].payload.timestamp);
      setCenterTime(clickedTime);
    }
  }, []);

  const formatTooltip = useCallback((value: number, name: string, props: any) => {
    if (name === 'value') {
      const isAnomaly = props.payload?.isAnomaly;
      return [
        `${value.toFixed(2)}${isAnomaly ? ' ANOMALY' : ''}`,
        'Sensor Value'
      ];
    }
    return [value, name];
  }, []);

  const formatXAxisLabel = useCallback((tickItem: string) => {
    return new Date(tickItem).toLocaleTimeString();
  }, []);

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div className="chart-title-section">
          <h3>Live Sensor Data Stream</h3>
          {isLoadingHistorical && (
            <span className="loading-indicator">Loading...</span>
          )}
        </div>
        <div className="chart-info">
          <span>Latest: <strong>{chartStats.latestValue.toFixed(2)}</strong></span>
          <span>Range: <strong>{chartStats.min.toFixed(1)} - {chartStats.max.toFixed(1)}</strong></span>
          <span>Avg: <strong>{chartStats.avg.toFixed(1)}</strong></span>
          {chartStats.anomalyCount > 0 && (
            <span style={{ color: '#dc2626' }}>
              Anomalies: <strong>{chartStats.anomalyCount}</strong>
            </span>
          )}
        </div>
      </div>

      <div ref={chartContainerRef} style={{ height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="1 1" stroke="#e9ecef" />

            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxisLabel}
              interval="preserveStartEnd"
              minTickGap={30}
              tick={{ fontSize: 11, fill: '#6c757d' }}
              axisLine={{ stroke: '#e9ecef' }}
              tickLine={{ stroke: '#e9ecef' }}
            />

            <YAxis
              domain={['dataMin - 2', 'dataMax + 2']}
              tickFormatter={(value) => value.toFixed(1)}
              tick={{ fontSize: 11, fill: '#6c757d' }}
              axisLine={{ stroke: '#e9ecef' }}
              tickLine={{ stroke: '#e9ecef' }}
            />

            <ReferenceLine
              y={chartStats.avg}
              stroke="#6c757d"
              strokeDasharray="2 2"
              label={{ value: "Avg", position: "top", fontSize: 10, fill: '#6c757d' }}
            />

            <Tooltip
              formatter={formatTooltip}
              labelFormatter={(label) => `${new Date(label).toLocaleTimeString()}`}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e1e5e9',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                fontSize: '12px'
              }}
              cursor={{ stroke: '#dc3545', strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            <Area
              type="monotone"
              dataKey="value"
              fill="rgba(73, 80, 87, 0.08)"
              stroke="none"
            />

            <Line
              type="monotone"
              dataKey="value"
              stroke="#495057"
              strokeWidth={1.5}
              dot={<CustomDot />}
              activeDot={{ r: 4, stroke: '#495057', strokeWidth: 1, fill: '#fff' }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-footer">
        <div className="chart-legend-section">
          <div className="legend-item">
            <div className="legend-dot"></div>
            <span>Sensor Data</span>
          </div>
          {chartStats.anomalyCount > 0 && (
            <div className="legend-item">
              <div className="anomaly-legend-dot"></div>
              <span>Anomalies ({chartStats.anomalyCount})</span>
            </div>
          )}
        </div>
        <div className="chart-stats">
          <div className="stat-item">
            <span className="stat-value">{chartData.length.toLocaleString()}</span>
            <span className="stat-label">Data Points</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">1s</span>
            <span className="stat-label">Update Rate</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RealtimeChart);