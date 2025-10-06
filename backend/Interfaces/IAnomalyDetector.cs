using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Interfaces
{
    public interface IAnomalyDetector
    {
        bool IsAnomaly(SensorReading reading);
        void UpdateThresholds(AnomalyThresholds thresholds);
        event EventHandler<AnomalyEvent>? AnomalyDetected;
    }
}