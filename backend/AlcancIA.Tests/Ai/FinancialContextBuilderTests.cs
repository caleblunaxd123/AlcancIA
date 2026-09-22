using AlcancIA.Application.Ai;

namespace AlcancIA.Tests.Ai;

public class FinancialContextBuilderTests
{
    [Fact]
    public void Trims_lists_to_a_minimal_context()
    {
        var request = new ChatRequest
        {
            Question = "¿Cómo voy?",
            Context = new ChatContext
            {
                Currency = "PEN",
                SafeToSpend = 742.5m,
                MonthlyIncome = 3500m,
                UpcomingBills = Enumerable.Range(1, 12)
                    .Select(i => new ChatBill($"Bill {i}", i * 10m, i))
                    .ToList(),
                CategorySummary = Enumerable.Range(1, 12)
                    .Select(i => new ChatCategory($"Cat {i}", i * 100m))
                    .ToList(),
                Goals = Enumerable.Range(1, 12)
                    .Select(i => new ChatGoal($"Goal {i}", 100m, 400m))
                    .ToList(),
            },
        };

        var ctx = FinancialContextBuilder.Build(request);

        Assert.True(ctx.UpcomingBills.Count <= 5);
        Assert.True(ctx.CategorySummary.Count <= 6);
        Assert.True(ctx.Goals.Count <= 4);
    }

    [Fact]
    public void Sorts_bills_by_soonest_and_categories_by_largest()
    {
        var request = new ChatRequest
        {
            Question = "q",
            Context = new ChatContext
            {
                UpcomingBills =
                [
                    new ChatBill("Far", 10m, 20),
                    new ChatBill("Soon", 10m, 2),
                ],
                CategorySummary =
                [
                    new ChatCategory("Small", 50m),
                    new ChatCategory("Big", 500m),
                ],
            },
        };

        var ctx = FinancialContextBuilder.Build(request);

        Assert.Equal("Soon", ctx.UpcomingBills[0].Label);
        Assert.Equal("Big", ctx.CategorySummary[0].Category);
    }

    [Fact]
    public void Computes_goal_percent_and_defaults_currency()
    {
        var request = new ChatRequest
        {
            Question = "q",
            Context = new ChatContext
            {
                Currency = "",
                Goals = [new ChatGoal("Depa", 5000m, 20000m)],
            },
        };

        var ctx = FinancialContextBuilder.Build(request);

        Assert.Equal("PEN", ctx.Currency);
        Assert.Equal(25, ctx.Goals[0].Percent);
    }
}
