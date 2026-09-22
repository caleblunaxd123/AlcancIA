using AlcancIA.Domain.Ai;

namespace AlcancIA.Application.Ai;

/// <summary>
/// API request. The client sends already-computed facts from its deterministic
/// engine plus the question. The server minimizes and sanitizes before the model
/// ever sees them.
/// </summary>
public sealed record ChatRequest
{
    public string Question { get; init; } = string.Empty;
    public ChatContext Context { get; init; } = new();
}

public sealed record ChatContext
{
    public string Currency { get; init; } = "PEN";
    public decimal SafeToSpend { get; init; }
    public decimal MonthlyIncome { get; init; }
    public List<ChatBill> UpcomingBills { get; init; } = [];
    public List<ChatGoal> Goals { get; init; } = [];
    public List<ChatCategory> CategorySummary { get; init; } = [];
}

public sealed record ChatBill(string Label, decimal Amount, int InDays);

public sealed record ChatGoal(string Name, decimal Saved, decimal Target);

public sealed record ChatCategory(string Category, decimal Amount);

/// <summary>API response — the validated contract plus provider metadata.</summary>
public sealed record ChatResponse
{
    public required AiResponse Answer { get; init; }

    /// <summary>True when the answer came from the deterministic fallback, not a model.</summary>
    public bool UsedFallback { get; init; }
}
