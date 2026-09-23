using System.Collections.Concurrent;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;

namespace AlcancIA.Api;

public interface IVerificationMailer
{
    Task SendAsync(string email, string code, CancellationToken ct);
}

public sealed class SmtpVerificationMailer(IConfiguration config) : IVerificationMailer
{
    public async Task SendAsync(string email, string code, CancellationToken ct)
    {
        var host = config["Email:Host"];
        // Gmail only sends as the authenticated account, so From defaults to it.
        var from = config["Email:From"] is { Length: > 0 } configured ? configured : config["Email:Username"];
        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("Email delivery is not configured.");
        using var client = new SmtpClient(host, config.GetValue("Email:Port", 587))
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(config["Email:Username"], config["Email:Password"]),
        };
        using var message = new MailMessage(from, email)
        {
            Subject = "Tu código de verificación de AlcancIA",
            Body = $"Tu código de AlcancIA es: {code}\n\nVence en 10 minutos y solo puede usarse una vez. No lo compartas. Si no solicitaste este correo, puedes ignorarlo.",
        };
        await client.SendMailAsync(message, ct);
    }
}

// Email ownership proof for the device-local account. This is NOT server authentication.
// Single API instance: restarting it invalidates pending codes, never activates an account.
public sealed class EmailVerification(IVerificationMailer mailer, TimeProvider clock)
{
    private sealed record Challenge(string Email, string Purpose, byte[] Digest, DateTimeOffset Expires)
    {
        public int Attempts;
    }
    private readonly ConcurrentDictionary<string, Challenge> challenges = new();
    private readonly Dictionary<string, DateTimeOffset> cooldowns = new();
    private readonly byte[] key = RandomNumberGenerator.GetBytes(32);
    private readonly object gate = new();
    private byte[] Digest(string id, string code) => HMACSHA256.HashData(key, Encoding.UTF8.GetBytes($"{id}:{code}"));
    public static string Normalize(string email) => email.Trim().ToLowerInvariant();
    public static bool Valid(string? email, string? purpose) => email is { Length: <= 254 }
        && MailAddress.TryCreate(email, out var address) && address.Address == email
        && purpose is "register" or "recover" or "verify";

    public async Task<(int Status, object Body)> Request(string email, string purpose, CancellationToken ct)
    {
        email = Normalize(email);
        if (!Valid(email, purpose)) return (400, new { error = "Revisa el correo electrónico." });
        var now = clock.GetUtcNow();
        lock (gate)
        {
            foreach (var expired in challenges.Where(x => x.Value.Expires <= now).ToArray()) challenges.TryRemove(expired.Key, out _);
            foreach (var expired in cooldowns.Where(x => x.Value <= now).ToArray()) cooldowns.Remove(expired.Key);
            if (cooldowns.ContainsKey(email)) return (429, new { error = "Espera un minuto antes de solicitar otro código." });
            if (challenges.Count >= 10000) return (503, new { error = "Inténtalo más tarde." });
            cooldowns[email] = now.AddMinutes(1);
        }
        var id = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var code = RandomNumberGenerator.GetInt32(1000000).ToString("D6");
        try { await mailer.SendAsync(email, code, ct); }
        catch (Exception ex) when (ex is SmtpException or InvalidOperationException or OperationCanceledException or FormatException)
        {
            return (503, new { error = "No pudimos enviar el correo. El servicio de envío debe estar configurado y disponible. Inténtalo en un minuto." });
        }
        lock (gate)
        {
            foreach (var previous in challenges.Where(x => x.Value.Email == email && x.Value.Purpose == purpose).ToArray()) challenges.TryRemove(previous.Key, out _);
            challenges[id] = new(email, purpose, Digest(id, code), clock.GetUtcNow().AddMinutes(10));
        }
        return (200, new { challengeId = id, expiresInSeconds = 600, resendAfterSeconds = 60 });
    }

    public bool Verify(string id, string email, string purpose, string code)
    {
        lock (gate)
        {
            if (!challenges.TryGetValue(id, out var item)) return false;
            if (item.Expires <= clock.GetUtcNow() || ++item.Attempts > 5)
            { challenges.TryRemove(id, out _); return false; }
            var valid = item.Email == Normalize(email) && item.Purpose == purpose && code.Length == 6
                && CryptographicOperations.FixedTimeEquals(item.Digest, Digest(id, code));
            if (valid || item.Attempts >= 5) challenges.TryRemove(id, out _);
            return valid;
        }
    }
}

public sealed record EmailCodeRequest(string? Email, string? Purpose);
public sealed record EmailCodeVerify(string? ChallengeId, string? Email, string? Purpose, string? Code);
