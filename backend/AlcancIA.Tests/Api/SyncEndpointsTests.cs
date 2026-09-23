using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AlcancIA.Tests.Api;

public class SyncEndpointsTests
{
    private static object Doc(long balance) => new { financial = new { currentBalance = new { minor = balance, currency = "PEN" } } };

    [Fact]
    public async Task Requires_a_session()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/sync")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = Doc(1) })).StatusCode);
    }

    [Fact]
    public async Task Push_then_pull_round_trips_and_versions_increase()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        ApiFactory.Bearer(client, await factory.RegisterAsync(client));

        Assert.Equal(HttpStatusCode.NoContent, (await client.GetAsync("/api/sync")).StatusCode);

        var first = await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = Doc(150000) });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(1, (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("version").GetInt64());

        var second = await client.PutAsJsonAsync("/api/sync", new { baseVersion = 1, clientUpdatedAt = DateTimeOffset.UtcNow, data = Doc(147500) });
        Assert.Equal(2, (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("version").GetInt64());

        var pulled = await (await client.GetAsync("/api/sync")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, pulled.GetProperty("version").GetInt64());
        Assert.Equal(147500, pulled.GetProperty("data").GetProperty("financial").GetProperty("currentBalance").GetProperty("minor").GetInt64());
    }

    [Fact]
    public async Task A_stale_push_gets_409_with_the_server_copy()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        ApiFactory.Bearer(client, await factory.RegisterAsync(client));
        await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = Doc(100) }); // phone A → v1
        await client.PutAsJsonAsync("/api/sync", new { baseVersion = 1, clientUpdatedAt = DateTimeOffset.UtcNow, data = Doc(200) }); // phone A → v2

        // Phone B still thinks the server is at v1.
        var stale = await client.PutAsJsonAsync("/api/sync", new { baseVersion = 1, clientUpdatedAt = DateTimeOffset.UtcNow, data = Doc(999) });
        Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
        var server = await stale.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, server.GetProperty("version").GetInt64());
        Assert.Equal(200, server.GetProperty("data").GetProperty("financial").GetProperty("currentBalance").GetProperty("minor").GetInt64());
    }

    [Fact]
    public async Task Users_only_see_their_own_data_and_it_is_encrypted_at_rest()
    {
        using var factory = new ApiFactory();
        var ana = factory.CreateClient();
        ApiFactory.Bearer(ana, await factory.RegisterAsync(ana, "ana@gmail.com"));
        await ana.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = new { secreto = "saldo-de-ana-777" } });

        var eva = factory.CreateClient();
        ApiFactory.Bearer(eva, await factory.RegisterAsync(eva, "eva@gmail.com"));
        Assert.Equal(HttpStatusCode.NoContent, (await eva.GetAsync("/api/sync")).StatusCode);

        using var scope = factory.Services.CreateScope();
        var row = await scope.ServiceProvider.GetRequiredService<AppDbContext>().UserData.SingleAsync();
        Assert.DoesNotContain("saldo-de-ana-777", Encoding.UTF8.GetString(row.Payload));
    }

    [Fact]
    public async Task Rejects_non_object_documents_and_future_client_clocks_are_clamped()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        ApiFactory.Bearer(client, await factory.RegisterAsync(client));

        var bad = await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = new[] { 1, 2 } });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);

        var future = await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow.AddYears(5), data = Doc(1) });
        var saved = (await future.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("clientUpdatedAt").GetDateTimeOffset();
        Assert.True(saved <= DateTimeOffset.UtcNow.AddMinutes(1));
    }
}
