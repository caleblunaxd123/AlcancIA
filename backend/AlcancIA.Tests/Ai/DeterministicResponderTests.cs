using AlcancIA.Application.Ai;
using AlcancIA.Domain.Finance;

namespace AlcancIA.Tests.Ai;

public class DeterministicResponderTests
{
    private static FinancialContext Context(string question) => new()
    {
        Currency = "PEN",
        SafeToSpend = 742.50m,
        MonthlyIncome = 3500m,
        UpcomingBills = [new UpcomingBill("Tarjeta", 300m, 3)],
        Goals = [new GoalProgress("Depa", 7240m, 20000m, 36)],
        CategorySummary = [new CategorySpend("delivery", 286m)],
        Question = question,
    };

    [Fact]
    public void Purchase_intent_references_safe_to_spend()
    {
        var r = DeterministicResponder.Answer(Context("¿puedo comprar unas zapatillas?"), "local");
        Assert.Contains("742", r.Summary);
        Assert.Contains("safeToSpend", r.CalculationIds);
    }

    [Fact]
    public void Goal_intent_references_the_goal_progress()
    {
        var r = DeterministicResponder.Answer(Context("¿cómo voy con mi meta?"), "local");
        Assert.Contains("Depa", r.Summary);
        Assert.Contains("goalProgress", r.CalculationIds);
    }

    [Fact]
    public void Never_phrases_answers_as_commands()
    {
        foreach (var q in new[] { "¿puedo comprar algo?", "¿cómo voy con mi meta?", "ayúdame a ahorrar", "revisar suscripciones" })
        {
            var r = DeterministicResponder.Answer(Context(q), "local");
            var text = (r.Summary + " " + string.Join(" ", r.Recommendations)).ToLowerInvariant();
            Assert.DoesNotContain("no compres", text);
            Assert.DoesNotContain("deberías comprar", text);
        }
    }

    [Fact]
    public void Always_produces_a_non_empty_summary()
    {
        var r = DeterministicResponder.Answer(Context("cualquier cosa random"), "fallback");
        Assert.False(string.IsNullOrWhiteSpace(r.Summary));
        Assert.Equal("fallback", r.Source);
    }
}
