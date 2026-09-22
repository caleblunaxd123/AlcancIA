using System.Text.Json;
using AlcancIA.Domain.Ai;

namespace AlcancIA.Application.Ai;

/// <summary>
/// Parses and validates a model's raw text into the strict <see cref="AiResponse"/>
/// contract (§68). Any deviation (prose, markdown fences, missing summary, bad
/// enum) returns null so the caller can fall back to a deterministic answer.
/// </summary>
public static class AiResponseParser
{
    public static AiResponse? TryParse(string? rawText, string source)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return null;
        }

        var json = ExtractJson(rawText);
        if (json is null)
        {
            return null;
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            if (!root.TryGetProperty("summary", out var summaryEl) ||
                summaryEl.ValueKind != JsonValueKind.String ||
                string.IsNullOrWhiteSpace(summaryEl.GetString()))
            {
                return null;
            }

            return new AiResponse
            {
                Summary = summaryEl.GetString()!.Trim(),
                ImpactLevel = ParseImpact(root),
                Facts = ReadStringArray(root, "facts"),
                Recommendations = ReadStringArray(root, "recommendations"),
                CalculationIds = ReadStringArray(root, "calculationIds"),
                Source = source,
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>
    /// Pull the first balanced JSON object out of the text. Models sometimes wrap
    /// JSON in ```json fences or add a stray sentence; we tolerate that.
    /// </summary>
    private static string? ExtractJson(string text)
    {
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start)
        {
            return null;
        }

        return text[start..(end + 1)];
    }

    private static AiImpactLevel ParseImpact(JsonElement root)
    {
        if (root.TryGetProperty("impactLevel", out var el) && el.ValueKind == JsonValueKind.String)
        {
            return el.GetString()?.ToLowerInvariant() switch
            {
                "high" => AiImpactLevel.High,
                "medium" => AiImpactLevel.Medium,
                _ => AiImpactLevel.Low,
            };
        }

        return AiImpactLevel.Low;
    }

    private static IReadOnlyList<string> ReadStringArray(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var el) || el.ValueKind != JsonValueKind.Array)
        {
            return [];
        }

        var list = new List<string>();
        foreach (var item in el.EnumerateArray())
        {
            if (item.ValueKind == JsonValueKind.String)
            {
                var s = item.GetString();
                if (!string.IsNullOrWhiteSpace(s))
                {
                    list.Add(s.Trim());
                }
            }
        }

        return list;
    }
}
