using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace AlcancIA.Api.Auth;

public sealed record GoogleIdentity(string Subject, string Email, string Name);

public interface IGoogleTokenVerifier
{
    /// <summary>Null unless the token is live, issued to one of our client ids and the email is verified.</summary>
    Task<GoogleIdentity?> VerifyAsync(string accessToken, CancellationToken ct);
}

/// <summary>
/// Validates a Google OAuth access token server-side: tokeninfo confirms the
/// audience (our client ids) and the verified email; userinfo gives the name.
/// The app's own claim of who the user is is never trusted.
/// </summary>
public sealed class GoogleTokenVerifier(HttpClient http, IOptions<AuthOptions> options) : IGoogleTokenVerifier
{
    public async Task<GoogleIdentity?> VerifyAsync(string accessToken, CancellationToken ct)
    {
        var allowed = options.Value.GoogleClientIds;
        if (allowed.Length == 0 || string.IsNullOrWhiteSpace(accessToken) || accessToken.Length > 4096) return null;

        using var info = await http.GetAsync($"https://oauth2.googleapis.com/tokeninfo?access_token={Uri.EscapeDataString(accessToken)}", ct);
        if (!info.IsSuccessStatusCode) return null;
        using var infoJson = JsonDocument.Parse(await info.Content.ReadAsStringAsync(ct));
        var root = infoJson.RootElement;
        var audience = root.TryGetProperty("azp", out var azp) ? azp.GetString() : root.TryGetProperty("aud", out var aud) ? aud.GetString() : null;
        var verified = root.TryGetProperty("email_verified", out var ev) && (ev.ValueKind == JsonValueKind.True || ev.GetString() == "true");
        var sub = root.TryGetProperty("sub", out var s) ? s.GetString() : null;
        var email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
        if (audience is null || !allowed.Contains(audience) || !verified || string.IsNullOrEmpty(sub) || string.IsNullOrEmpty(email)) return null;

        var name = email.Split('@')[0];
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        using var profile = await http.SendAsync(request, ct);
        if (profile.IsSuccessStatusCode)
        {
            using var profileJson = JsonDocument.Parse(await profile.Content.ReadAsStringAsync(ct));
            if (profileJson.RootElement.TryGetProperty("name", out var n) && n.GetString() is { Length: > 0 } full) name = full;
        }
        return new GoogleIdentity(sub, email.Trim().ToLowerInvariant(), name.Length > 80 ? name[..80] : name);
    }
}
