using Microsoft.AspNetCore.Mvc;
using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;

namespace RealtimeAnalytics.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class ConfigurationController : ControllerBase
    {
        private readonly IAnomalyDetector _anomalyDetector;
        private readonly ILogger<ConfigurationController> _logger;

        public ConfigurationController(IAnomalyDetector anomalyDetector, ILogger<ConfigurationController> logger)
        {
            _anomalyDetector = anomalyDetector;
            _logger = logger;
        }

        [HttpPost("thresholds")]
        public ActionResult UpdateThresholds([FromBody] AnomalyThresholds thresholds)
        {
            ArgumentNullException.ThrowIfNull(thresholds);

            try
            {
                _anomalyDetector.UpdateThresholds(thresholds);
                return Ok(new { message = "Thresholds updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating anomaly thresholds");
                return StatusCode(500, "Internal server error");
            }
        }
    }
}