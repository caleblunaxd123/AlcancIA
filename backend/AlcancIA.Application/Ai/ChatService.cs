using AlcancIA.Domain.Ai;
using Microsoft.Extensions.Logging;

namespace AlcancIA.Application.Ai;

public interface IChatService
{
    Task<ChatResponse> AskAsync(ChatRequest request, CancellationToken ct);
}

/// <summary>
/// Orchestrates a chat turn:
///   1. Build the minimal financial context (§43).
///   2. Ask the configured provider.
///   3. Parse + validate the answer against the contract (§68).
///   4. On any failure — provider error, timeout, or off-contract output — return a
///      deterministic answer so chat never breaks (§69).
/// The provider only ever explains numbers; it never computes them.
/// </summary>
public sealed class ChatService(IAiProvider provider, ILogger<ChatService> logger) : IChatService
{
    public async Task<ChatResponse> AskAsync(ChatRequest request, CancellationToken ct)
    {
        var context = FinancialContextBuilder.Build(request);

        // No usable model configured → deterministic answer immediately.
        if (!provider.IsConfigured || provider.Name == "local")
        {
            return new ChatResponse
            {
                Answer = DeterministicResponder.Answer(context, provider.Name == "local" ? "local" : "fallback"),
                UsedFallback = provider.Name != "local",
            };
        }

        try
        {
            var prompt = PromptBuilder.Build(context);
            var result = await provider.CompleteAsync(prompt, ct);

            if (result.Success)
            {
                var parsed = AiResponseParser.TryParse(result.RawText, provider.Name);
                if (parsed is not null)
                {
                    return new ChatResponse { Answer = parsed, UsedFallback = false };
                }

                logger.LogWarning("AI provider {Provider} returned off-contract output; using fallback.", provider.Name);
            }
            else
            {
                logger.LogWarning("AI provider {Provider} failed: {Error}", provider.Name, result.Error);
            }
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI provider {Provider} threw; using fallback.", provider.Name);
        }

        return new ChatResponse
        {
            Answer = DeterministicResponder.Answer(context, "fallback"),
            UsedFallback = true,
        };
    }
}
