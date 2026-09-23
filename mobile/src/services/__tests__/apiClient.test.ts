import {
  __resetApiClientForTests,
  authRequest,
  clearSession,
  getRefreshToken,
  saveSession,
  setSessionLostHandler,
  type ServerSession,
} from '@/services/apiClient';

type Call = { path: string; auth?: string; body?: string };

function server(handler: (call: Call) => { status: number; body?: unknown }) {
  const calls: Call[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: string, init?: { headers?: Record<string, string>; body?: string }) => {
    const call = { path: url.replace(/^https?:\/\/[^/]+/, ''), auth: init?.headers?.Authorization, body: init?.body };
    calls.push(call);
    // Let parallel requests interleave like on a real network.
    await new Promise((r) => setTimeout(r, 5));
    const { status, body } = handler(call);
    return { status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) };
  }) as unknown as typeof fetch;
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const session = (n: number): ServerSession => ({
  accessToken: `access-${n}`,
  expiresIn: 900,
  refreshToken: `refresh-${n}`,
  user: { id: 'u1', name: 'Ana', email: 'ana@mail.com', provider: 'password', emailVerifiedAt: null },
});

describe('apiClient', () => {
  beforeEach(async () => {
    __resetApiClientForTests();
    await clearSession();
  });

  it('refreshes ONCE for parallel requests with an expired access token, then retries them', async () => {
    await saveSession(session(1));
    const api = server(({ path, auth }) => {
      if (path === '/api/auth/refresh') return { status: 200, body: session(2) };
      return auth === 'Bearer access-2' ? { status: 200, body: { ok: true } } : { status: 401, body: {} };
    });
    try {
      const results = await Promise.all([authRequest('GET', '/api/sync'), authRequest('GET', '/api/sync'), authRequest('GET', '/api/auth/me')]);
      expect(results.every((r) => r.ok)).toBe(true);
      expect(api.calls.filter((c) => c.path === '/api/auth/refresh')).toHaveLength(1);
      expect(await getRefreshToken()).toBe('refresh-2');
    } finally {
      api.restore();
    }
  });

  it('a rejected refresh clears the session and notifies the app', async () => {
    await saveSession(session(1));
    const lost = jest.fn();
    setSessionLostHandler(lost);
    const api = server(({ path }) => (path === '/api/auth/refresh' ? { status: 401, body: { error: 'x' } } : { status: 401, body: {} }));
    try {
      const result = await authRequest('GET', '/api/sync');
      expect(result).toMatchObject({ ok: false, status: 401, offline: false });
      expect(lost).toHaveBeenCalledTimes(1);
      expect(await getRefreshToken()).toBeNull();
    } finally {
      api.restore();
    }
  });

  it('being offline keeps the session (no forced logout)', async () => {
    await saveSession(session(1));
    __resetApiClientForTests(); // app restarted: no access token in memory
    const lost = jest.fn();
    setSessionLostHandler(lost);
    const original = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch;
    try {
      const result = await authRequest('GET', '/api/sync');
      expect(result).toMatchObject({ ok: false, offline: true });
      expect(lost).not.toHaveBeenCalled();
      expect(await getRefreshToken()).toBe('refresh-1');
    } finally {
      globalThis.fetch = original;
    }
  });
});
