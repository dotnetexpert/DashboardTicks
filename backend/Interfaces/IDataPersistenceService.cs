using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Interfaces
{
    public interface IDataPersistenceService
    {
        void SaveSensorReading(SensorReading reading);
        void SaveAnomalyEvent(AnomalyEvent anomaly);
        List<SensorReading> GetReadingsForDateRange(DateTime startDate, DateTime endDate);
        List<AnomalyEvent> GetAnomaliesForDateRange(DateTime startDate, DateTime endDate);
        byte[] ExportDataAsCsv(DateTime startDate, DateTime endDate);
    }
}
