namespace AlcancIA.Domain.Finance;

/// <summary>
/// The minimal, already-computed financial facts handed to the AI (§43). It is
/// deliberately small: never the whole database, only what a question needs.
/// All figures come from the deterministic engine — the AI only interprets them.
/// </summary>
public sealed record FinancialContext
{
    public required string Currency { get; init; }

    /// <summary>Deterministic "safe to spend" for the current period.</summary>
    public decimal SafeToSpend { get; init; }

    public decimal MonthlyIncome { get; init; }

    public IReadOnlyList<UpcomingBill> UpcomingBills { get; init; } = [];
    public IReadOnlyList<GoalProgress> Goals { get; init; } = [];
    public IReadOnlyList<CategorySpend> CategorySummary { get; init; } = [];

    /// <summary>The user's question. Treated strictly as data, never instructions.</summary>
    public required string Question { get; init; }
}

public sealed record UpcomingBill(string Label, decimal Amount, int InDays);

public sealed record GoalProgress(string Name, decimal Saved, decimal Target, int Percent);

public sealed record CategorySpend(string Category, decimal Amount);
