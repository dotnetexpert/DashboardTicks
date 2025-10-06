using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class SensorSimulator : ISensorSimulator, IDisposable
    {
        private readonly Random _random = new();
        private readonly Guid[] _sensorIds;
        private readonly ILogger<SensorSimulator> _logger;
        private volatile bool _isRunning;
        private readonly object _lock = new();
        private Task? _generationTask;
        private CancellationTokenSource? _cancellationTokenSource;

        public event EventHandler<SensorReading>? ReadingGenerated;

        public SensorSimulator(ILogger<SensorSimulator> logger)
        {
            _logger = logger;
            _sensorIds = Enumerable.Range(0, 100).Select(_ => Guid.NewGuid()).ToArray();
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            lock (_lock)
            {
                if (_isRunning) return Task.CompletedTask;
                
                _isRunning = true;
                _cancellationTokenSource = new CancellationTokenSource();
                _generationTask = Task.Run(() => GenerateReadingsLoop(_cancellationTokenSource.Token));
            }
            return Task.CompletedTask;
        }

        public async Task StopAsync()
        {
            lock (_lock)
            {
                if (!_isRunning) return;
                
                _isRunning = false;
                _cancellationTokenSource?.Cancel();
            }

            await (_generationTask ?? Task.CompletedTask);
        }

        private async Task GenerateReadingsLoop(CancellationToken cancellationToken)
        {
            const int targetReadingsPerSecond = 1000;
            const int delayMs = 1000 / targetReadingsPerSecond;

            try
            {
                while (!cancellationToken.IsCancellationRequested && _isRunning)
                {
                    var reading = new SensorReading(
                        _sensorIds[_random.Next(_sensorIds.Length)],
                        DateTime.UtcNow,
                        GenerateRealisticValue(),
                        false
                    );

                    ReadingGenerated?.Invoke(this, reading);
                    await Task.Delay(delayMs, cancellationToken);
                }
            }
            catch (OperationCanceledException) { }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in sensor reading generation loop");
            }
        }

        private double GenerateRealisticValue()
        {
            var baseValue = 50.0;
            var noise = (_random.NextDouble() - 0.5) * 20.0;
            var trend = Math.Sin(DateTime.UtcNow.TimeOfDay.TotalMinutes / 60.0 * Math.PI) * 10.0;
            
            return Math.Max(0, baseValue + noise + trend);
        }

        public void Dispose()
        {
            _cancellationTokenSource?.Cancel();
            _cancellationTokenSource?.Dispose();
        }
    }
}