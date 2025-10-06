using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Interfaces
{
    public interface IAggregationEngine
    {
        AggregationResult GetCurrentAggregations();
        event EventHandler<AggregationResult>? AggregationUpdated;
    }
}