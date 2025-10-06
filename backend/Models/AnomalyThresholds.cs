namespace RealtimeAnalytics.Backend.Models
{
    public record AnomalyThresholds(
        double? FixedUpperThreshold = null,
        double? FixedLowerThreshold = null,
        double? PercentileThreshold = null
    );
}