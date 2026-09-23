using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace AlcancIA.Tests.Api;

public class EmailEndpointTests
{
    [Fact]
    public async Task Request_then_verify_over_http_returns_a_ticket()
    {
        using var factory = new ApiFactory();
        var client = factory.CreateClient();

        // Exactly what mobile/src/services/emailVerification.ts sends.
        var requested = await client.PostAsJsonAsync("/api/email/request", new { email = "ana@gmail.com", purpose = "register" });
        Assert.Equal(HttpStatusCode.OK, requested.StatusCode);
        var challengeId = (await requested.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("challengeId").GetString();

        var verified = await client.PostAsJsonAsync("/api/email/verify", new { challengeId, email = "ana@gmail.com", purpose = "register", code = factory.Mailer.LastCodeByEmail["ana@gmail.com"] });
        Assert.Equal(HttpStatusCode.OK, verified.StatusCode);
        var body = await verified.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(body.GetProperty("verified").GetBoolean());
        Assert.False(string.IsNullOrEmpty(body.GetProperty("ticket").GetString()));
    }
}
