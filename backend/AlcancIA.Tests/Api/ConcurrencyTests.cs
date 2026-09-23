using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AlcancIA.Tests.Api;

/// <summary>Runs only against PostgreSQL (ALCANCIA_TEST_PG): in-memory SQLite shares one connection and cannot race.</summary>
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("ALCANCIA_TEST_PG") is null) Skip = "Needs ALCANCIA_TEST_PG (docker compose up -d db).";
    }
}

/// <summary>Races that only a real database can arbitrate.</summary>
public class ConcurrencyTests
{
    [PostgresFact]
    public async Task Two_devices_pushing_the_same_base_version_at_once_never_both_win()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        ApiFactory.Bearer(client, await factory.RegisterAsync(client));
        await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = new { n = 0 } });

        var pushes = Enumerable.Range(1, 8).Select(i =>
            client.PutAsJsonAsync("/api/sync", new { baseVersion = 1, clientUpdatedAt = DateTimeOffset.UtcNow, data = new { n = i } }));
        var results = await Task.WhenAll(pushes);

        Assert.Equal(1, results.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.All(results.Where(r => r.StatusCode != HttpStatusCode.OK), r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
        var final = await (await client.GetAsync("/api/sync")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, final.GetProperty("version").GetInt64());
    }

    [PostgresFact]
    public async Task First_ever_push_from_two_devices_at_once_creates_one_document()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        ApiFactory.Bearer(client, await factory.RegisterAsync(client));

        var results = await Task.WhenAll(Enumerable.Range(1, 6).Select(i =>
            client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = new { n = i } })));

        Assert.Equal(1, results.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.All(results.Where(r => r.StatusCode != HttpStatusCode.OK), r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
    }

    [PostgresFact]
    public async Task The_same_refresh_token_used_twice_at_once_yields_at_most_one_session()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var refresh = (await factory.RegisterAsync(client)).GetProperty("refreshToken").GetString();

        var results = await Task.WhenAll(Enumerable.Range(1, 5).Select(_ =>
            client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refresh })));

        Assert.True(results.Count(r => r.StatusCode == HttpStatusCode.OK) <= 1);
    }
}
