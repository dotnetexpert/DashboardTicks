using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class AnomalyDetector : IAnomalyDetector
    {
        private readonly IDataStore _dataStore;
        private readonly IDataPersistenceService _persistenceService;
        private readonly ILogger<AnomalyDetector> _logger;
        private AnomalyThresholds _thresholds;
        private readonly object _lock = new();

        public event EventHandler<AnomalyEvent>? AnomalyDetected;

        public AnomalyDetector(IDataStore dataStore, IDataPersistenceService persistenceService, ILogger<AnomalyDetector> logger)
        {
            _dataStore = dataStore;
            _persistenceService = persistenceService;
            _logger = logger;
            _thresholds = new AnomalyThresholds(80.0, 10.0, 95.0);
        }

        public bool IsAnomaly(SensorReading reading)
        {
            ArgumentNullException.ThrowIfNull(reading);

            lock (_lock)
            {
                var (isAnomaly, reason) = CheckThresholds(reading);
                
                if (isAnomaly)
                {
                    var anomalyEvent = new AnomalyEvent(reading, reason, DateTime.UtcNow);
                    AnomalyDetected?.Invoke(this, anomalyEvent);
                    
                    // Persist anomaly to disk
                    _persistenceService.SaveAnomalyEvent(anomalyEvent);
                }

                return isAnomaly;
            }
        }

        private (bool isAnomaly, string reason) CheckThresholds(SensorReading reading)
        {
            if (_thresholds.FixedUpperThreshold.HasValue && reading.Value > _thresholds.FixedUpperThreshold.Value)
            {
                return (true, $"Value {reading.Value:F2} exceeds upper threshold {_thresholds.FixedUpperThreshold.Value:F2}");
            }

            if (_thresholds.FixedLowerThreshold.HasValue && reading.Value < _thresholds.FixedLowerThreshold.Value)
            {
                return (true, $"Value {reading.Value:F2} below lower threshold {_thresholds.FixedLowerThreshold.Value:F2}");
            }

            if (_thresholds.PercentileThreshold.HasValue)
            {
                var recentReadings = _dataStore.GetReadingsSince(DateTime.UtcNow.AddMinutes(-5)).ToArray();
                if (recentReadings.Length > 10)
                {
                    var percentileValue = CalculatePercentile(recentReadings.Select(r => r.Value), _thresholds.PercentileThreshold.Value);
                    if (reading.Value > percentileValue)
                    {
                        return (true, $"Value {reading.Value:F2} exceeds {_thresholds.PercentileThreshold.Value}th percentile {percentileValue:F2}");
                    }
                }
            }

            return (false, string.Empty);
        }

        public void UpdateThresholds(AnomalyThresholds thresholds)
        {
            ArgumentNullException.ThrowIfNull(thresholds);
            
            lock (_lock)
            {
                _thresholds = thresholds;
            }
        }

        private static double CalculatePercentile(IEnumerable<double> values, double percentile)
        {
            var sortedValues = values.OrderBy(x => x).ToArray();
            if (sortedValues.Length == 0) return 0;

            var index = (percentile / 100.0) * (sortedValues.Length - 1);
            var lowerIndex = (int)Math.Floor(index);
            var upperIndex = (int)Math.Ceiling(index);

            return lowerIndex == upperIndex 
                ? sortedValues[lowerIndex] 
                : sortedValues[lowerIndex] * (1 - (index - lowerIndex)) + sortedValues[upperIndex] * (index - lowerIndex);
        }
    }
}