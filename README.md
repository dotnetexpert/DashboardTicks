# DashboardTicks

The **DashboardTicks** is a high-performance system designed to monitor and visualize sensor data in real-time. It handles thousands of readings per second, providing instant insights and alerts for critical events.

## Features

- **Live Data Streaming**: View sensor readings as they happen with minimal delay.  
- **Anomaly Detection**: Automatically highlights unusual readings for quick action.  
- **Aggregated Statistics**: Shows averages, minimums, and maximums over multiple time periods.  
- **Interactive Dashboard**: Smooth, real-time charts and panels with clear visual indicators.  
- **Alert System**: Displays notifications for anomalies with severity indicators.

## How It Works

1. **Data Simulation**: Generates realistic sensor readings continuously.  
2. **In-Memory Processing**: Fast storage and processing using efficient in-memory structures.  
3. **Aggregation & Analysis**: Computes statistics and detects anomalies in real-time.  
4. **Real-Time Updates**: Pushes data to the dashboard using WebSockets for instant visualization.

## Technology Stack

- **Backend**: .NET Core, SignalR, in-memory data structures.  
- **Frontend**: React, Recharts for real-time charts.  
- **Performance Optimizations**: Circular buffers, concurrent queues, and incremental aggregation.

## Getting Started

1. Clone the repository.  
2. Build and run the backend (.NET Core) project.  
3. Start the frontend (React) project.  
4. Open the dashboard in your browser to monitor live sensor data.

## Use Case

This dashboard is ideal for monitoring sensor networks, detecting anomalies immediately, and making data-driven decisions in real-time. It’s built for speed, reliability, and large-scale data handling.
