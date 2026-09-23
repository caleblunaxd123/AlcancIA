using AlcancIA.Domain.Finance;

namespace AlcancIA.Application.Ai;

/// <summary>
/// Turns a raw client request into the minimal <see cref="FinancialContext"/> the
/// model may see (§43). It trims lists to what a question plausibly needs and never
/// forwards anything beyond the provided facts — no full history, no raw records.
/// </summary>
public static class FinancialContextBuilder
{
    private const int MaxBills = 5;
    private const int MaxGoals = 4;
    private const int MaxCategories = 6;

    public static FinancialContext Build(ChatRequest request)
    {
        var ctx = request.Context;

        var bills = ctx.UpcomingBills
            .OrderBy(b => b.InDays)
            .Take(MaxBills)
            .Select(b => new UpcomingBill(Clean(b.Label, 120), Round(b.Amount), b.InDays))
            .ToList();

        var goals = ctx.Goals
            .Take(MaxGoals)
            .Select(g => new GoalProgress(
                Clean(g.Name, 120),
                Round(g.Saved),
                Round(g.Target),
                g.Target > 0 ? (int)Math.Round(g.Saved / g.Target * 100m) : 0))
            .ToList();

        var categories = ctx.CategorySummary
            .OrderByDescending(c => c.Amount)
            .Take(MaxCategories)
            .Select(c => new CategorySpend(Clean(c.Category, 80), Round(c.Amount)))
            .ToList();

        return new FinancialContext
        {
            Currency = ctx.Currency is "PEN" or "USD" ? ctx.Currency : "PEN",
            SafeToSpend = Round(ctx.SafeToSpend),
            MonthlyIncome = Round(ctx.MonthlyIncome),
            UpcomingBills = bills,
            Goals = goals,
            CategorySummary = categories,
            Question = request.Question ?? string.Empty,
        };
    }

    private static decimal Round(decimal value) => Math.Round(value, 2);
    private static string Clean(string value, int maxLength)
    {
        var clean = (value ?? string.Empty).Replace('\r', ' ').Replace('\n', ' ').Trim();
        return clean.Length <= maxLength ? clean : clean[..maxLength].TrimEnd();
    }
}
