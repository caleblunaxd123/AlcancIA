namespace AlcancIA.Application.Ai;

/// <summary>
/// Provider abstraction (§41). Implementations (Gemini, OpenAI, local, ...) are
/// interchangeable and selected by configuration. The exact model name is never
/// hardcoded — it comes from options.
/// </summary>
public interface IAiProvider
{
    /// <summary>Provider id, e.g. "gemini" or "local".</summary>
    string Name { get; }

    /// <summary>Whether the provider has everything it needs (e.g. an API key).</summary>
    bool IsConfigured { get; }

    Task<AiProviderResult> CompleteAsync(AiPrompt prompt, CancellationToken ct);
}

/// <summary>A system instruction plus the user turn. Kept model-agnostic.</summary>
public sealed record AiPrompt(string System, string User);

/// <summary>Raw provider outcome. Parsing/validation happens in the ChatService.</summary>
public sealed record AiProviderResult(bool Success, string? RawText, string? Error)
{
    public static AiProviderResult Ok(string rawText) => new(true, rawText, null);
    public static AiProviderResult Fail(string error) => new(false, null, error);
}
