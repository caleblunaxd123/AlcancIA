using System.Collections.Concurrent;
using Microsoft.AspNetCore.DataProtection;

namespace AlcancIA.Api.Auth;

/// <summary>
/// Proof that an email code was verified, handed to the client by
/// /api/email/verify and required by register / reset-password. Signed and
/// time-limited with Data Protection (works across instances); consumed tickets
/// are remembered in memory so one ticket cannot be replayed on this instance.
/// </summary>
public sealed class VerificationTickets(IDataProtectionProvider provider, TimeProvider clock)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(15);
    private readonly ITimeLimitedDataProtector protector =
        provider.CreateProtector("AlcancIA.EmailTicket.v1").ToTimeLimitedDataProtector();
    private readonly ConcurrentDictionary<string, DateTimeOffset> consumed = new();

    public string Issue(string email, string purpose) =>
        protector.Protect($"{purpose}|{email}|{Guid.NewGuid():N}", clock.GetUtcNow().Add(Lifetime));

    /// <summary>True once per valid ticket for exactly this email and purpose.</summary>
    public bool TryConsume(string? ticket, string email, string purpose)
    {
        if (string.IsNullOrWhiteSpace(ticket)) return false;
        string payload;
        try { payload = protector.Unprotect(ticket, out var expires); if (expires <= clock.GetUtcNow()) return false; }
        catch (System.Security.Cryptography.CryptographicException) { return false; }

        var parts = payload.Split('|');
        if (parts.Length != 3 || parts[0] != purpose || parts[1] != email) return false;

        var now = clock.GetUtcNow();
        foreach (var old in consumed.Where(x => x.Value <= now).ToArray()) consumed.TryRemove(old.Key, out _);
        return consumed.TryAdd(parts[2], now.Add(Lifetime));
    }
}
