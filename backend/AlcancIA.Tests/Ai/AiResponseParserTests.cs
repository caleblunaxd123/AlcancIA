using AlcancIA.Application.Ai;
using AlcancIA.Domain.Ai;

namespace AlcancIA.Tests.Ai;

public class AiResponseParserTests
{
    [Fact]
    public void Parses_a_valid_contract_object()
    {
        var json = """
        {
          "summary": "Puedes gastar con tranquilidad.",
          "impactLevel": "medium",
          "facts": ["Disponible S/ 742"],
          "recommendations": ["Sepáralo apenas cobras"],
          "calculationIds": ["safeToSpend"]
        }
        """;

        var result = AiResponseParser.TryParse(json, "gemini");

        Assert.NotNull(result);
        Assert.Equal("Puedes gastar con tranquilidad.", result!.Summary);
        Assert.Equal(AiImpactLevel.Medium, result.ImpactLevel);
        Assert.Single(result.Facts);
        Assert.Equal("gemini", result.Source);
    }

    [Fact]
    public void Tolerates_markdown_fences_and_surrounding_prose()
    {
        var raw = "Claro, aquí tienes:\n```json\n{ \"summary\": \"Vas bien.\" }\n```";
        var result = AiResponseParser.TryParse(raw, "gemini");

        Assert.NotNull(result);
        Assert.Equal("Vas bien.", result!.Summary);
        Assert.Equal(AiImpactLevel.Low, result.ImpactLevel); // default
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("no soy json")]
    [InlineData("{ \"impactLevel\": \"high\" }")] // missing summary
    [InlineData("{ \"summary\": \"\" }")] // empty summary
    [InlineData("[1,2,3]")] // not an object
    public void Returns_null_for_off_contract_output(string? raw)
    {
        Assert.Null(AiResponseParser.TryParse(raw, "gemini"));
    }

    [Fact]
    public void Unknown_impact_level_falls_back_to_low()
    {
        var result = AiResponseParser.TryParse("{ \"summary\": \"ok\", \"impactLevel\": \"nuclear\" }", "gemini");
        Assert.NotNull(result);
        Assert.Equal(AiImpactLevel.Low, result!.ImpactLevel);
    }

    [Fact]
    public void Caps_model_generated_content_to_safe_ui_limits()
    {
        var longText = new string('x', 1000);
        var items = string.Join(',', Enumerable.Range(0, 12).Select(_ => $"\"{longText}\""));
        var result = AiResponseParser.TryParse($$"""{"summary":"{{longText}}","facts":[{{items}}]}""", "gemini");

        Assert.NotNull(result);
        Assert.Equal(800, result!.Summary.Length);
        Assert.Equal(6, result.Facts.Count);
        Assert.All(result.Facts, item => Assert.Equal(300, item.Length));
    }
}
