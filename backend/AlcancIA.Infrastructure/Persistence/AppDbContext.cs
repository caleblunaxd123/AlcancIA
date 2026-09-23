using AlcancIA.Domain.Accounts;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AlcancIA.Infrastructure.Persistence;

/// <summary>
/// Accounts, sessions and each user's encrypted data document. Also stores
/// the Data Protection key ring, so encrypted payloads survive restarts and
/// can be read by every API instance that shares this database.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<UserData> UserData => Set<UserData>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).HasMaxLength(254).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Name).HasMaxLength(80).IsRequired();
            e.Property(x => x.PasswordHash).HasMaxLength(512);
            e.Property(x => x.Provider).HasMaxLength(16).IsRequired();
            e.Property(x => x.ProviderUserId).HasMaxLength(128);
            e.HasIndex(x => new { x.Provider, x.ProviderUserId }).IsUnique();
        });

        model.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(x => x.Id);
            e.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.FamilyId);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<UserData>(e =>
        {
            e.ToTable("user_data");
            e.HasKey(x => x.UserId);
            e.Property(x => x.Payload).IsRequired();
            // Optimistic concurrency: a stale write never silently overwrites.
            e.Property(x => x.Version).IsConcurrencyToken();
            e.HasOne<User>().WithOne().HasForeignKey<UserData>(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        model.Entity<DataProtectionKey>().ToTable("data_protection_keys");
    }
}
