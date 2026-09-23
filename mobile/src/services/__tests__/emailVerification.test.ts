import { requestEmailCode, verifyEmailCode } from '@/services/emailVerification';

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ status, json: () => Promise.resolve(body) });

describe('emailVerification service', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('requests a code with a normalized email and returns the challenge', async () => {
    const fetchMock = respond(200, { challengeId: 'c'.repeat(64), expiresInSeconds: 600, resendAfterSeconds: 60 });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await requestEmailCode('  Ana@Mail.com ', 'register');

    expect(result).toEqual({ ok: true, challengeId: 'c'.repeat(64), resendAfterSeconds: 60 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/api\/email\/request$/);
    expect(JSON.parse(init.body)).toEqual({ email: 'ana@mail.com', purpose: 'register' });
  });

  it('surfaces the server message when mail is not configured or rate-limited', async () => {
    globalThis.fetch = respond(503, { error: 'No pudimos enviar el correo.' }) as unknown as typeof fetch;
    expect(await requestEmailCode('ana@mail.com', 'register')).toEqual({ ok: false, error: 'No pudimos enviar el correo.' });

    globalThis.fetch = respond(429, {}) as unknown as typeof fetch;
    const limited = await requestEmailCode('ana@mail.com', 'register');
    expect(limited.ok).toBe(false);
  });

  it('explains when the server cannot be reached', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as unknown as typeof fetch;
    const result = await requestEmailCode('ana@mail.com', 'recover');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('conexión');
  });

  it('verifies only 6-digit codes and reports server rejections', async () => {
    const fetchMock = respond(200, { verified: true });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(await verifyEmailCode({ challengeId: 'x', email: 'ana@mail.com', purpose: 'register', code: '12 34 56' })).toEqual({ ok: true });
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).code).toBe('123456');

    expect((await verifyEmailCode({ challengeId: 'x', email: 'ana@mail.com', purpose: 'register', code: '123' })).ok).toBe(false);

    globalThis.fetch = respond(400, { error: 'El código no es válido o venció.' }) as unknown as typeof fetch;
    expect(await verifyEmailCode({ challengeId: 'x', email: 'ana@mail.com', purpose: 'register', code: '000000' }))
      .toEqual({ ok: false, error: 'El código no es válido o venció.' });
  });
});
