using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using AlcancIA.Domain.Accounts;
using AlcancIA.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AlcancIA.Api.Auth;

public sealed record RegisterRequest(string? Name, string? Email, string? Password, string? Ticket);
public sealed record LoginRequest(string? Email, string? Password);
public sealed record GoogleRequest(string? AccessToken);
public sealed record RefreshRequest(string? RefreshToken);
public sealed record ResetPasswordRequest(string? Email, string? Password, string? Ticket);
public sealed record UpdateProfileRequest(string? Name);
public sealed record ChangePasswordRequest(string? CurrentPassword, string? Password);
public sealed record DeleteAccountRequest(string? Ticket);

public static partial class AccountEndpoints
{
    private const string BadCredentials = "Correo o contraseña incorrectos.";

    [GeneratedRegex("[A-Z]")] private static partial Regex Upper();
    [GeneratedRegex("[a-z]")] private static partial Regex Lower();
    [GeneratedRegex("[0-9]")] private static partial Regex Digit();

    /// <summary>Same rule as the app: 8+ chars with upper, lower and a number.</summary>
    public static string? PasswordProblem(string? password) =>
        password is null || password.Length < 8 || password.Length > 128 || !Upper().IsMatch(password) || !Lower().IsMatch(password) || !Digit().IsMatch(password)
            ? "La contraseña necesita 8+ caracteres, mayúscula, minúscula y número."
            : null;

    private static IResult Error(int status, string message) => Results.Json(new { error = message }, statusCode: status);

    public static Guid? UserId(ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("sub"), out var id) ? id : null;

    public static void MapAccountEndpoints(this WebApplication app)
    {
        var auth = app.MapGroup("/api/auth").RequireRateLimiting("auth");

        auth.MapPost("/register", async (RegisterRequest req, AppDbContext db, VerificationTickets tickets, TokenService tokens,
            IPasswordHasher<User> hasher, TimeProvider clock, CancellationToken ct) =>
        {
            var email = EmailVerification.Normalize(req.Email ?? "");
            var name = (req.Name ?? "").Trim();
            if (name.Length is < 2 or > 80) return Error(400, "Escribe tu nombre.");
            if (!EmailVerification.Valid(email, "register")) return Error(400, "Revisa el correo electrónico.");
            if (PasswordProblem(req.Password) is { } problem) return Error(400, problem);
            if (await db.Users.AnyAsync(u => u.Email == email, ct)) return Error(409, "Ya existe una cuenta con ese correo. Inicia sesión.");
            if (!tickets.TryConsume(req.Ticket, email, "register")) return Error(400, "Verifica tu correo antes de crear la cuenta.");

            var user = new User { Id = Guid.NewGuid(), Email = email, Name = name, Provider = "password", EmailVerifiedAt = clock.GetUtcNow(), CreatedAt = clock.GetUtcNow() };
            user.PasswordHash = hasher.HashPassword(user, req.Password!);
            db.Users.Add(user);
            try { await db.SaveChangesAsync(ct); }
            catch (DbUpdateException) { return Error(409, "Ya existe una cuenta con ese correo. Inicia sesión."); }
            return Results.Json(await tokens.IssueAsync(user, ct), statusCode: 201);
        });

        auth.MapPost("/login", async (LoginRequest req, AppDbContext db, TokenService tokens, IPasswordHasher<User> hasher, CancellationToken ct) =>
        {
            var email = EmailVerification.Normalize(req.Email ?? "");
            var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email, ct);
            if (user is { Provider: "google" }) return Error(400, "Esta cuenta entra con Google. Usa ese botón.");
            if (user?.PasswordHash is null || string.IsNullOrEmpty(req.Password)) return Error(401, BadCredentials);

            var result = hasher.VerifyHashedPassword(user, user.PasswordHash, req.Password);
            if (result == PasswordVerificationResult.Failed) return Error(401, BadCredentials);
            if (result == PasswordVerificationResult.SuccessRehashNeeded) user.PasswordHash = hasher.HashPassword(user, req.Password);
            return Results.Ok(await tokens.IssueAsync(user, ct));
        });

        auth.MapPost("/google", async (GoogleRequest req, AppDbContext db, IGoogleTokenVerifier google, TokenService tokens, TimeProvider clock, CancellationToken ct) =>
        {
            var identity = await google.VerifyAsync(req.AccessToken ?? "", ct);
            if (identity is null) return Error(401, "No pudimos confirmar tu cuenta de Google. Intenta de nuevo.");

            var user = await db.Users.SingleOrDefaultAsync(u => u.Provider == "google" && u.ProviderUserId == identity.Subject, ct);
            if (user is null)
            {
                if (await db.Users.AnyAsync(u => u.Email == identity.Email, ct))
                    return Error(409, "Ya tienes una cuenta con este correo. Entra con tu correo y contraseña.");
                user = new User
                {
                    Id = Guid.NewGuid(), Email = identity.Email, Name = identity.Name, Provider = "google",
                    ProviderUserId = identity.Subject, EmailVerifiedAt = clock.GetUtcNow(), CreatedAt = clock.GetUtcNow(),
                };
                db.Users.Add(user);
            }
            return Results.Ok(await tokens.IssueAsync(user, ct));
        });

        auth.MapPost("/refresh", async (RefreshRequest req, TokenService tokens, CancellationToken ct) =>
            await tokens.RefreshAsync(req.RefreshToken, ct) is { } session
                ? Results.Ok(session)
                : Error(401, "Tu sesión venció. Vuelve a iniciar sesión."));

        auth.MapPost("/logout", async (RefreshRequest req, TokenService tokens, CancellationToken ct) =>
        {
            await tokens.RevokeAsync(req.RefreshToken, ct);
            return Results.NoContent();
        });

        auth.MapPost("/reset-password", async (ResetPasswordRequest req, AppDbContext db, VerificationTickets tickets, TokenService tokens,
            IPasswordHasher<User> hasher, CancellationToken ct) =>
        {
            var email = EmailVerification.Normalize(req.Email ?? "");
            if (PasswordProblem(req.Password) is { } problem) return Error(400, problem);
            var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email, ct);
            if (user is null || user.Provider != "password" || !tickets.TryConsume(req.Ticket, email, "recover"))
                return Error(400, "El código no es válido o venció. Pide uno nuevo.");

            user.PasswordHash = hasher.HashPassword(user, req.Password!);
            user.SecurityStamp++; // invalidates every access token already issued
            await db.SaveChangesAsync(ct);
            await tokens.RevokeAllAsync(user.Id, ct);
            return Results.NoContent();
        });

        var me = app.MapGroup("/api/auth/me").RequireAuthorization().RequireRateLimiting("auth");

        me.MapGet("/", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
            UserId(principal) is { } id && await db.Users.FindAsync([id], ct) is { } user
                ? Results.Ok(TokenService.ToDto(user))
                : Results.Unauthorized());

        me.MapPut("/", async (UpdateProfileRequest req, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            if (UserId(principal) is not { } id || await db.Users.FindAsync([id], ct) is not { } user) return Results.Unauthorized();
            var name = (req.Name ?? "").Trim();
            if (name.Length is < 2 or > 80) return Error(400, "Escribe tu nombre.");
            user.Name = name;
            await db.SaveChangesAsync(ct);
            return Results.Ok(TokenService.ToDto(user));
        });

        // Data export (right of access, Ley 29733 / GDPR-style): profile + the decrypted document.
        me.MapGet("/export", async (ClaimsPrincipal principal, AppDbContext db, IDataProtectionProvider dp, TimeProvider clock, CancellationToken ct) =>
        {
            if (UserId(principal) is not { } id || await db.Users.FindAsync([id], ct) is not { } user) return Results.Unauthorized();
            var row = await db.UserData.AsNoTracking().SingleOrDefaultAsync(d => d.UserId == id, ct);
            JsonElement? data = null;
            if (row is not null)
            {
                using var doc = JsonDocument.Parse(dp.CreateProtector(Sync.SyncEndpoints.ProtectorPurpose).Unprotect(row.Payload));
                data = doc.RootElement.Clone();
            }
            return Results.Ok(new
            {
                exportedAt = clock.GetUtcNow(),
                account = new { user.Email, user.Name, user.Provider, user.EmailVerifiedAt, user.CreatedAt },
                data,
            });
        });

        // Account deletion (store policy + §21). Requires a fresh email code so an
        // unlocked phone alone cannot erase the account. Cascades to sessions and data.
        me.MapDelete("/", async ([FromBody] DeleteAccountRequest req, ClaimsPrincipal principal, AppDbContext db, VerificationTickets tickets, CancellationToken ct) =>
        {
            if (UserId(principal) is not { } id || await db.Users.FindAsync([id], ct) is not { } user) return Results.Unauthorized();
            if (!tickets.TryConsume(req.Ticket, user.Email, "delete")) return Error(400, "Confirma con el código que te enviamos por correo.");
            db.Users.Remove(user);
            await db.SaveChangesAsync(ct);
            return Results.NoContent();
        });

        // Changing the password signs out every other device and returns a fresh session for this one.
        me.MapPost("/password", async (ChangePasswordRequest req, ClaimsPrincipal principal, AppDbContext db, TokenService tokens,
            IPasswordHasher<User> hasher, CancellationToken ct) =>
        {
            if (UserId(principal) is not { } id || await db.Users.FindAsync([id], ct) is not { } user) return Results.Unauthorized();
            if (user.PasswordHash is null) return Error(400, "Esta cuenta entra con Google y no usa contraseña.");
            if (hasher.VerifyHashedPassword(user, user.PasswordHash, req.CurrentPassword ?? "") == PasswordVerificationResult.Failed)
                return Error(400, "La contraseña actual no coincide.");
            if (PasswordProblem(req.Password) is { } problem) return Error(400, problem);
            if (req.CurrentPassword == req.Password) return Error(400, "La nueva contraseña debe ser diferente.");

            user.PasswordHash = hasher.HashPassword(user, req.Password!);
            user.SecurityStamp++;
            await db.SaveChangesAsync(ct);
            await tokens.RevokeAllAsync(user.Id, ct);
            return Results.Ok(await tokens.IssueAsync(user, ct));
        });
    }
}
