using Microsoft.AspNetCore.Mvc;
using RealtimeAnalytics.Backend.Interfaces;

namespace RealtimeAnalytics.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class PerformanceController : ControllerBase
    {
        private readonly IDataStore _dataStore;
        private readonly ILogger<PerformanceController> _logger;

        public PerformanceController(IDataStore dataStore, ILogger<PerformanceController> logger)
        {
            _dataStore = dataStore;
            _logger = logger;
        }

        [HttpGet("metrics")]
        public ActionResult<object> GetPerformanceMetrics()
        {
            try
            {
                var metrics = new
                {
                    DataStoreCount = _dataStore.Count,
                    MemoryUsageMB = Math.Round(GC.GetTotalMemory(false) / (1024.0 * 1024.0), 2),
                    ProcessorCount = Environment.ProcessorCount
                };

                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving performance metrics");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}