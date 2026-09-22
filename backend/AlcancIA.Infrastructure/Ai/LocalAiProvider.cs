using System.Text.Json;
using AlcancIA.Application.Ai;

namespace AlcancIA.Infrastructure.Ai;

/// <summary>
/// The always-available provider. It performs no network calls; it renders the
/// prompt's data through the deterministic responder. Registered when no external
/// model is configured, so AlcancIA's chat works out of the box and offline (§69).
/// </summary>
public sealed class LocalAiProvider : IAiProvider
{
    public string Name => "local";

    public bool IsConfigured => true;

    public Task<AiProviderResult> CompleteAsync(AiPrompt prompt, CancellationToken ct)
    {
        // The local provider is normally short-circuited by ChatService, but we
        // still honor the interface: echo a minimal valid contract object so that
        // anything routing raw text through the parser succeeds.
        var payload = JsonSerializer.Serialize(new
        {
            summary = "Estoy analizando tu contexto financiero.",
            impactLevel = "low",
            facts = Array.Empty<string>(),
            recommendations = Array.Empty<string>(),
            calculationIds = new[] { "safeToSpend" },
        });

        return Task.FromResult(AiProviderResult.Ok(payload));
    }
}
