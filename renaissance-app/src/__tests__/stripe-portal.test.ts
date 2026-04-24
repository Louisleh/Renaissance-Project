import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseMock, type SupabaseMock } from '../test/supabase-mock';

let mock: SupabaseMock;

vi.hoisted(() => {
  // Stripe module reads import.meta.env at import time; stub before any
  // dynamic import pulls it in.
  import.meta.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
  import.meta.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
});

vi.mock('../lib/supabase', () => ({
  get supabase() {
    return mock.client;
  },
  get isSupabaseConfigured() {
    return true;
  },
}));

type StripeModule = typeof import('../lib/stripe');
let stripeMod: StripeModule;

describe('openCustomerPortal', () => {
  beforeEach(async () => {
    mock = createSupabaseMock();
    (mock.client as { auth: { getSession: ReturnType<typeof vi.fn> } }).auth.getSession = vi
      .fn()
      .mockResolvedValue({
        data: { session: { access_token: 'user-jwt' } },
      });

    // Keep navigation out of jsdom; assign to a replaceable stub.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: '' },
    });

    stripeMod = await import('../lib/stripe');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('never sends a customer_id in the body (server trusts JWT only)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ url: 'https://billing.stripe.com/session/abc' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await stripeMod.openCustomerPortal();
    expect(result.error).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const call = fetchSpy.mock.calls[0];
    const url = String(call[0]);
    expect(url).toContain('/functions/v1/create-portal-session');

    const init = call[1] as RequestInit;
    const body = JSON.parse(String(init.body));
    expect(body).toEqual({});
    expect('customer_id' in body).toBe(false);

    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer user-jwt');
  });

  it('returns a friendly error when the edge function fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'No billing account on file.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await stripeMod.openCustomerPortal();
    expect(result.error).toBe('No billing account on file.');
  });
});
