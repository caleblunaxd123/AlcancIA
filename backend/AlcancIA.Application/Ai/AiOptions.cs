namespace AlcancIA.Application.Ai;

/// <summary>
/// Bound from configuration / environment (§41/§75). Nothing here is hardcoded in
/// code — switching model or provider is a config change only.
/// </summary>
public sealed class AiOptions
{
    public const string SectionName = "Ai";

    /// <summary>Master switch (§70 AI_ENABLED). When false, the local provider is used.</summary>
    public bool Enabled { get; set; } = true;

    /// <summary>Provider id, e.g. "gemini". Falls back to "local" when unconfigured.</summary>
    public string Provider { get; set; } = "local";

    /// <summary>Model id, e.g. "gemini-2.0-flash". Never hardcoded in source.</summary>
    public string Model { get; set; } = string.Empty;

    public string ApiKey { get; set; } = string.Empty;

    /// <summary>Base endpoint; overridable for proxies / regional endpoints.</summary>
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com";

    public int TimeoutSeconds { get; set; } = 20;
}
