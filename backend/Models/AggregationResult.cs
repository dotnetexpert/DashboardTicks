namespace RealtimeAnalytics.Backend.Models
{
    public record AggregationResult(
        double Average1s,
        double Average1m,
        double Average5m,
        double Max60s,
        double Min60s,
        int AnomalyCount,
        DateTime Timestamp
    );
}