using RealtimeAnalytics.Backend.Hubs;
using RealtimeAnalytics.Backend.Interfaces;
using RealtimeAnalytics.Backend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c => c.SwaggerDoc("v1", new() { Title = "DashboardTicks API", Version = "v1" }));
builder.Services.AddSignalR();

builder.Services.AddSingleton<IDataPersistenceService, DataPersistenceService>();
builder.Services.AddSingleton<IDataStore, DataStore>();
builder.Services.AddSingleton<ISensorSimulator, SensorSimulator>();
builder.Services.AddSingleton<IAggregationEngine, AggregationEngine>();
builder.Services.AddSingleton<IAnomalyDetector, AnomalyDetector>();

builder.Services.AddHostedService<DataCleanupService>();
builder.Services.AddHostedService<DataBroadcastService>();

builder.Services.AddCors(options => options.AddPolicy("AllowReactApp", policy =>
    policy.WithOrigins("http://localhost:3000").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "DashboardTicks API v1").RoutePrefix = string.Empty);

app.UseCors("AllowReactApp");
app.UseAuthorization();

app.MapControllers();
app.MapHub<DataStreamHub>("/datastream");

app.Run();
