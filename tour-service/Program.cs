using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using TourService.Clients;
using TourService.Data;
using TourService.Grpc;
using TourService.Middleware;
using TourService.Repositories;
using TourService.Saga;
using TourService.Services;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(8080, listenOptions =>
    {
        listenOptions.Protocols = HttpProtocols.Http1;
    });

    options.ListenAnyIP(50051, listenOptions =>
    {
        listenOptions.UseHttps("tourapp.pfx", "password");
        listenOptions.Protocols = HttpProtocols.Http2;
    });
});

var dbHost = Environment.GetEnvironmentVariable("DB_HOST") ?? "localhost";
var dbPort = Environment.GetEnvironmentVariable("DB_PORT") ?? "5432";
var dbName = Environment.GetEnvironmentVariable("DB_NAME") ?? "tourdb";
var dbUser = Environment.GetEnvironmentVariable("DB_USER") ?? "postgres";
var dbPassword = Environment.GetEnvironmentVariable("DB_PASSWORD") ?? "postgres";
var connectionString = $"Host={dbHost};Port={dbPort};Database={dbName};Username={dbUser};Password={dbPassword}";

builder.Services.AddDbContext<TourDbContext>(options =>
    options.UseNpgsql(connectionString)
           .ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning)));

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSingleton<IPurchaseClient, PurchaseGrpcClient>();

builder.Services.AddScoped<ITourRepository, TourRepository>();
builder.Services.AddScoped<ITourService, TourService.Services.TourService>();

builder.Services.AddGrpc();

builder.Services.AddGrpcClient<TourService.Grpc.UserService.UserServiceClient>(o =>
{
    o.Address = new Uri(Environment.GetEnvironmentVariable("STAKEHOLDERS_GRPC_ADDR") ?? "http://stakeholders-app:50051");
});
builder.Services.AddSingleton<IStakeholdersClient, StakeholdersGrpcClient>();
builder.Services.AddSingleton<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<ITourExecutionRepository, TourExecutionRepository>();
builder.Services.AddScoped<ITourExecutionService, TourExecutionService>();

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(ResourceBuilder.CreateDefault()
            .AddService("tour-service"))
        .AddAspNetCoreInstrumentation(o =>
        {
            o.RecordException = true;
        })
        .AddHttpClientInstrumentation()
        .AddGrpcClientInstrumentation()
        .AddOtlpExporter(o =>
        {
            o.Endpoint = new Uri(
                Environment.GetEnvironmentVariable("OTEL_EXPORTER_OTLP_ENDPOINT")
                ?? "http://jaeger:4317");
        }));

var natsHost = Environment.GetEnvironmentVariable("NATS_HOST") ?? "nats";
var natsPort = Environment.GetEnvironmentVariable("NATS_PORT") ?? "4222";
var natsUser = Environment.GetEnvironmentVariable("NATS_USER") ?? "nats";
var natsPassword = Environment.GetEnvironmentVariable("NATS_PASSWORD") ?? "nats";

builder.Services.AddSingleton<INatsBus>(new NatsBus(natsHost, natsPort, natsUser, natsPassword));
builder.Services.AddSingleton<IArchiveTourHandler, ArchiveTourHandler>();
builder.Services.AddSingleton<ArchiveTourOrchestrator>();
builder.Services.AddSingleton<IArchiveTourOrchestrator>(sp => sp.GetRequiredService<ArchiveTourOrchestrator>());

var app = builder.Build();

/*
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TourDbContext>();
    db.Database.Migrate();

    db.Database.ExecuteSqlRaw(@"
        CREATE TABLE IF NOT EXISTS ""Reviews"" (
            ""Id"" uuid NOT NULL,
            ""TourId"" uuid NOT NULL,
            ""TouristId"" text NOT NULL,
            ""TouristUsername"" text NOT NULL,
            ""TouristEmail"" text NOT NULL,
            ""Rating"" integer NOT NULL,
            ""Comment"" text NOT NULL,
            ""VisitedAt"" timestamp with time zone NOT NULL,
            ""CreatedAt"" timestamp with time zone NOT NULL,
            ""ImageUrls"" text[] NOT NULL,
            CONSTRAINT ""PK_Reviews"" PRIMARY KEY (""Id""),
            CONSTRAINT ""FK_Reviews_Tours_TourId"" FOREIGN KEY (""TourId"") REFERENCES ""Tours"" (""Id"") ON DELETE CASCADE
        );
    ");

    db.Database.ExecuteSqlRaw(@"
      CREATE TABLE IF NOT EXISTS ""TourExecutions"" (
          ""Id"" uuid NOT NULL,
          ""TourId"" uuid NOT NULL,
          ""TouristId"" text NOT NULL,
          ""Status"" text NOT NULL,
          ""StartedAt"" timestamp with time zone NOT NULL,
          ""CompletedAt"" timestamp with time zone,
          ""AbandonedAt"" timestamp with time zone,
          ""LastActivity"" timestamp with time zone NOT NULL,
          ""StartLatitude"" double precision NOT NULL,
          ""StartLongitude"" double precision NOT NULL,
          CONSTRAINT ""PK_TourExecutions"" PRIMARY KEY (""Id""),
          CONSTRAINT ""FK_TourExecutions_Tours_TourId"" FOREIGN KEY (""TourId"") REFERENCES ""Tours"" (""Id"") ON DELETE CASCADE
      );
   ");

    db.Database.ExecuteSqlRaw(@"
       CREATE TABLE IF NOT EXISTS ""CompletedKeyPoints"" (
           ""Id"" uuid NOT NULL,
           ""TourExecutionId"" uuid NOT NULL,
           ""KeyPointId"" uuid NOT NULL,
           ""CompletedAt"" timestamp with time zone NOT NULL,
           CONSTRAINT ""PK_CompletedKeyPoints"" PRIMARY KEY (""Id""),
           CONSTRAINT ""FK_CompletedKeyPoints_TourExecutions_TourExecutionId"" FOREIGN KEY (""TourExecutionId"") REFERENCES ""TourExecutions"" (""Id"") ON DELETE CASCADE
       );
    ");
}
*/

app.Services.GetRequiredService<ArchiveTourOrchestrator>().Start();

app.UseCors();
app.UseMiddleware<JwtMiddleware>();
app.MapGrpcService<TourServiceGrpc>();
app.MapControllers();

app.Run();
