/**
 * In-memory stand-in for the AlcancIA API (same routes and status codes as the
 * .NET backend), installed as global fetch. Lets store/sync tests exercise the
 * real client code without a network.
 */
type User = { id: string; name: string; email: string; password?: string; provider: 'password' | 'google'; stamp: number };
type Doc = { version: number; clientUpdatedAt: string; data: unknown };

export type FakeApi = {
  users: User[];
  docs: Map<string, Doc>;
  /** Valid email tickets: `${purpose}|${email}` → consumed once. */
  tickets: Set<string>;
  googleTokens: Map<string, { sub: string; email: string; name: string }>;
  offline: boolean;
  calls: { method: string; path: string }[];
  /** Simulates another device writing while we are away. */
  writeFromOtherDevice: (userId: string, data: unknown, clientUpdatedAt: string) => void;
  restore: () => void;
};

export function installFakeApi(): FakeApi {
  const original = globalThis.fetch;
  const sessions = new Map<string, { userId: string; revoked: boolean }>(); // refresh token → user
  const access = new Map<string, { userId: string; stamp: number }>();
  let seq = 0;

  const api: FakeApi = {
    users: [],
    docs: new Map(),
    tickets: new Set(),
    googleTokens: new Map(),
    offline: false,
    calls: [],
    writeFromOtherDevice: (userId, data, clientUpdatedAt) => {
      const current = api.docs.get(userId);
      api.docs.set(userId, { version: (current?.version ?? 0) + 1, clientUpdatedAt, data });
    },
    restore: () => {
      globalThis.fetch = original;
    },
  };

  const json = (status: number, body?: unknown) => ({ status, ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });
  const issue = (user: User) => {
    seq += 1;
    const refreshToken = `refresh-${seq}`;
    const accessToken = `access-${seq}`;
    sessions.set(refreshToken, { userId: user.id, revoked: false });
    access.set(accessToken, { userId: user.id, stamp: user.stamp });
    return { accessToken, expiresIn: 900, refreshToken, user: { id: user.id, name: user.name, email: user.email, provider: user.provider, emailVerifiedAt: '2026-09-23T12:00:00Z' } };
  };
  const authed = (headers: Record<string, string> | undefined) => {
    const token = headers?.Authorization?.replace('Bearer ', '');
    const entry = token ? access.get(token) : undefined;
    const user = entry && api.users.find((u) => u.id === entry.userId);
    return user && user.stamp === entry.stamp ? user : undefined;
  };

  globalThis.fetch = (async (url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) => {
    if (api.offline) throw new TypeError('Network request failed');
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const method = init?.method ?? 'GET';
    api.calls.push({ method, path });
    const body = init?.body ? JSON.parse(init.body) : {};

    if (method === 'POST' && path === '/api/auth/register') {
      if (api.users.some((u) => u.email === body.email)) return json(409, { error: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
      const key = `register|${body.email}`;
      if (body.ticket !== 'ticket-ok' || !api.tickets.delete(key)) return json(400, { error: 'Verifica tu correo antes de crear la cuenta.' });
      const user: User = { id: `user-${api.users.length + 1}`, name: body.name, email: body.email, password: body.password, provider: 'password', stamp: 0 };
      api.users.push(user);
      return json(201, issue(user));
    }
    if (method === 'POST' && path === '/api/auth/login') {
      const user = api.users.find((u) => u.email === body.email);
      if (user?.provider === 'google') return json(400, { error: 'Esta cuenta entra con Google. Usa ese botón.' });
      if (!user || user.password !== body.password) return json(401, { error: 'Correo o contraseña incorrectos.' });
      return json(200, issue(user));
    }
    if (method === 'POST' && path === '/api/auth/google') {
      const id = api.googleTokens.get(body.accessToken);
      if (!id) return json(401, { error: 'No pudimos confirmar tu cuenta de Google. Intenta de nuevo.' });
      let user = api.users.find((u) => u.provider === 'google' && u.id === `g-${id.sub}`);
      if (!user) {
        user = { id: `g-${id.sub}`, name: id.name, email: id.email, provider: 'google', stamp: 0 };
        api.users.push(user);
      }
      return json(200, issue(user));
    }
    if (method === 'POST' && path === '/api/auth/refresh') {
      const session = sessions.get(body.refreshToken);
      if (!session || session.revoked) return json(401, { error: 'Tu sesión venció. Vuelve a iniciar sesión.' });
      session.revoked = true;
      return json(200, issue(api.users.find((u) => u.id === session.userId)!));
    }
    if (method === 'POST' && path === '/api/auth/logout') {
      const session = sessions.get(body.refreshToken);
      if (session) session.revoked = true;
      return json(204);
    }
    if (method === 'POST' && path === '/api/auth/reset-password') {
      const user = api.users.find((u) => u.email === body.email);
      if (!user || !api.tickets.delete(`recover|${body.email}`)) return json(400, { error: 'El código no es válido o venció. Pide uno nuevo.' });
      user.password = body.password;
      user.stamp += 1;
      sessions.forEach((s) => { if (s.userId === user.id) s.revoked = true; });
      return json(204);
    }

    const user = authed(init?.headers);
    if (path.startsWith('/api/auth/me') || path.startsWith('/api/sync')) {
      if (!user) return json(401, { error: 'unauthorized' });
    }
    if (method === 'PUT' && path === '/api/auth/me') {
      user!.name = body.name;
      return json(200, { id: user!.id, name: user!.name, email: user!.email, provider: user!.provider, emailVerifiedAt: null });
    }
    if (method === 'POST' && path === '/api/auth/me/password') {
      if (user!.password !== body.currentPassword) return json(400, { error: 'La contraseña actual no coincide.' });
      user!.password = body.password;
      user!.stamp += 1;
      return json(200, issue(user!));
    }
    if (method === 'GET' && path === '/api/sync') {
      const doc = api.docs.get(user!.id);
      return doc ? json(200, doc) : json(204);
    }
    if (method === 'PUT' && path === '/api/sync') {
      const doc = api.docs.get(user!.id);
      if ((doc?.version ?? 0) !== body.baseVersion) return json(409, doc);
      const next = { version: (doc?.version ?? 0) + 1, clientUpdatedAt: body.clientUpdatedAt, data: body.data };
      api.docs.set(user!.id, next);
      return json(200, { version: next.version, clientUpdatedAt: next.clientUpdatedAt });
    }
    return json(404, { error: 'not found' });
  }) as unknown as typeof fetch;

  return api;
}
