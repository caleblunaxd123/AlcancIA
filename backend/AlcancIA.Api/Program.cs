using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using AlcancIA.Application.Ai;
using AlcancIA.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Environment variables like Ai__ApiKey / Ai__Model override appsettings (§75).
builder.Configuration.AddEnvironmentVariables();

// Serialize enums as camelCase strings ("low"/"medium"/"high"), not integers.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(
        new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase));
});

builder.Services.AddOpenApi();
builder.Services.AddInfrastructure(builder.Configuration);

// CORS for the mobile app / local dev. Tighten origins for production.
builder.Services.AddCors(options =>
{
    options.AddPolicy("app", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

// Basic rate limiting to protect the AI endpoint (§66).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("ai", limiter =>
    {
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.PermitLimit = 20;
        limiter.QueueLimit = 0;
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("app");
app.UseRateLimiter();

app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "AlcancIA.Api" }))
    .WithName("Health");

app.MapPost("/api/ai/chat", async (ChatRequest request, IChatService chat, CancellationToken ct) =>
{
    if (string.IsNullOrWhiteSpace(request.Question))
    {
        return Results.BadRequest(new { error = "La pregunta no puede estar vacía." });
    }

    if (request.Question.Length > 500)
    {
        return Results.BadRequest(new { error = "La pregunta es demasiado larga." });
    }

    var response = await chat.AskAsync(request, ct);
    return Results.Ok(response);
})
    .RequireRateLimiting("ai")
    .WithName("AiChat");

app.Run();

// Exposed for WebApplicationFactory integration tests.
public partial class Program;
