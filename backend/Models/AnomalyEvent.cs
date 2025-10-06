namespace RealtimeAnalytics.Backend.Models
{
    public record AnomalyEvent(
        SensorReading Reading,
        string Reason,
        DateTime DetectedAt
    );
}