using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using AlcancIA.Api;
using AlcancIA.Api.Auth;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Npgsql;

namespace AlcancIA.Tests.Api;

/// <summary>
/// The real API over a fresh database per factory, with a capturing mailer and
/// a scriptable Google verifier. Default: in-memory SQLite (no Docker needed).
/// With ALCANCIA_TEST_PG set to a PostgreSQL connection string, each factory
/// creates a throwaway database, applies the real EF migrations and drops it.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private static readonly string? PostgresBase = Environment.GetEnvironmentVariable("ALCANCIA_TEST_PG");
    private readonly SqliteConnection connection = new("DataSource=:memory:");
    private readonly string? postgresDb = PostgresBase is null ? null : $"alcancia_test_{Guid.NewGuid():N}";
    private string PostgresConnection => new NpgsqlConnectionStringBuilder(PostgresBase) { Database = postgresDb }.ConnectionString;
    public CapturingMailer Mailer { get; } = new();
    public FakeGoogle Google { get; } = new();

    public sealed class CapturingMailer : IVerificationMailer
    {
        public Dictionary<string, string> LastCodeByEmail { get; } = [];
        public Task SendAsync(string email, string code, CancellationToken ct) { LastCodeByEmail[email] = code; return Task.CompletedTask; }
    }

    public sealed class FakeGoogle : IGoogleTokenVerifier
    {
        public Dictionary<string, GoogleIdentity> Tokens { get; } = [];
        public Task<GoogleIdentity?> VerifyAsync(string accessToken, CancellationToken ct) =>
            Task.FromResult(Tokens.TryGetValue(accessToken, out var id) ? id : null);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        if (postgresDb is null) connection.Open();
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration(c => c.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Auth:SigningKey"] = "test-signing-key-that-is-long-enough-1234567890",
            ["ConnectionStrings:Database"] = "",
        }));
        builder.ConfigureServices(s =>
        {
            s.RemoveAll<DbContextOptions<AppDbContext>>();
            if (postgresDb is null) s.AddDbContext<AppDbContext>(o => o.UseSqlite(connection));
            else s.AddDbContext<AppDbContext>(o => o.UseNpgsql(PostgresConnection));
            s.RemoveAll<IVerificationMailer>();
            s.AddSingleton<IVerificationMailer>(Mailer);
            s.RemoveAll<IGoogleTokenVerifier>();
            s.AddSingleton<IGoogleTokenVerifier>(Google);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>().Database;
        if (postgresDb is null) db.EnsureCreated();
        else db.Migrate(); // exercises the real migrations (creates the database too)
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (!disposing) return;
        connection.Dispose();
        if (postgresDb is null) return;
        NpgsqlConnection.ClearAllPools();
        using var admin = new NpgsqlConnection(new NpgsqlConnectionStringBuilder(PostgresBase) { Database = "postgres" }.ConnectionString);
        admin.Open();
        using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{postgresDb}\" WITH (FORCE)", admin);
        drop.ExecuteNonQuery();
    }

    /// <summary>Runs request code → verify for an email and returns the ticket.</summary>
    public async Task<string> TicketAsync(HttpClient client, string email, string purpose)
    {
        var requested = await client.PostAsJsonAsync("/api/email/request", new { email, purpose });
        requested.EnsureSuccessStatusCode();
        var challengeId = (await requested.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("challengeId").GetString();
        var verified = await client.PostAsJsonAsync("/api/email/verify", new { challengeId, email, purpose, code = Mailer.LastCodeByEmail[email] });
        verified.EnsureSuccessStatusCode();
        return (await verified.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("ticket").GetString()!;
    }

    public async Task<JsonElement> RegisterAsync(HttpClient client, string email = "ana@gmail.com", string password = "Ahorro2026")
    {
        var ticket = await TicketAsync(client, email, "register");
        var response = await client.PostAsJsonAsync("/api/auth/register", new { name = "Ana", email, password, ticket });
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    public static void Bearer(HttpClient client, JsonElement session) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());
}
