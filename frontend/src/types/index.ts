export interface SensorReading {
  sensorId: string;
  timestamp: string;
  value: number;
  isAnomaly: boolean;
}

export interface AggregationResult {
  average1s: number;
  average1m: number;
  average5m: number;
  max60s: number;
  min60s: number;
  anomalyCount: number;
  timestamp: string;
}

export interface AnomalyEvent {
  reading: SensorReading;
  reason: string;
  detectedAt: string;
}

export interface AnomalyThresholds {
  fixedUpperThreshold?: number;
  fixedLowerThreshold?: number;
  percentileThreshold?: number;
}

export type DashboardAction =
  | { type: 'ADD_SENSOR_READING'; payload: SensorReading }
  | { type: 'UPDATE_AGGREGATION'; payload: AggregationResult }
  | { type: 'ADD_ANOMALY_ALERT'; payload: AnomalyEvent }
  | { type: 'REMOVE_ANOMALY_ALERT'; payload: string }
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'CLEAR_OLD_READINGS' };

export interface DashboardState {
  sensorReadings: SensorReading[];
  currentAggregation: AggregationResult | null;
  anomalyAlerts: AnomalyEvent[];
  isConnected: boolean;
}