using AlcancIA.Api;

namespace AlcancIA.Tests.Api;

public class EmailVerificationTests
{
    private sealed class FakeMailer : IVerificationMailer
    {
        public List<(string Email, string Code)> Sent { get; } = [];
        public bool Fail { get; set; }

        public Task SendAsync(string email, string code, CancellationToken ct)
        {
            if (Fail) throw new InvalidOperationException("Email delivery is not configured.");
            Sent.Add((email, code));
            return Task.CompletedTask;
        }
    }

    private sealed class ManualClock(DateTimeOffset start) : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = start;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private static (EmailVerification Sut, FakeMailer Mailer, ManualClock Clock) Create()
    {
        var mailer = new FakeMailer();
        var clock = new ManualClock(new DateTimeOffset(2026, 9, 23, 12, 0, 0, TimeSpan.Zero));
        return (new EmailVerification(mailer, clock), mailer, clock);
    }

    private static string ChallengeId(object body) =>
        (string)body.GetType().GetProperty("challengeId")!.GetValue(body)!;

    [Fact]
    public async Task Sends_a_six_digit_code_and_accepts_it_once()
    {
        var (sut, mailer, _) = Create();
        var (status, body) = await sut.Request(" Ana@Mail.com ", "register", CancellationToken.None);

        Assert.Equal(200, status);
        var (email, code) = Assert.Single(mailer.Sent);
        Assert.Equal("ana@mail.com", email);
        Assert.Matches("^[0-9]{6}$", code);

        var id = ChallengeId(body);
        Assert.True(sut.Verify(id, "ana@mail.com", "register", code));
        Assert.False(sut.Verify(id, "ana@mail.com", "register", code)); // single use
    }

    [Fact]
    public async Task Rejects_wrong_code_email_or_purpose()
    {
        var (sut, mailer, _) = Create();
        var (_, body) = await sut.Request("ana@mail.com", "recover", CancellationToken.None);
        var id = ChallengeId(body);
        var code = mailer.Sent[0].Code;
        var wrong = code == "000000" ? "111111" : "000000";

        Assert.False(sut.Verify(id, "ana@mail.com", "recover", wrong));
        Assert.False(sut.Verify(id, "otro@mail.com", "recover", code));
        Assert.False(sut.Verify(id, "ana@mail.com", "register", code));
        Assert.True(sut.Verify(id, "ana@mail.com", "recover", code));
    }

    [Fact]
    public async Task Code_expires_after_ten_minutes()
    {
        var (sut, mailer, clock) = Create();
        var (_, body) = await sut.Request("ana@mail.com", "register", CancellationToken.None);
        clock.Now = clock.Now.AddMinutes(10).AddSeconds(1);

        Assert.False(sut.Verify(ChallengeId(body), "ana@mail.com", "register", mailer.Sent[0].Code));
    }

    [Fact]
    public async Task Locks_the_challenge_after_five_wrong_attempts()
    {
        var (sut, mailer, _) = Create();
        var (_, body) = await sut.Request("ana@mail.com", "register", CancellationToken.None);
        var id = ChallengeId(body);
        var code = mailer.Sent[0].Code;
        var wrong = code == "000000" ? "111111" : "000000";

        for (var i = 0; i < 5; i++) Assert.False(sut.Verify(id, "ana@mail.com", "register", wrong));
        Assert.False(sut.Verify(id, "ana@mail.com", "register", code)); // even the right code is refused now
    }

    [Fact]
    public async Task Enforces_a_one_minute_cooldown_and_replaces_the_previous_code()
    {
        var (sut, mailer, clock) = Create();
        var (_, first) = await sut.Request("ana@mail.com", "register", CancellationToken.None);

        var (status, _) = await sut.Request("ana@mail.com", "register", CancellationToken.None);
        Assert.Equal(429, status);
        Assert.Single(mailer.Sent);

        clock.Now = clock.Now.AddMinutes(1).AddSeconds(1);
        var (again, second) = await sut.Request("ana@mail.com", "register", CancellationToken.None);
        Assert.Equal(200, again);
        Assert.False(sut.Verify(ChallengeId(first), "ana@mail.com", "register", mailer.Sent[0].Code));
        Assert.True(sut.Verify(ChallengeId(second), "ana@mail.com", "register", mailer.Sent[1].Code));
    }

    [Fact]
    public async Task Reports_unavailable_when_mail_is_not_configured()
    {
        var (sut, mailer, _) = Create();
        mailer.Fail = true;
        var (status, _) = await sut.Request("ana@mail.com", "register", CancellationToken.None);
        Assert.Equal(503, status);
    }

    [Theory]
    [InlineData("no-es-correo", "register")]
    [InlineData("ana@mail.com", "hack")]
    [InlineData("", "register")]
    public async Task Rejects_invalid_input(string email, string purpose)
    {
        var (sut, mailer, _) = Create();
        var (status, _) = await sut.Request(email, purpose, CancellationToken.None);
        Assert.Equal(400, status);
        Assert.Empty(mailer.Sent);
    }
}
