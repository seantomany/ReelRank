import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/config/api', () => ({
  API_URL: 'http://localhost:3001',
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it('constructs correct URL for GET requests', async () => {
    (global.fetch as any).mockResolvedValue({
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: [] }),
    });

    const { apiFetch } = await import('../src/utils/api');
    await apiFetch('/api/movies/trending');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/movies/trending',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('includes auth header when token provided', async () => {
    (global.fetch as any).mockResolvedValue({
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ data: {} }),
    });

    const { apiFetch } = await import('../src/utils/api');
    await apiFetch('/api/solo/stats', { token: 'test-token' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('handles non-JSON responses gracefully', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 502,
      headers: { get: () => 'text/html' },
    });

    const { apiFetch } = await import('../src/utils/api');
    const result = await apiFetch('/api/test');

    expect(result.error).toContain('Server error');
  });

  it('handles network errors', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network failure'));

    const { apiFetch } = await import('../src/utils/api');
    const result = await apiFetch('/api/test');

    expect(result.error).toBe('Network failure');
  });
});
