import * as signalR from '@microsoft/signalr';
import { SensorReading, AggregationResult, AnomalyEvent } from '../types';

export class WebSocketService {
  private connection: signalR.HubConnection | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;
  private readonly hubUrl = 'http://localhost:5000/datastream';

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount < this.maxReconnectAttempts) {
            return this.reconnectDelay * Math.pow(2, retryContext.previousRetryCount);
          }
          return null;
        }
      })
      .build();

    this.setupConnectionHandlers();

    try {
      await this.connection.start();
      console.log('SignalR connected');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('SignalR connection failed:', error);
      this.scheduleReconnect();
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.connection.onreconnected(() => {
      console.log('SignalR reconnected');
      this.reconnectAttempts = 0;
    });

    this.connection.onclose(() => {
      console.log('SignalR connection closed');
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.connection?.stop();
    this.connection = null;
  }

  onSensorData(callback: (data: SensorReading) => void): void {
    this.connection?.on('SensorReading', callback);
  }

  onAggregation(callback: (data: AggregationResult) => void): void {
    this.connection?.on('AggregationUpdate', callback);
  }

  onAnomaly(callback: (data: AnomalyEvent) => void): void {
    this.connection?.on('AnomalyAlert', callback);
  }

  getConnectionState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }
}