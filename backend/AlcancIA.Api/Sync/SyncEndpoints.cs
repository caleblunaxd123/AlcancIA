using System.Security.Claims;
using System.Text;
using System.Text.Json;
using AlcancIA.Api.Auth;
using AlcancIA.Domain.Accounts;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlcancIA.Api.Sync;

public sealed record SyncDocument(long Version, DateTimeOffset ClientUpdatedAt, JsonElement Data);
public sealed record SyncPush(long BaseVersion, DateTimeOffset ClientUpdatedAt, JsonElement Data);

/// <summary>
/// One encrypted JSON document per user with optimistic versioning. A push
/// whose baseVersion is not the server's version gets 409 plus the server copy,
/// so the app can decide (most recent edit wins) without losing anything silently.
/// The server stores the data; it never computes finances from it (§38).
/// </summary>
public static class SyncEndpoints
{
    public const int MaxDocumentBytes = 2 * 1024 * 1024;

    public static void MapSyncEndpoints(this WebApplication app)
    {
        var sync = app.MapGroup("/api/sync").RequireAuthorization().RequireRateLimiting("sync");

        sync.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, IDataProtectionProvider dp, CancellationToken ct) =>
        {
            if (AccountEndpoints.UserId(principal) is not { } userId) return Results.Unauthorized();
            var row = await db.UserData.AsNoTracking().SingleOrDefaultAsync(d => d.UserId == userId, ct);
            return row is null ? Results.NoContent() : Results.Ok(ToDocument(row, Protector(dp)));
        });

        sync.MapPut("/", async (SyncPush push, ClaimsPrincipal principal, AppDbContext db, IDataProtectionProvider dp, TimeProvider clock, CancellationToken ct) =>
        {
            if (AccountEndpoints.UserId(principal) is not { } userId) return Results.Unauthorized();
            if (push.Data.ValueKind != JsonValueKind.Object) return Results.Json(new { error = "Datos inválidos." }, statusCode: 400);
            var json = push.Data.GetRawText();
            if (Encoding.UTF8.GetByteCount(json) > MaxDocumentBytes) return Results.Json(new { error = "Tus datos superan el límite de sincronización." }, statusCode: 413);

            var protector = Protector(dp);
            var row = await db.UserData.SingleOrDefaultAsync(d => d.UserId == userId, ct);
            var current = row?.Version ?? 0;
            if (push.BaseVersion != current) return Results.Json(ToDocument(row!, protector), statusCode: 409);

            var now = clock.GetUtcNow();
            // Never let a device clock claim a time in the future.
            var clientTime = push.ClientUpdatedAt > now ? now : push.ClientUpdatedAt;
            if (row is null)
            {
                row = new UserData { UserId = userId };
                db.UserData.Add(row);
            }
            row.Payload = protector.Protect(Encoding.UTF8.GetBytes(json));
            row.Version = current + 1;
            row.UpdatedAt = now;
            row.ClientUpdatedAt = clientTime;

            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateConcurrencyException)
            {
                // Another device won the race between our read and write.
                db.ChangeTracker.Clear();
                var latest = await db.UserData.AsNoTracking().SingleAsync(d => d.UserId == userId, ct);
                return Results.Json(ToDocument(latest, protector), statusCode: 409);
            }
            catch (DbUpdateException) when (current == 0)
            {
                db.ChangeTracker.Clear();
                var latest = await db.UserData.AsNoTracking().SingleAsync(d => d.UserId == userId, ct);
                return Results.Json(ToDocument(latest, protector), statusCode: 409);
            }
            return Results.Ok(new { version = row.Version, clientUpdatedAt = row.ClientUpdatedAt });
        }).WithMetadata(new RequestSizeLimitAttribute(MaxDocumentBytes + 64 * 1024));
    }

    private static IDataProtector Protector(IDataProtectionProvider dp) => dp.CreateProtector("AlcancIA.UserData.v1");

    private static SyncDocument ToDocument(UserData row, IDataProtector protector)
    {
        using var doc = JsonDocument.Parse(protector.Unprotect(row.Payload));
        return new SyncDocument(row.Version, row.ClientUpdatedAt, doc.RootElement.Clone());
    }
}
