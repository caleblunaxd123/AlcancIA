namespace AlcancIA.Domain.Accounts;

/// <summary>An AlcancIA account. Email is stored normalized (trimmed, lower-case).</summary>
public sealed class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    /// <summary>PBKDF2 hash (ASP.NET Identity format). Null for Google-only accounts.</summary>
    public string? PasswordHash { get; set; }
    /// <summary>"password" or "google".</summary>
    public string Provider { get; set; } = "password";
    /// <summary>Stable Google subject id for Google accounts.</summary>
    public string? ProviderUserId { get; set; }
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    /// <summary>Bumped on password reset: every older access token becomes invalid.</summary>
    public int SecurityStamp { get; set; }
}

/// <summary>
/// One refresh token in a rotation family. Only a SHA-256 hash is stored.
/// Reusing a rotated token revokes the whole family (stolen-token signal).
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid FamilyId { get; set; }
    public string TokenHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? ReplacedById { get; set; }
}

/// <summary>
/// The user's financial data as one versioned document, encrypted at rest.
/// Version increases by one on every accepted write (optimistic concurrency).
/// </summary>
public sealed class UserData
{
    public Guid UserId { get; set; }
    public byte[] Payload { get; set; } = [];
    public long Version { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    /// <summary>Client-side time of the last edit, used for "most recent wins".</summary>
    public DateTimeOffset ClientUpdatedAt { get; set; }
}
