using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class AggregationEngine : IAggregationEngine, IDisposable
    {
        private readonly IDataStore _dataStore;
        private readonly ILogger<AggregationEngine> _logger;
        private readonly Timer _timer;
        private AggregationResult _currentAggregations;
        private readonly object _lock = new();

        public event EventHandler<AggregationResult>? AggregationUpdated;

        public AggregationEngine(IDataStore dataStore, ILogger<AggregationEngine> logger)
        {
            _dataStore = dataStore;
            _logger = logger;
            _currentAggregations = new AggregationResult(0, 0, 0, 0, 0, 0, DateTime.UtcNow);
            _timer = new Timer(CalculateAggregations, null, TimeSpan.Zero, TimeSpan.FromSeconds(1));
        }

        public AggregationResult GetCurrentAggregations()
        {
            lock (_lock) return _currentAggregations;
        }

        private void CalculateAggregations(object? state)
        {
            try
            {
                var now = DateTime.UtcNow;
                var readings60s = _dataStore.GetReadingsSince(now.AddSeconds(-60)).ToArray();

                var aggregation = new AggregationResult(
                    Average1s: CalculateAverage(_dataStore.GetReadingsSince(now.AddSeconds(-1))),
                    Average1m: CalculateAverage(_dataStore.GetReadingsSince(now.AddMinutes(-1))),
                    Average5m: CalculateAverage(_dataStore.GetReadingsSince(now.AddMinutes(-5))),
                    Max60s: readings60s.Length > 0 ? readings60s.Max(r => r.Value) : 0,
                    Min60s: readings60s.Length > 0 ? readings60s.Min(r => r.Value) : 0,
                    AnomalyCount: readings60s.Count(r => r.IsAnomaly),
                    Timestamp: now
                );

                lock (_lock)
                {
                    _currentAggregations = aggregation;
                }

                AggregationUpdated?.Invoke(this, aggregation);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calculating aggregations");
            }
        }

        private static double CalculateAverage(IEnumerable<SensorReading> readings)
        {
            var readingsArray = readings.ToArray();
            return readingsArray.Length > 0 ? readingsArray.Average(r => r.Value) : 0;
        }

        public void Dispose() => _timer?.Dispose();
    }
}