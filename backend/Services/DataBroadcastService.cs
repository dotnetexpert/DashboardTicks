using Microsoft.AspNetCore.SignalR;
using RealtimeAnalytics.Backend.Hubs;
using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class DataBroadcastService : BackgroundService
    {
        private readonly IHubContext<DataStreamHub> _hubContext;
        private readonly ISensorSimulator _sensorSimulator;
        private readonly IAggregationEngine _aggregationEngine;
        private readonly IAnomalyDetector _anomalyDetector;
        private readonly IDataStore _dataStore;
        private readonly ILogger<DataBroadcastService> _logger;

        public DataBroadcastService(
            IHubContext<DataStreamHub> hubContext,
            ISensorSimulator sensorSimulator,
            IAggregationEngine aggregationEngine,
            IAnomalyDetector anomalyDetector,
            IDataStore dataStore,
            ILogger<DataBroadcastService> logger)
        {
            _hubContext = hubContext;
            _sensorSimulator = sensorSimulator;
            _aggregationEngine = aggregationEngine;
            _anomalyDetector = anomalyDetector;
            _dataStore = dataStore;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _sensorSimulator.ReadingGenerated += OnReadingGenerated;
            _aggregationEngine.AggregationUpdated += OnAggregationUpdated;
            _anomalyDetector.AnomalyDetected += OnAnomalyDetected;

            await _sensorSimulator.StartAsync(stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                await Task.Delay(1000, stoppingToken);
            }
        }

        private async void OnReadingGenerated(object? sender, SensorReading reading)
        {
            try
            {
                var isAnomaly = _anomalyDetector.IsAnomaly(reading);
                var updatedReading = reading with { IsAnomaly = isAnomaly };
                _dataStore.AddReading(updatedReading);
                await _hubContext.Clients.All.SendAsync("SensorReading", updatedReading);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting sensor reading");
            }
        }

        private async void OnAggregationUpdated(object? sender, AggregationResult aggregation)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("AggregationUpdate", aggregation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting aggregation update");
            }
        }

        private async void OnAnomalyDetected(object? sender, AnomalyEvent anomalyEvent)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("AnomalyAlert", anomalyEvent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting anomaly alert");
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            await _sensorSimulator.StopAsync();
            await base.StopAsync(cancellationToken);
        }
    }
}