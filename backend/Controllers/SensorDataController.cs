using Microsoft.AspNetCore.Mvc;
using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class SensorDataController : ControllerBase
    {
        private readonly IDataStore _dataStore;
        private readonly IAggregationEngine _aggregationEngine;
        private readonly ILogger<SensorDataController> _logger;

        public SensorDataController(IDataStore dataStore, IAggregationEngine aggregationEngine, ILogger<SensorDataController> logger)
        {
            _dataStore = dataStore;
            _aggregationEngine = aggregationEngine;
            _logger = logger;
        }

        [HttpGet("recent")]
        public ActionResult<IEnumerable<SensorReading>> GetRecentReadings([FromQuery] int count = 1000)
        {
            if (count is <= 0 or > 10_000)
                return BadRequest("Count must be between 1 and 10000");

            return ExecuteWithErrorHandling(() => _dataStore.GetRecentReadings(count), "Error retrieving recent readings");
        }

        [HttpGet("since")]
        public ActionResult<IEnumerable<SensorReading>> GetReadingsSince([FromQuery] DateTime since)
        {
            return ExecuteWithErrorHandling(() => _dataStore.GetReadingsSince(since), $"Error retrieving readings since {since}");
        }

        [HttpGet("aggregations")]
        public ActionResult<AggregationResult> GetCurrentAggregations()
        {
            return ExecuteWithErrorHandling(() => _aggregationEngine.GetCurrentAggregations(), "Error retrieving current aggregations");
        }

        [HttpGet("historical")]
        public ActionResult<IEnumerable<SensorReading>> GetHistoricalReadings([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddHours(-1);
            var end = endDate ?? DateTime.UtcNow;

            if (start > end)
                return BadRequest("Start date must be before end date");

            if ((end - start).TotalDays > 30)
                return BadRequest("Date range cannot exceed 30 days");

            return ExecuteWithErrorHandling(() => _dataStore.GetReadingsSince(start).Where(r => r.Timestamp <= end), "Error retrieving historical readings");
        }

        private ActionResult<T> ExecuteWithErrorHandling<T>(Func<T> operation, string errorMessage)
        {
            try
            {
                return Ok(operation());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, errorMessage);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}