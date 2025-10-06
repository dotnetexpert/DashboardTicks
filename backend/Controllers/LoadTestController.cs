using Microsoft.AspNetCore.Mvc;
using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;
using System.Diagnostics;

namespace RealtimeAnalytics.Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public sealed class LoadTestController : ControllerBase
    {
        private readonly IDataStore _dataStore;
        private readonly ISensorSimulator _sensorSimulator;
        private readonly IAggregationEngine _aggregationEngine;
        private readonly IAnomalyDetector _anomalyDetector;
        private readonly ILogger<LoadTestController> _logger;

        public LoadTestController(
            IDataStore dataStore,
            ISensorSimulator sensorSimulator,
            IAggregationEngine aggregationEngine,
            IAnomalyDetector anomalyDetector,
            ILogger<LoadTestController> logger)
        {
            _dataStore = dataStore;
            _sensorSimulator = sensorSimulator;
            _aggregationEngine = aggregationEngine;
            _anomalyDetector = anomalyDetector;
            _logger = logger;
        }

        [HttpPost("run")]
        public async Task<ActionResult<LoadTestResult>> RunLoadTest([FromBody] LoadTestRequest request)
        {
            if (request.DurationSeconds <= 0 || request.DurationSeconds > 300)
                return BadRequest("Duration must be between 1 and 300 seconds");

            if (request.TargetReadingsPerSecond <= 0 || request.TargetReadingsPerSecond > 5000)
                return BadRequest("Target readings per second must be between 1 and 5000");

            try
            {
                var result = await ExecuteLoadTest(request.DurationSeconds, request.TargetReadingsPerSecond);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing load test");
                return StatusCode(500, "Load test execution failed");
            }
        }

        [HttpGet("metrics")]
        public ActionResult<PerformanceMetrics> GetCurrentMetrics()
        {
            try
            {
                var process = Process.GetCurrentProcess();
                var memoryInfo = GC.GetTotalMemory(false);
                
                var metrics = new PerformanceMetrics
                {
                    Timestamp = DateTime.UtcNow,
                    DataStoreCount = _dataStore.Count,
                    MemoryUsageMB = Math.Round(memoryInfo / (1024.0 * 1024.0), 2),
                    WorkingSetMB = Math.Round(process.WorkingSet64 / (1024.0 * 1024.0), 2),
                    ProcessorCount = Environment.ProcessorCount,
                    ThreadCount = process.Threads.Count,
                    GcGen0Collections = GC.CollectionCount(0),
                    GcGen1Collections = GC.CollectionCount(1),
                    GcGen2Collections = GC.CollectionCount(2)
                };

                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving performance metrics");
                return StatusCode(500, "Failed to retrieve metrics");
            }
        }

        private async Task<LoadTestResult> ExecuteLoadTest(int durationSeconds, int targetReadingsPerSecond)
        {
            var result = new LoadTestResult
            {
                TestDurationSeconds = durationSeconds,
                TargetReadingsPerSecond = targetReadingsPerSecond,
                StartTime = DateTime.UtcNow
            };

            var readingsGenerated = 0;
            var anomaliesDetected = 0;
            var processingTimes = new List<double>();
            var memoryUsages = new List<double>();
            var startMemory = GC.GetTotalMemory(false);

            _anomalyDetector.AnomalyDetected += (_, _) => Interlocked.Increment(ref anomaliesDetected);

            var stopwatch = Stopwatch.StartNew();
            var delayMs = Math.Max(1, 1000 / targetReadingsPerSecond);

            try
            {
                while (stopwatch.Elapsed.TotalSeconds < durationSeconds)
                {
                    var iterationStart = Stopwatch.GetTimestamp();
                    
                    for (int i = 0; i < targetReadingsPerSecond && stopwatch.Elapsed.TotalSeconds < durationSeconds; i++)
                    {
                        var reading = GenerateTestReading();
                        var processingStart = Stopwatch.GetTimestamp();
                        
                        var isAnomaly = _anomalyDetector.IsAnomaly(reading);
                        _dataStore.AddReading(reading);
                        
                        var processingTime = (Stopwatch.GetTimestamp() - processingStart) / (Stopwatch.Frequency / 1000.0);
                        processingTimes.Add(processingTime);
                        
                        Interlocked.Increment(ref readingsGenerated);
                        
                        if (delayMs > 0)
                            await Task.Delay(delayMs);
                    }

                    var currentMemory = GC.GetTotalMemory(false);
                    var memoryUsageMB = (currentMemory - startMemory) / (1024.0 * 1024.0);
                    memoryUsages.Add(memoryUsageMB);

                    await Task.Delay(1000);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during load test execution");
                result.Errors.Add($"Load test error: {ex.Message}");
            }
            finally
            {
                stopwatch.Stop();
            }

            result.EndTime = DateTime.UtcNow;
            result.ActualReadingsPerSecond = readingsGenerated / stopwatch.Elapsed.TotalSeconds;
            result.TotalReadingsGenerated = readingsGenerated;
            result.TotalAnomaliesDetected = anomaliesDetected;
            result.AverageProcessingTimeMs = processingTimes.Any() ? processingTimes.Average() : 0;
            result.MaxProcessingTimeMs = processingTimes.Any() ? processingTimes.Max() : 0;
            result.P95ProcessingTimeMs = CalculatePercentile(processingTimes, 95);
            result.P99ProcessingTimeMs = CalculatePercentile(processingTimes, 99);
            result.PeakMemoryUsageMB = memoryUsages.Any() ? memoryUsages.Max() : 0;
            result.AverageMemoryUsageMB = memoryUsages.Any() ? memoryUsages.Average() : 0;
            result.Success = result.Errors.Count == 0;

            return result;
        }

        private static SensorReading GenerateTestReading()
        {
            var random = new Random();
            var value = 50.0 + (random.NextDouble() - 0.5) * 100.0;
            
            return new SensorReading(
                Guid.NewGuid(),
                DateTime.UtcNow,
                value,
                false
            );
        }

        private static double CalculatePercentile(List<double> values, double percentile)
        {
            if (!values.Any()) return 0;
            
            var sortedValues = values.OrderBy(x => x).ToArray();
            var index = (percentile / 100.0) * (sortedValues.Length - 1);
            var lowerIndex = (int)Math.Floor(index);
            var upperIndex = (int)Math.Ceiling(index);

            return lowerIndex == upperIndex 
                ? sortedValues[lowerIndex] 
                : sortedValues[lowerIndex] * (1 - (index - lowerIndex)) + sortedValues[upperIndex] * (index - lowerIndex);
        }
    }

    public record LoadTestRequest(int DurationSeconds, int TargetReadingsPerSecond);

    public record LoadTestResult
    {
        public int TestDurationSeconds { get; init; }
        public int TargetReadingsPerSecond { get; init; }
        public DateTime StartTime { get; init; }
        public DateTime EndTime { get; init; }
        public double ActualReadingsPerSecond { get; init; }
        public int TotalReadingsGenerated { get; init; }
        public int TotalAnomaliesDetected { get; init; }
        public double AverageProcessingTimeMs { get; init; }
        public double MaxProcessingTimeMs { get; init; }
        public double P95ProcessingTimeMs { get; init; }
        public double P99ProcessingTimeMs { get; init; }
        public double PeakMemoryUsageMB { get; init; }
        public double AverageMemoryUsageMB { get; init; }
        public bool Success { get; init; }
        public List<string> Errors { get; init; } = new();
    }

    public record PerformanceMetrics
    {
        public DateTime Timestamp { get; init; }
        public int DataStoreCount { get; init; }
        public double MemoryUsageMB { get; init; }
        public double WorkingSetMB { get; init; }
        public int ProcessorCount { get; init; }
        public int ThreadCount { get; init; }
        public int GcGen0Collections { get; init; }
        public int GcGen1Collections { get; init; }
        public int GcGen2Collections { get; init; }
    }
}
