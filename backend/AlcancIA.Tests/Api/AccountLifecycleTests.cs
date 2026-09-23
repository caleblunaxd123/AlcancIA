using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AlcancIA.Tests.Api;

public class AccountLifecycleTests
{
    [Fact]
    public async Task Export_returns_the_profile_and_the_decrypted_data()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        ApiFactory.Bearer(client, await factory.RegisterAsync(client));
        await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = new { financial = new { nota = "mi-dato" } } });

        var export = await (await client.GetAsync("/api/auth/me/export")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("ana@gmail.com", export.GetProperty("account").GetProperty("email").GetString());
        Assert.Equal("mi-dato", export.GetProperty("data").GetProperty("financial").GetProperty("nota").GetString());
    }

    [Fact]
    public async Task Delete_requires_an_email_code_then_erases_user_sessions_and_data()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var session = await factory.RegisterAsync(client);
        ApiFactory.Bearer(client, session);
        await client.PutAsJsonAsync("/api/sync", new { baseVersion = 0, clientUpdatedAt = DateTimeOffset.UtcNow, data = new { n = 1 } });

        var noCode = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/me") { Content = JsonContent.Create(new { ticket = "inventado" }) });
        Assert.Equal(HttpStatusCode.BadRequest, noCode.StatusCode);

        var ticket = await factory.TicketAsync(client, "ana@gmail.com", "delete");
        var deleted = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/me") { Content = JsonContent.Create(new { ticket }) });
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = session.GetProperty("refreshToken").GetString() })).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.Equal(0, await db.Users.CountAsync());
        Assert.Equal(0, await db.UserData.CountAsync());
        Assert.Equal(0, await db.RefreshTokens.CountAsync());

        // The old credentials are gone too.
        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "ana@gmail.com", password = "Ahorro2026" });
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
    }

    [Fact]
    public async Task A_delete_ticket_for_another_email_is_useless()
    {
        using var factory = new ApiFactory();
        var ana = factory.CreateClient();
        ApiFactory.Bearer(ana, await factory.RegisterAsync(ana, "ana@gmail.com"));
        var eva = factory.CreateClient();
        await factory.RegisterAsync(eva, "eva@gmail.com");
        var evaTicket = await factory.TicketAsync(eva, "eva@gmail.com", "delete");

        var attempt = await ana.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/me") { Content = JsonContent.Create(new { ticket = evaTicket }) });
        Assert.Equal(HttpStatusCode.BadRequest, attempt.StatusCode);
    }
}
