using RealtimeAnalytics.Backend.DataStructures;
using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class DataStore : IDataStore
    {
        private readonly CircularBuffer<SensorReading> _buffer;
        private readonly IDataPersistenceService _persistenceService;
        private readonly object _lock = new();

        public DataStore(IDataPersistenceService persistenceService)
        {
            _buffer = new CircularBuffer<SensorReading>(100_000);
            _persistenceService = persistenceService;
        }

        public int Count => _buffer.Count;

        public void AddReading(SensorReading reading)
        {
            ArgumentNullException.ThrowIfNull(reading);
            _buffer.Add(reading);
            
            // Persist to disk
            _persistenceService.SaveSensorReading(reading);
        }

        public IEnumerable<SensorReading> GetRecentReadings(int count)
        {
            if (count <= 0) return Enumerable.Empty<SensorReading>();
            
            var items = _buffer.GetItems();
            return count >= items.Length ? items : items.TakeLast(count);
        }

        public IEnumerable<SensorReading> GetReadingsSince(DateTime since)
        {
            return _buffer.GetItems().Where(r => r.Timestamp >= since);
        }

        public void PurgeExpiredData()
        {
            var cutoffTime = DateTime.UtcNow.AddHours(-24);
            
            lock (_lock)
            {
                var validReadings = _buffer.GetItems().Where(r => r.Timestamp >= cutoffTime).ToArray();
                _buffer.Clear();
                foreach (var reading in validReadings)
                    _buffer.Add(reading);
            }
        }
    }
}