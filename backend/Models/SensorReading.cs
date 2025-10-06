namespace RealtimeAnalytics.Backend.Models
{
    public record SensorReading(
        Guid SensorId,
        DateTime Timestamp,
        double Value,
        bool IsAnomaly = false
    );
}