using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using AlcancIA.Application.Ai;
using AlcancIA.Infrastructure;
using System.Security.Cryptography;
using AlcancIA.Api;
using AlcancIA.Api.Auth;
using AlcancIA.Api.Sync;
using AlcancIA.Domain.Accounts;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Environment variables like Ai__ApiKey / Ai__Model override appsettings (§75).
builder.Configuration.AddEnvironmentVariables();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 64 * 1024);

// Serialize enums as camelCase strings ("low"/"medium"/"high"), not integers.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(
        new JsonStringEnumConverter(System.Text.Json.JsonNamingPolicy.CamelCase));
});

builder.Services.AddOpenApi();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<IVerificationMailer, SmtpVerificationMailer>();
builder.Services.AddSingleton<EmailVerification>();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddPersistence(builder.Configuration);

// Accounts: PBKDF2 password hashes, JWT access tokens, rotating refresh tokens.
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.SectionName));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddSingleton<VerificationTickets>();
builder.Services.AddHttpClient<IGoogleTokenVerifier, GoogleTokenVerifier>(c => c.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<AuthOptions>>((jwt, auth) =>
    {
        var o = auth.Value;
        jwt.MapInboundClaims = false;
        jwt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = o.Issuer,
            ValidAudience = o.Audience,
            IssuerSigningKey = o.SigningKey.Length >= 32 ? o.Key() : null,
            ValidateIssuerSigningKey = true,
            ClockSkew = TimeSpan.FromSeconds(30),
        };
        jwt.Events = new JwtBearerEvents
        {
            // A password reset bumps the stamp: older access tokens stop working at once.
            OnTokenValidated = async ctx =>
            {
                var db = ctx.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var id = AccountEndpoints.UserId(ctx.Principal!);
                var stamp = ctx.Principal!.FindFirst(TokenService.StampClaim)?.Value;
                var user = id is null ? null : await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == id);
                if (user is null || user.SecurityStamp.ToString() != stamp) ctx.Fail("stale session");
            },
        };
    });

// CORS for the mobile app / local dev. Tighten origins for production.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ??
    ["http://localhost:8081", "http://localhost:19006"];
builder.Services.AddCors(options =>
{
    options.AddPolicy("app", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

// Basic rate limiting to protect the AI endpoint (§66).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("email", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(10), PermitLimit = 20, QueueLimit = 0 }));
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(5), PermitLimit = 30, QueueLimit = 0 }));
    options.AddPolicy("sync", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { Window = TimeSpan.FromMinutes(1), PermitLimit = 60, QueueLimit = 0 }));
    options.AddPolicy("ai", context => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 20,
            QueueLimit = 0,
        }));
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("app");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapAccountEndpoints();
app.MapSyncEndpoints();

app.MapPost("/api/email/request", async (EmailCodeRequest request, EmailVerification verification, AppDbContext db, CancellationToken ct) =>
{
    var email = request.Email?.Trim().ToLowerInvariant();
    if (!EmailVerification.Valid(email, request.Purpose))
        return Results.BadRequest(new { error = "Revisa el correo electrónico." });
    if (request.Purpose == "register" && await db.Users.AnyAsync(u => u.Email == email, ct))
        return Results.Json(new { error = "Ya existe una cuenta con ese correo. Inicia sesión." }, statusCode: 409);
    // Recovery never reveals whether an address is registered: same answer, no email sent.
    if (request.Purpose == "recover" && !await db.Users.AnyAsync(u => u.Email == email && u.Provider == "password", ct))
        return Results.Ok(new { challengeId = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)), expiresInSeconds = 600, resendAfterSeconds = 60 });
    var result = await verification.Request(email!, request.Purpose!, ct);
    return Results.Json(result.Body, statusCode: result.Status);
}).RequireRateLimiting("email");

app.MapPost("/api/email/verify", (EmailCodeVerify request, EmailVerification verification, VerificationTickets tickets) =>
{
    if (request.ChallengeId is not { Length: 64 } || request.Email is null || request.Purpose is null || request.Code is not { Length: 6 }
        || !verification.Verify(request.ChallengeId, request.Email, request.Purpose, request.Code))
        return Results.BadRequest(new { error = "El código no es válido o venció. Revisa el correo o solicita otro." });
    // The ticket is what register / reset-password accept as proof of the code.
    return Results.Ok(new { verified = true, ticket = tickets.Issue(EmailVerification.Normalize(request.Email), request.Purpose) });
}).RequireRateLimiting("email");

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

    var validationError = ValidateRequest(request);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    var response = await chat.AskAsync(request, ct);
    return Results.Ok(response);
})
    .RequireRateLimiting("ai")
    .WithName("AiChat");

app.Run();

static string? ValidateRequest(ChatRequest request)
{
    var context = request.Context;
    if (context.Currency is not ("PEN" or "USD")) return "La moneda no es compatible.";
    if (context.SafeToSpend is < 0 or > 1_000_000_000 || context.MonthlyIncome is < 0 or > 1_000_000_000)
        return "Los montos del contexto están fuera del rango permitido.";
    if (context.UpcomingBills.Count > 20 || context.Goals.Count > 20 || context.CategorySummary.Count > 30)
        return "El contexto contiene demasiados elementos.";
    if (context.UpcomingBills.Any(item => item.Amount is < 0 or > 1_000_000_000 || item.InDays is < -365 or > 3650 || item.Label.Length > 120))
        return "Hay una obligación inválida en el contexto.";
    if (context.Goals.Any(item => item.Saved is < 0 or > 1_000_000_000 || item.Target is <= 0 or > 1_000_000_000 || item.Saved > item.Target || item.Name.Length > 120))
        return "Hay una meta inválida en el contexto.";
    if (context.CategorySummary.Any(item => item.Amount is < 0 or > 1_000_000_000 || item.Category.Length > 80))
        return "Hay una categoría inválida en el contexto.";
    return null;
}

// Exposed for WebApplicationFactory integration tests.
public partial class Program;
