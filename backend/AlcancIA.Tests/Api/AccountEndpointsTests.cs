using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AlcancIA.Api.Auth;

namespace AlcancIA.Tests.Api;

public class AccountEndpointsTests
{
    [Fact]
    public async Task Register_requires_a_verified_email_ticket()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        var noTicket = await client.PostAsJsonAsync("/api/auth/register", new { name = "Ana", email = "ana@gmail.com", password = "Ahorro2026", ticket = "inventado" });
        Assert.Equal(HttpStatusCode.BadRequest, noTicket.StatusCode);

        var session = await factory.RegisterAsync(client);
        Assert.False(string.IsNullOrEmpty(session.GetProperty("accessToken").GetString()));
        Assert.False(string.IsNullOrEmpty(session.GetProperty("refreshToken").GetString()));
        Assert.Equal("ana@gmail.com", session.GetProperty("user").GetProperty("email").GetString());
        Assert.True(session.GetProperty("user").TryGetProperty("emailVerifiedAt", out var verified) && verified.ValueKind != JsonValueKind.Null);
    }

    [Fact]
    public async Task A_ticket_is_single_use_and_bound_to_its_email()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var ticket = await factory.TicketAsync(client, "ana@gmail.com", "register");

        var other = await client.PostAsJsonAsync("/api/auth/register", new { name = "Eva", email = "eva@gmail.com", password = "Ahorro2026", ticket });
        Assert.Equal(HttpStatusCode.BadRequest, other.StatusCode);
        var ok = await client.PostAsJsonAsync("/api/auth/register", new { name = "Ana", email = "ana@gmail.com", password = "Ahorro2026", ticket });
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
    }

    [Fact]
    public async Task Duplicate_email_and_weak_password_are_rejected()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await factory.RegisterAsync(client);

        var again = await client.PostAsJsonAsync("/api/email/request", new { email = "ana@gmail.com", purpose = "register" });
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);

        var ticket = await factory.TicketAsync(client, "eva@gmail.com", "register");
        var weak = await client.PostAsJsonAsync("/api/auth/register", new { name = "Eva", email = "eva@gmail.com", password = "corta", ticket });
        Assert.Equal(HttpStatusCode.BadRequest, weak.StatusCode);
    }

    [Fact]
    public async Task Login_hides_whether_the_email_exists()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        await factory.RegisterAsync(client);

        var wrongPassword = await client.PostAsJsonAsync("/api/auth/login", new { email = "ana@gmail.com", password = "Otra2026x" });
        var unknownEmail = await client.PostAsJsonAsync("/api/auth/login", new { email = "nadie@gmail.com", password = "Otra2026x" });
        Assert.Equal(HttpStatusCode.Unauthorized, wrongPassword.StatusCode);
        Assert.Equal(await wrongPassword.Content.ReadAsStringAsync(), await unknownEmail.Content.ReadAsStringAsync());

        var ok = await client.PostAsJsonAsync("/api/auth/login", new { email = " ANA@gmail.com ", password = "Ahorro2026" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
    }

    [Fact]
    public async Task Refresh_rotates_and_reuse_of_an_old_token_kills_the_family()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var first = (await factory.RegisterAsync(client)).GetProperty("refreshToken").GetString();

        var rotated = await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = first });
        Assert.Equal(HttpStatusCode.OK, rotated.StatusCode);
        var second = (await rotated.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("refreshToken").GetString();
        Assert.NotEqual(first, second);

        // An attacker replays the first token: rejected, and the legit one dies too.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = first })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = second })).StatusCode);
    }

    [Fact]
    public async Task Logout_revokes_the_session()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var refresh = (await factory.RegisterAsync(client)).GetProperty("refreshToken").GetString();

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/auth/logout", new { refreshToken = refresh })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refresh })).StatusCode);
    }

    [Fact]
    public async Task Password_reset_needs_a_recover_ticket_and_closes_every_session()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var session = await factory.RegisterAsync(client);
        ApiFactory.Bearer(client, session);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        var ticket = await factory.TicketAsync(client, "ana@gmail.com", "recover");
        var reset = await client.PostAsJsonAsync("/api/auth/reset-password", new { email = "ana@gmail.com", password = "Nueva2027x", ticket });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode); // old access token
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = session.GetProperty("refreshToken").GetString() })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new { email = "ana@gmail.com", password = "Nueva2027x" })).StatusCode);
    }

    [Fact]
    public async Task Recovery_request_does_not_reveal_unknown_emails_nor_send_mail()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/email/request", new { email = "nadie@gmail.com", purpose = "recover" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(factory.Mailer.LastCodeByEmail.ContainsKey("nadie@gmail.com"));
    }

    [Fact]
    public async Task Google_sign_in_creates_then_reuses_the_account_and_refuses_bad_tokens()
    {
        using var factory = new ApiFactory();
        factory.Google.Tokens["good"] = new GoogleIdentity("g-123", "eva@gmail.com", "Eva");
        var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/google", new { accessToken = "falso" })).StatusCode);

        var first = await (await client.PostAsJsonAsync("/api/auth/google", new { accessToken = "good" })).Content.ReadFromJsonAsync<JsonElement>();
        var second = await (await client.PostAsJsonAsync("/api/auth/google", new { accessToken = "good" })).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(first.GetProperty("user").GetProperty("id").GetString(), second.GetProperty("user").GetProperty("id").GetString());
        Assert.Equal("google", first.GetProperty("user").GetProperty("provider").GetString());

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email = "eva@gmail.com", password = "Algo2026x" });
        Assert.Equal(HttpStatusCode.BadRequest, login.StatusCode); // "entra con Google"
    }

    [Fact]
    public async Task Profile_name_and_password_can_be_changed_by_the_owner()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();
        var session = await factory.RegisterAsync(client);
        ApiFactory.Bearer(client, session);

        var renamed = await client.PutAsJsonAsync("/api/auth/me", new { name = "Ana María" });
        Assert.Equal("Ana María", (await renamed.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("name").GetString());

        var wrongCurrent = await client.PostAsJsonAsync("/api/auth/me/password", new { currentPassword = "NoEs2026x", password = "Nueva2027x" });
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);

        var changed = await client.PostAsJsonAsync("/api/auth/me/password", new { currentPassword = "Ahorro2026", password = "Nueva2027x" });
        Assert.Equal(HttpStatusCode.OK, changed.StatusCode);
        var fresh = await changed.Content.ReadFromJsonAsync<JsonElement>();

        // Other devices are signed out; this device continues with the fresh session.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = session.GetProperty("refreshToken").GetString() })).StatusCode);
        ApiFactory.Bearer(client, fresh);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
    }
}
