using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Interfaces
{
    public interface IDataStore
    {
        void AddReading(SensorReading reading);
        IEnumerable<SensorReading> GetRecentReadings(int count);
        IEnumerable<SensorReading> GetReadingsSince(DateTime since);
        void PurgeExpiredData();
        int Count { get; }
    }
}