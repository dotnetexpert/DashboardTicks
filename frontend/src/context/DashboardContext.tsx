import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { DashboardState, DashboardAction } from '../types';

const initialState: DashboardState = {
  sensorReadings: [],
  currentAggregation: null,
  anomalyAlerts: [],
  isConnected: false,
};

const MAX_READINGS = 1000; // Reduced from 1000 to save memory
const CUTOFF_MINUTES = 5;

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'ADD_SENSOR_READING': {
      // Use more memory-efficient approach
      const newReadings = [...state.sensorReadings, action.payload];
      if (newReadings.length > MAX_READINGS) {
        // Remove oldest readings more efficiently
        return {
          ...state,
          sensorReadings: newReadings.slice(-MAX_READINGS),
        };
      }
      return {
        ...state,
        sensorReadings: newReadings,
      };
    }

    case 'UPDATE_AGGREGATION':
      return {
        ...state,
        currentAggregation: action.payload,
      };

    case 'ADD_ANOMALY_ALERT': {
      const newAlerts = [action.payload, ...state.anomalyAlerts];
      return {
        ...state,
        anomalyAlerts: newAlerts, // Store all anomalies without limit
      };
    }

    case 'REMOVE_ANOMALY_ALERT':
      return {
        ...state,
        anomalyAlerts: state.anomalyAlerts.filter(
          alert => alert.detectedAt !== action.payload
        ),
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.payload,
      };

    case 'CLEAR_OLD_READINGS': {
      const cutoffTime = new Date(Date.now() - CUTOFF_MINUTES * 60 * 1000);
      return {
        ...state,
        sensorReadings: state.sensorReadings.filter(
          reading => new Date(reading.timestamp) > cutoffTime
        ),
      };
    }

    default:
      return state;
  }
}

const DashboardContext = createContext<{
  state: DashboardState;
  dispatch: React.Dispatch<DashboardAction>;
} | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}