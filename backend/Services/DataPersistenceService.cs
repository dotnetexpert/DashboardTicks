using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Models;
using System.Text.Json;

namespace RealtimeAnalytics.Backend.Services
{
    public sealed class DataPersistenceService : IDataPersistenceService
    {
        private readonly string _dataDirectory;
        private readonly ILogger<DataPersistenceService> _logger;
        private readonly Timer _cleanupTimer;
        private readonly object _lock = new();

        public DataPersistenceService(ILogger<DataPersistenceService> logger)
        {
            _logger = logger;
            _dataDirectory = Path.Combine(Directory.GetCurrentDirectory(), "data");
            Directory.CreateDirectory(_dataDirectory);
            _cleanupTimer = new Timer(PerformCleanup, null, TimeSpan.FromHours(1), TimeSpan.FromHours(1));
        }

        public void SaveSensorReading(SensorReading reading)
        {
            SaveToFile($"sensor_readings_{DateTime.UtcNow:yyyy-MM-dd}.json", reading, () => LoadReadingsForDate(DateTime.UtcNow.ToString("yyyy-MM-dd")), "Failed to save sensor reading");
        }

        public void SaveAnomalyEvent(AnomalyEvent anomaly)
        {
            SaveToFile($"anomalies_{DateTime.UtcNow:yyyy-MM-dd}.json", anomaly, () => LoadAnomaliesForDate(DateTime.UtcNow.ToString("yyyy-MM-dd")), "Failed to save anomaly event");
        }

        private void SaveToFile<T>(string fileName, T item, Func<List<T>> loader, string errorMessage)
        {
            try
            {
                var filePath = Path.Combine(_dataDirectory, fileName);
                
                lock (_lock)
                {
                    var items = loader();
                    items.Add(item);
                    
                    var json = JsonSerializer.Serialize(items, new JsonSerializerOptions { WriteIndented = true });
                    File.WriteAllText(filePath, json);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, errorMessage);
            }
        }

        public List<SensorReading> GetReadingsForDateRange(DateTime startDate, DateTime endDate)
        {
            var allReadings = new List<SensorReading>();
            
            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                var dateKey = date.ToString("yyyy-MM-dd");
                allReadings.AddRange(LoadReadingsForDate(dateKey));
            }
            
            return allReadings.Where(r => r.Timestamp >= startDate && r.Timestamp <= endDate).ToList();
        }

        public List<AnomalyEvent> GetAnomaliesForDateRange(DateTime startDate, DateTime endDate)
        {
            var allAnomalies = new List<AnomalyEvent>();
            
            for (var date = startDate.Date; date <= endDate.Date; date = date.AddDays(1))
            {
                var dateKey = date.ToString("yyyy-MM-dd");
                allAnomalies.AddRange(LoadAnomaliesForDate(dateKey));
            }
            
            return allAnomalies.Where(a => a.DetectedAt >= startDate && a.DetectedAt <= endDate).ToList();
        }

        public byte[] ExportDataAsCsv(DateTime startDate, DateTime endDate)
        {
            var readings = GetReadingsForDateRange(startDate, endDate);
            var anomalies = GetAnomaliesForDateRange(startDate, endDate);
            
            var csv = new List<string>();
            csv.Add("Type,Timestamp,Value,SensorId,Reason,IsAnomaly");
            
            foreach (var reading in readings)
            {
                var anomaly = anomalies.FirstOrDefault(a => a.Reading.SensorId == reading.SensorId && 
                                                          Math.Abs((a.Reading.Timestamp - reading.Timestamp).TotalSeconds) < 1);
                csv.Add($"Reading,{reading.Timestamp:yyyy-MM-dd HH:mm:ss.fff},{reading.Value},{reading.SensorId},{(anomaly?.Reason ?? "")},{reading.IsAnomaly}");
            }
            
            return System.Text.Encoding.UTF8.GetBytes(string.Join("\n", csv));
        }

        private List<SensorReading> LoadReadingsForDate(string dateKey)
        {
            var filePath = Path.Combine(_dataDirectory, $"sensor_readings_{dateKey}.json");
            
            if (!File.Exists(filePath))
            {
                return new List<SensorReading>();
            }
            
            try
            {
                var json = File.ReadAllText(filePath);
                return JsonSerializer.Deserialize<List<SensorReading>>(json) ?? new List<SensorReading>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load readings for date {DateKey}", dateKey);
                return new List<SensorReading>();
            }
        }

        private List<AnomalyEvent> LoadAnomaliesForDate(string dateKey)
        {
            var filePath = Path.Combine(_dataDirectory, $"anomalies_{dateKey}.json");
            
            if (!File.Exists(filePath))
            {
                return new List<AnomalyEvent>();
            }
            
            try
            {
                var json = File.ReadAllText(filePath);
                return JsonSerializer.Deserialize<List<AnomalyEvent>>(json) ?? new List<AnomalyEvent>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load anomalies for date {DateKey}", dateKey);
                return new List<AnomalyEvent>();
            }
        }

        private void PerformCleanup(object? state)
        {
            try
            {
                var cutoffDate = DateTime.UtcNow.AddDays(-1);
                var files = Directory.GetFiles(_dataDirectory, "*.json");
                
                foreach (var file in files)
                {
                    var fileInfo = new FileInfo(file);
                    if (fileInfo.LastWriteTime < cutoffDate)
                    {
                        File.Delete(file);
                        _logger.LogInformation("Deleted old data file: {FileName}", fileInfo.Name);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to perform data cleanup");
            }
        }

        public void Dispose()
        {
            _cleanupTimer?.Dispose();
        }
    }
}
