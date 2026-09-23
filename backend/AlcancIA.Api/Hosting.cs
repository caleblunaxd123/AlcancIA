using System.Text;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;

namespace AlcancIA.Api;

/// <summary>
/// Production hosting concerns kept out of Program.cs: configuration guards,
/// reverse-proxy headers, HTTPS/HSTS, safe error responses, security headers,
/// readiness probe and optional migrate-on-start.
/// </summary>
public static class Hosting
{
    private static bool IsLocal(IHostEnvironment env) => env.IsDevelopment() || env.IsEnvironment("Testing");

    /// <summary>
    /// Fails fast with a clear message instead of starting half-configured.
    /// Only checks presence/shape, never logs the values.
    /// </summary>
    public static void ValidateProductionConfiguration(this WebApplicationBuilder builder)
    {
        if (IsLocal(builder.Environment)) return;
        var config = builder.Configuration;
        var problems = new List<string>();
        if (string.IsNullOrWhiteSpace(config.GetConnectionString("Database")))
            problems.Add("ConnectionStrings__Database");
        if (Encoding.UTF8.GetByteCount(config["Auth:SigningKey"] ?? "") < 32)
            problems.Add("Auth__SigningKey (32+ bytes)");
        if (!IsBase64Of32Bytes(config["DataProtection:MasterKey"]))
            problems.Add("DataProtection__MasterKey (base64, 32 bytes)");
        if (string.IsNullOrWhiteSpace(config["Email:Username"]) || string.IsNullOrWhiteSpace(config["Email:Password"]))
            problems.Add("Email__Username / Email__Password");
        if (problems.Count > 0)
            throw new InvalidOperationException($"Missing production configuration: {string.Join(", ", problems)}.");
    }

    private static bool IsBase64Of32Bytes(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var buffer = new byte[64];
        return Convert.TryFromBase64String(value, buffer, out var written) && written == 32;
    }

    public static void AddHosting(this IServiceCollection services, IConfiguration config)
    {
        // Behind a TLS-terminating proxy (Railway, Render, Fly, Azure…): trust ONE hop
        // so rate limits use the real client IP and HTTPS redirects see the real scheme.
        // Off by default: trusting forwarded headers without a proxy lets clients spoof IPs.
        if (config.GetValue("Hosting:BehindProxy", false))
        {
            services.Configure<ForwardedHeadersOptions>(o =>
            {
                o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                o.ForwardLimit = 1;
                o.KnownNetworks.Clear();
                o.KnownProxies.Clear();
            });
        }
        services.AddHsts(o =>
        {
            o.MaxAge = TimeSpan.FromDays(365);
            o.IncludeSubDomains = true;
        });
    }

    public static void UseHosting(this WebApplication app)
    {
        if (app.Configuration.GetValue("Hosting:BehindProxy", false)) app.UseForwardedHeaders();

        if (!IsLocal(app.Environment))
        {
            // Never leak stack traces or internals: one generic JSON error.
            app.UseExceptionHandler(errors => errors.Run(async context =>
            {
                var feature = context.Features.Get<IExceptionHandlerFeature>();
                app.Logger.LogError(feature?.Error, "Unhandled error on {Path}", context.Request.Path);
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsJsonAsync(new { error = "Algo salió mal. Inténtalo de nuevo en unos minutos." });
            }));
            app.UseHsts();
            app.UseHttpsRedirection();
        }

        app.Use(async (context, next) =>
        {
            var headers = context.Response.Headers;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["X-Frame-Options"] = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            headers["Cache-Control"] = "no-store"; // financial responses must never be cached
            await next();
        });
    }

    /// <summary>Liveness (/health) stays trivial; readiness also checks the database.</summary>
    public static void MapReadiness(this WebApplication app)
    {
        app.MapGet("/health/ready", async (AppDbContext db, CancellationToken ct) =>
            await db.Database.CanConnectAsync(ct)
                ? Results.Ok(new { status = "ready" })
                : Results.Json(new { status = "database-unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable));
    }

    /// <summary>Database:MigrateOnStartup=true applies pending EF migrations before serving.</summary>
    public static async Task MigrateIfConfiguredAsync(this WebApplication app)
    {
        if (!app.Configuration.GetValue("Database:MigrateOnStartup", false)) return;
        using var scope = app.Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }
}
