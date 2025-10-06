import React, { useMemo } from 'react';
import { AggregationResult } from '../types';

interface StatisticsPanelProps {
  aggregation: AggregationResult | null;
}

interface StatItemProps {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'stable';
}

interface StatItemProps {
  value: string;
  label: string;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  tooltip?: string;
}

const StatItem: React.FC<StatItemProps> = React.memo(({ value, label, color, trend, tooltip }) => (
  <div className="stat-item" title={tooltip}>
    <div className="stat-value" style={{ color }}>
      {trend && (
        <div style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          marginRight: '6px',
          borderRadius: '50%',
          backgroundColor: trend === 'up' ? '#28a745' : trend === 'down' ? '#dc3545' : '#6c757d'
        }} />
      )}
      {value}
    </div>
    <div className="stat-label">{label}</div>
  </div>
));

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({ aggregation }) => {
  const formatValue = (value: number) => value.toFixed(2);
  const formatTimestamp = (timestamp: string) => new Date(timestamp).toLocaleTimeString();

  const statsData = useMemo(() => {
    if (!aggregation) return null;

    const trend1s: 'up' | 'down' | 'stable' = aggregation.average1s > aggregation.average1m ? 'up' :
      aggregation.average1s < aggregation.average1m ? 'down' : 'stable';

    const trend1m: 'up' | 'down' | 'stable' = aggregation.average1m > aggregation.average5m ? 'up' :
      aggregation.average1m < aggregation.average5m ? 'down' : 'stable';

    return [
      {
        value: formatValue(aggregation.average1s),
        label: '1s Average',
        trend: trend1s,
        tooltip: 'Rolling average of the last 1 second\'s sensor readings'
      },
      {
        value: formatValue(aggregation.average1m),
        label: '1m Average',
        trend: trend1m,
        tooltip: 'Rolling average of the last 1 minute\'s sensor readings'
      },
      {
        value: formatValue(aggregation.average5m),
        label: '5m Average',
        tooltip: 'Rolling average of the last 5 minutes\' sensor readings'
      },
      {
        value: formatValue(aggregation.max60s),
        label: 'Max (60s)',
        color: '#dc3545',
        tooltip: 'Maximum value recorded in the last 60 seconds'
      },
      {
        value: formatValue(aggregation.min60s),
        label: 'Min (60s)',
        color: '#28a745',
        tooltip: 'Minimum value recorded in the last 60 seconds'
      },
      {
        value: aggregation.anomalyCount.toString(),
        label: 'Anomalies',
        color: aggregation.anomalyCount > 0 ? '#dc3545' : '#28a745',
        tooltip: 'Total number of anomalies detected in current aggregation window'
      }
    ];
  }, [aggregation]);

  const performanceMetrics = useMemo(() => {
    if (!aggregation) return null;

    const range = aggregation.max60s - aggregation.min60s;
    const stability = range < 5 ? 'High' : range < 15 ? 'Medium' : 'Low';
    const stabilityColor = stability === 'High' ? '#28a745' : stability === 'Medium' ? '#ffc107' : '#dc3545';

    return {
      stability,
      stabilityColor,
      range: range.toFixed(1),
      variance: ((aggregation.average5m - aggregation.average1s) / aggregation.average1s * 100).toFixed(1)
    };
  }, [aggregation]);

  if (!aggregation || !statsData || !performanceMetrics) {
    return (
      <div>
        <h3>Real-time Statistics</h3>
        <div className="stats-grid">
          <StatItem value="--" label="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3>Real-time Statistics</h3>
      <div className="stats-grid">
        {statsData.map((stat, index) => (
          <StatItem key={index} {...stat} />
        ))}
      </div>

    </div>
  );
};

export default React.memo(StatisticsPanel);