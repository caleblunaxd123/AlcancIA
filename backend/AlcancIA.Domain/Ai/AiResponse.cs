namespace AlcancIA.Domain.Ai;

/// <summary>
/// The structured contract every AI answer conforms to (§68). AlcancIA never
/// shows a raw model blob — responses are validated into this shape, and if the
/// model fails we fall back to a deterministic answer with the same shape.
/// </summary>
public sealed record AiResponse
{
    public required string Summary { get; init; }
    public AiImpactLevel ImpactLevel { get; init; } = AiImpactLevel.Low;
    public IReadOnlyList<string> Facts { get; init; } = [];
    public IReadOnlyList<string> Recommendations { get; init; } = [];

    /// <summary>Ids of the deterministic calculations this answer refers to.</summary>
    public IReadOnlyList<string> CalculationIds { get; init; } = [];

    /// <summary>Where the answer came from: "gemini", "local", or "fallback".</summary>
    public string Source { get; init; } = "local";
}
