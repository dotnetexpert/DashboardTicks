using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Interfaces
{
    public interface ISensorSimulator
    {
        Task StartAsync(CancellationToken cancellationToken);
        Task StopAsync();
        event EventHandler<SensorReading>? ReadingGenerated;
    }
}