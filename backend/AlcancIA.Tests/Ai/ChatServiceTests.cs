using AlcancIA.Application.Ai;
using Microsoft.Extensions.Logging.Abstractions;

namespace AlcancIA.Tests.Ai;

public class ChatServiceTests
{
    private static ChatRequest Request(string question = "¿puedo comprar algo?") => new()
    {
        Question = question,
        Context = new ChatContext
        {
            Currency = "PEN",
            SafeToSpend = 742.50m,
            MonthlyIncome = 3500m,
            Goals = [new ChatGoal("Depa", 7240m, 20000m)],
        },
    };

    private sealed class FakeProvider(string name, bool configured, AiProviderResult? result = null, Exception? throws = null) : IAiProvider
    {
        public string Name => name;
        public bool IsConfigured => configured;
        public Task<AiProviderResult> CompleteAsync(AiPrompt prompt, CancellationToken ct)
        {
            if (throws is not null)
            {
                throw throws;
            }

            return Task.FromResult(result ?? AiProviderResult.Fail("no result"));
        }
    }

    private static ChatService Service(IAiProvider provider) =>
        new(provider, NullLogger<ChatService>.Instance);

    [Fact]
    public async Task Uses_deterministic_answer_when_provider_is_local()
    {
        var service = Service(new FakeProvider("local", configured: true));
        var response = await service.AskAsync(Request(), CancellationToken.None);

        Assert.Equal("local", response.Answer.Source);
        Assert.False(response.UsedFallback);
        Assert.False(string.IsNullOrWhiteSpace(response.Answer.Summary));
    }

    [Fact]
    public async Task Returns_provider_answer_when_model_output_is_valid()
    {
        var valid = AiProviderResult.Ok("{ \"summary\": \"Vas bien.\", \"impactLevel\": \"low\" }");
        var service = Service(new FakeProvider("gemini", configured: true, result: valid));

        var response = await service.AskAsync(Request(), CancellationToken.None);

        Assert.Equal("gemini", response.Answer.Source);
        Assert.Equal("Vas bien.", response.Answer.Summary);
        Assert.False(response.UsedFallback);
    }

    [Fact]
    public async Task Falls_back_when_model_returns_off_contract_text()
    {
        var junk = AiProviderResult.Ok("lo siento, no puedo responder en JSON");
        var service = Service(new FakeProvider("gemini", configured: true, result: junk));

        var response = await service.AskAsync(Request(), CancellationToken.None);

        Assert.True(response.UsedFallback);
        Assert.Equal("fallback", response.Answer.Source);
        Assert.False(string.IsNullOrWhiteSpace(response.Answer.Summary));
    }

    [Fact]
    public async Task Falls_back_when_provider_throws()
    {
        var service = Service(new FakeProvider("gemini", configured: true, throws: new HttpRequestException("network down")));
        var response = await service.AskAsync(Request(), CancellationToken.None);

        Assert.True(response.UsedFallback);
        Assert.Equal("fallback", response.Answer.Source);
    }

    [Fact]
    public async Task Falls_back_when_provider_reports_failure()
    {
        var service = Service(new FakeProvider("gemini", configured: true, result: AiProviderResult.Fail("HTTP 500")));
        var response = await service.AskAsync(Request(), CancellationToken.None);

        Assert.True(response.UsedFallback);
    }
}
