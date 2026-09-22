using System.Net.Http.Json;
using System.Text.Json;
using AlcancIA.Application.Ai;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AlcancIA.Infrastructure.Ai;

/// <summary>
/// Gemini implementation of <see cref="IAiProvider"/> (§41). The model id and key
/// come from <see cref="AiOptions"/> — never hardcoded — so switching model or
/// endpoint is configuration only. Any transport/HTTP failure returns a failed
/// result; the ChatService then falls back deterministically.
/// </summary>
public sealed class GeminiAiProvider(
    HttpClient http,
    IOptions<AiOptions> options,
    ILogger<GeminiAiProvider> logger) : IAiProvider
{
    private readonly AiOptions _options = options.Value;

    public string Name => "gemini";

    public bool IsConfigured =>
        _options.Enabled &&
        !string.IsNullOrWhiteSpace(_options.ApiKey) &&
        !string.IsNullOrWhiteSpace(_options.Model);

    public async Task<AiProviderResult> CompleteAsync(AiPrompt prompt, CancellationToken ct)
    {
        if (!IsConfigured)
        {
            return AiProviderResult.Fail("Gemini is not configured.");
        }

        // generateContent with a system instruction and a single user turn.
        var body = new
        {
            system_instruction = new { parts = new[] { new { text = prompt.System } } },
            contents = new[]
            {
                new { role = "user", parts = new[] { new { text = prompt.User } } },
            },
            generationConfig = new
            {
                temperature = 0.4,
                maxOutputTokens = 512,
                responseMimeType = "application/json",
            },
        };

        var path = $"/v1beta/models/{_options.Model}:generateContent?key={_options.ApiKey}";

        try
        {
            using var resp = await http.PostAsJsonAsync(path, body, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var detail = await resp.Content.ReadAsStringAsync(ct);
                logger.LogWarning("Gemini returned {Status}: {Detail}", (int)resp.StatusCode, Truncate(detail));
                return AiProviderResult.Fail($"HTTP {(int)resp.StatusCode}");
            }

            var text = ExtractText(await resp.Content.ReadAsStringAsync(ct));
            return text is null
                ? AiProviderResult.Fail("Empty Gemini response.")
                : AiProviderResult.Ok(text);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gemini request failed.");
            return AiProviderResult.Fail(ex.Message);
        }
    }

    /// <summary>Pull candidates[0].content.parts[0].text from the Gemini envelope.</summary>
    private static string? ExtractText(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                candidates.ValueKind == JsonValueKind.Array &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts) &&
                parts.ValueKind == JsonValueKind.Array &&
                parts.GetArrayLength() > 0 &&
                parts[0].TryGetProperty("text", out var textEl))
            {
                return textEl.GetString();
            }
        }
        catch (JsonException)
        {
            // fall through
        }

        return null;
    }

    private static string Truncate(string s) => s.Length > 300 ? s[..300] : s;
}
