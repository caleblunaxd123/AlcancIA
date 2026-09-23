using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using AlcancIA.Api;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AlcancIA.Tests.Api;

public class EmailEndpointTests(WebApplicationFactory<Program> factory) : IClassFixture<WebApplicationFactory<Program>>
{
    private sealed class CapturingMailer : IVerificationMailer
    {
        public string? LastCode { get; private set; }
        public Task SendAsync(string email, string code, CancellationToken ct) { LastCode = code; return Task.CompletedTask; }
    }

    [Fact]
    public async Task Request_then_verify_over_http_with_the_app_payload()
    {
        var mailer = new CapturingMailer();
        var client = factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.RemoveAll<IVerificationMailer>();
            s.AddSingleton<IVerificationMailer>(mailer);
        })).CreateClient();

        // Exactly what mobile/src/services/emailVerification.ts sends.
        var requested = await client.PostAsJsonAsync("/api/email/request", new { email = "ana@gmail.com", purpose = "register" });
        Assert.Equal(HttpStatusCode.OK, requested.StatusCode);
        var body = await requested.Content.ReadFromJsonAsync<JsonElement>();
        var challengeId = body.GetProperty("challengeId").GetString()!;

        var verified = await client.PostAsJsonAsync("/api/email/verify", new { challengeId, email = "ana@gmail.com", purpose = "register", code = mailer.LastCode });
        Assert.Equal(HttpStatusCode.OK, verified.StatusCode);
    }
}
