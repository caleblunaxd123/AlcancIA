using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using AlcancIA.Domain.Accounts;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace AlcancIA.Api.Auth;

public sealed class AuthOptions
{
    public const string SectionName = "Auth";
    public string Issuer { get; set; } = "alcancia-api";
    public string Audience { get; set; } = "alcancia-app";
    /// <summary>HMAC-SHA256 key, at least 32 bytes. From user-secrets / env, never appsettings.</summary>
    public string SigningKey { get; set; } = "";
    public int AccessTokenMinutes { get; set; } = 15;
    public int RefreshTokenDays { get; set; } = 30;
    /// <summary>OAuth client ids whose Google tokens are accepted.</summary>
    public string[] GoogleClientIds { get; set; } = [];

    public SymmetricSecurityKey Key()
    {
        var bytes = Encoding.UTF8.GetBytes(SigningKey);
        if (bytes.Length < 32) throw new InvalidOperationException("Auth:SigningKey must be at least 32 bytes.");
        return new SymmetricSecurityKey(bytes);
    }
}

public sealed record Session(string AccessToken, int ExpiresIn, string RefreshToken, UserDto User);
public sealed record UserDto(Guid Id, string Name, string Email, string Provider, DateTimeOffset? EmailVerifiedAt);

/// <summary>
/// Short-lived JWT access tokens + rotating opaque refresh tokens (stored hashed).
/// Presenting an already-rotated refresh token revokes its whole family.
/// </summary>
public sealed class TokenService(AppDbContext db, IOptions<AuthOptions> options, TimeProvider clock)
{
    public const string StampClaim = "stamp";
    private readonly AuthOptions opts = options.Value;

    public static UserDto ToDto(User u) => new(u.Id, u.Name, u.Email, u.Provider, u.EmailVerifiedAt);

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public async Task<Session> IssueAsync(User user, CancellationToken ct = default)
    {
        var (session, _) = Stage(user, Guid.NewGuid());
        await db.SaveChangesAsync(ct);
        return session;
    }

    /// <summary>Adds a refresh token to the unit of work without saving.</summary>
    private (Session Session, RefreshToken Entity) Stage(User user, Guid familyId)
    {
        var now = clock.GetUtcNow();
        var raw = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            FamilyId = familyId,
            TokenHash = Hash(raw),
            CreatedAt = now,
            ExpiresAt = now.AddDays(opts.RefreshTokenDays),
        };
        db.RefreshTokens.Add(entity);
        return (new Session(CreateAccessToken(user, now), opts.AccessTokenMinutes * 60, raw, ToDto(user)), entity);
    }

    private string CreateAccessToken(User user, DateTimeOffset now)
    {
        var token = new JwtSecurityToken(
            issuer: opts.Issuer,
            audience: opts.Audience,
            claims:
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(StampClaim, user.SecurityStamp.ToString()),
            ],
            notBefore: now.UtcDateTime,
            expires: now.AddMinutes(opts.AccessTokenMinutes).UtcDateTime,
            signingCredentials: new SigningCredentials(opts.Key(), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Rotates a refresh token. Null when invalid, expired or reused.</summary>
    public async Task<Session?> RefreshAsync(string? raw, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(raw) || raw.Length > 128) return null;
        var hash = Hash(raw);
        var current = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (current is null) return null;

        var now = clock.GetUtcNow();
        if (current.RevokedAt is not null)
        {
            // Reuse of a rotated token: someone else may hold this family. Kill it.
            await RevokeFamilyAsync(current.FamilyId, now, ct);
            return null;
        }
        if (current.ExpiresAt <= now) return null;

        var user = await db.Users.FindAsync([current.UserId], ct);
        if (user is null) return null;

        // Claim the token atomically: of N concurrent requests with the same token,
        // exactly one flips RevokedAt. The losers are treated as reuse.
        var claimed = await db.RefreshTokens
            .Where(t => t.Id == current.Id && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
        if (claimed == 0)
        {
            await RevokeFamilyAsync(current.FamilyId, now, ct);
            return null;
        }

        var (next, entity) = Stage(user, current.FamilyId);
        await db.SaveChangesAsync(ct);
        await db.RefreshTokens.Where(t => t.Id == current.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.ReplacedById, entity.Id), ct);
        return next;
    }

    public async Task RevokeAsync(string? raw, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(raw)) return;
        var hash = Hash(raw);
        var token = await db.RefreshTokens.SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        if (token is not null) await RevokeFamilyAsync(token.FamilyId, clock.GetUtcNow(), ct);
    }

    public async Task RevokeAllAsync(Guid userId, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        await db.RefreshTokens.Where(t => t.UserId == userId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
    }

    private Task RevokeFamilyAsync(Guid familyId, DateTimeOffset now, CancellationToken ct) =>
        db.RefreshTokens.Where(t => t.FamilyId == familyId && t.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.RevokedAt, now), ct);
}
