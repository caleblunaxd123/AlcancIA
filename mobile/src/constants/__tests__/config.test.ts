import { MISCONFIGURED_API_URL, resolveApiBaseUrl } from '@/constants/config';

describe('resolveApiBaseUrl', () => {
  it('release builds only accept HTTPS', () => {
    expect(resolveApiBaseUrl('https://api.alcancia.app/', false, 'android')).toBe('https://api.alcancia.app');
    expect(resolveApiBaseUrl('http://api.alcancia.app', false, 'android')).toBe(MISCONFIGURED_API_URL);
    expect(resolveApiBaseUrl(undefined, false, 'ios')).toBe(MISCONFIGURED_API_URL);
    expect(resolveApiBaseUrl('   ', false, 'ios')).toBe(MISCONFIGURED_API_URL);
  });

  it('development falls back to the local backend', () => {
    expect(resolveApiBaseUrl(undefined, true, 'android')).toBe('http://127.0.0.1:5080');
    expect(resolveApiBaseUrl('', true, 'ios')).toBe('http://localhost:5080');
    expect(resolveApiBaseUrl('http://192.168.1.10:5080', true, 'android')).toBe('http://192.168.1.10:5080');
  });
});
