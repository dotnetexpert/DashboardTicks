using Microsoft.AspNetCore.Mvc;
using RealtimeAnalytics.Backend.Interfaces;

namespace RealtimeAnalytics.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class DataExportController : ControllerBase
    {
        private readonly IDataPersistenceService _dataPersistenceService;
        private readonly ILogger<DataExportController> _logger;

        public DataExportController(IDataPersistenceService dataPersistenceService, ILogger<DataExportController> logger)
        {
            _dataPersistenceService = dataPersistenceService;
            _logger = logger;
        }

        [HttpGet("export")]
        public IActionResult ExportData([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var (start, end, error) = ValidateDateRange(startDate, endDate, DateTime.UtcNow.AddHours(-24));
            if (error != null) return BadRequest(error);

            try
            {
                var csvData = _dataPersistenceService.ExportDataAsCsv(start, end);
                var fileName = $"sensor_data_{start:yyyy-MM-dd}_{end:yyyy-MM-dd}.csv";
                return File(csvData, "text/csv", fileName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to export data");
                return StatusCode(500, "Failed to export data");
            }
        }

        [HttpGet("summary")]
        public IActionResult GetDataSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
        {
            var (start, end, error) = ValidateDateRange(startDate, endDate, DateTime.UtcNow.AddHours(-24));
            if (error != null) return BadRequest(error);

            try
            {
                var readings = _dataPersistenceService.GetReadingsForDateRange(start, end);
                var anomalies = _dataPersistenceService.GetAnomaliesForDateRange(start, end);

                var summary = new
                {
                    DateRange = new { Start = start, End = end },
                    TotalReadings = readings.Count,
                    TotalAnomalies = anomalies.Count,
                    AverageValue = readings.Any() ? readings.Average(r => r.Value) : 0,
                    MinValue = readings.Any() ? readings.Min(r => r.Value) : 0,
                    MaxValue = readings.Any() ? readings.Max(r => r.Value) : 0,
                    AnomalyRate = readings.Any() ? (double)anomalies.Count / readings.Count * 100 : 0,
                    UniqueSensors = readings.Select(r => r.SensorId).Distinct().Count()
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get data summary");
                return StatusCode(500, "Failed to get data summary");
            }
        }

        private static (DateTime start, DateTime end, string? error) ValidateDateRange(DateTime? startDate, DateTime? endDate, DateTime defaultStart)
        {
            var start = startDate ?? defaultStart;
            var end = endDate ?? DateTime.UtcNow;

            if (start > end)
                return (start, end, "Start date must be before end date");

            if ((end - start).TotalDays > 30)
                return (start, end, "Date range cannot exceed 30 days");

            return (start, end, null);
        }
    }
}
