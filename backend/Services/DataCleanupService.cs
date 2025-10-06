using RealtimeAnalytics.Backend.Interfaces;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class DataCleanupService : BackgroundService
    {
        private readonly IDataStore _dataStore;
        private readonly ILogger<DataCleanupService> _logger;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromMinutes(1);

        public DataCleanupService(IDataStore dataStore, ILogger<DataCleanupService> logger)
        {
            _dataStore = dataStore;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _dataStore.PurgeExpiredData();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred during data cleanup");
                }

                await Task.Delay(_cleanupInterval, stoppingToken);
            }
        }
    }
}