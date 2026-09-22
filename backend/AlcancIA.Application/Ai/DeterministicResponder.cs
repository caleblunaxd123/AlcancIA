using System.Globalization;
using AlcancIA.Domain.Ai;
using AlcancIA.Domain.Finance;

namespace AlcancIA.Application.Ai;

/// <summary>
/// Builds a warm, useful answer from the deterministic context with no model at
/// all (§69). It powers the local provider and is the fallback when a real model
/// is down or returns something off-contract — so chat always works and always
/// stays on-brand (informs, never orders; never shames).
/// </summary>
public static class DeterministicResponder
{
    public static AiResponse Answer(FinancialContext ctx, string source)
    {
        var q = (ctx.Question ?? string.Empty).ToLowerInvariant();
        var symbol = ctx.Currency switch { "USD" => "$", "PEN" => "S/", _ => ctx.Currency };
        var money = new Func<decimal, string>(v => $"{symbol} {v.ToString("N2", CultureInfo.GetCultureInfo("es-PE"))}");

        // Intent routing by simple keyword heuristics.
        if (Contains(q, "comprar", "puedo gastar", "me alcanza"))
        {
            return new AiResponse
            {
                Summary = $"Tu dinero seguro para gastar hoy es {money(ctx.SafeToSpend)}. Puedo mostrarte el impacto exacto de una compra en la pantalla ¿Puedo comprarlo?",
                ImpactLevel = ctx.SafeToSpend <= 0 ? AiImpactLevel.High : AiImpactLevel.Low,
                Facts = [$"Disponible sin afectar tus planes: {money(ctx.SafeToSpend)}"],
                Recommendations = ["Abre ¿Puedo comprarlo? y prueba el monto que tienes en mente."],
                CalculationIds = ["safeToSpend"],
                Source = source,
            };
        }

        if (Contains(q, "meta", "ahorr", "departamento", "viaje"))
        {
            var goal = ctx.Goals.FirstOrDefault();
            if (goal is not null)
            {
                return new AiResponse
                {
                    Summary = $"Vas {goal.Percent}% en \"{goal.Name}\": {money(goal.Saved)} de {money(goal.Target)}. Sumar un poco cada mes acorta el camino.",
                    ImpactLevel = AiImpactLevel.Medium,
                    Facts =
                    [
                        $"{goal.Name}: {money(goal.Saved)} de {money(goal.Target)} ({goal.Percent}%)",
                        $"Dinero seguro para gastar: {money(ctx.SafeToSpend)}",
                    ],
                    Recommendations = ["Separar el ahorro apenas recibes tu ingreso suele funcionar mejor que ahorrar lo que sobra."],
                    CalculationIds = ["goalProgress", "safeToSpend"],
                    Source = source,
                };
            }
        }

        if (Contains(q, "suscrip", "netflix", "spotify", "gasté más", "gaste mas", "gastos"))
        {
            var top = ctx.CategorySummary.FirstOrDefault();
            var facts = new List<string> { $"Dinero seguro para gastar: {money(ctx.SafeToSpend)}" };
            if (top is not null)
            {
                facts.Insert(0, $"Tu categoría más alta es {top.Category}: {money(top.Amount)}");
            }

            return new AiResponse
            {
                Summary = top is not null
                    ? $"Este periodo tu mayor gasto fue {top.Category} ({money(top.Amount)}). Revisar ahí suele dar el cambio más grande."
                    : "Aún no veo suficientes gastos para un patrón claro. Registra unos días y te muestro dónde se va tu dinero.",
                ImpactLevel = AiImpactLevel.Low,
                Facts = facts,
                Recommendations = ["Mira Movimientos por categoría para detectar el gasto que puedes ajustar sin esfuerzo."],
                CalculationIds = ["categorySummary"],
                Source = source,
            };
        }

        // Default: a calm status summary.
        var nextBill = ctx.UpcomingBills.FirstOrDefault();
        var defaultFacts = new List<string> { $"Dinero seguro para gastar: {money(ctx.SafeToSpend)}" };
        if (nextBill is not null)
        {
            defaultFacts.Add($"Próximo pago: {nextBill.Label} {money(nextBill.Amount)} en {nextBill.InDays} día(s)");
        }

        return new AiResponse
        {
            Summary = $"Hoy tu dinero seguro para gastar es {money(ctx.SafeToSpend)}. Estoy mirando tu contexto: pregúntame por una compra, tus metas o tus gastos.",
            ImpactLevel = AiImpactLevel.Low,
            Facts = defaultFacts,
            Recommendations = [],
            CalculationIds = ["safeToSpend"],
            Source = source,
        };
    }

    private static bool Contains(string haystack, params string[] needles)
        => needles.Any(n => haystack.Contains(n, StringComparison.Ordinal));
}
