using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using AlcancIA.Application.Ai;
using Microsoft.AspNetCore.Mvc.Testing;

namespace AlcancIA.Tests.Api;

public class AiChatEndpointTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory = factory;

    // Enums come over the wire as camelCase strings ("low"), matching the API.
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
    };

    [Fact]
    public async Task Health_endpoint_is_healthy()
    {
        var client = _factory.CreateClient();
        var resp = await client.GetAsync("/health");
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadAsStringAsync();
        Assert.Contains("healthy", body);
    }

    [Fact]
    public async Task Chat_returns_a_deterministic_answer_by_default()
    {
        var client = _factory.CreateClient();
        var request = new ChatRequest
        {
            Question = "¿cómo voy con mi meta?",
            Context = new ChatContext
            {
                Currency = "PEN",
                SafeToSpend = 742.50m,
                MonthlyIncome = 3500m,
                Goals = [new ChatGoal("Depa", 7240m, 20000m)],
            },
        };

        var resp = await client.PostAsJsonAsync("/api/ai/chat", request);
        resp.EnsureSuccessStatusCode();

        var body = await resp.Content.ReadFromJsonAsync<ChatResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Answer.Summary));
        // With no model configured the local provider answers.
        Assert.Equal("local", body.Answer.Source);
    }

    [Fact]
    public async Task Chat_rejects_an_empty_question()
    {
        var client = _factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/ai/chat", new ChatRequest { Question = "" });
        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }
}
