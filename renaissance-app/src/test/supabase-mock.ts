import { vi, type Mock } from 'vitest';

export interface SupabaseMockRequest {
  table: string;
  operation: 'select' | 'insert' | 'upsert' | 'update' | 'delete';
  filters: Record<string, unknown>;
  payload?: unknown;
  options?: unknown;
}

export interface SupabaseMockResponse {
  data: unknown;
  error: { message: string; code?: string } | null;
}

type ResponseHandler =
  | SupabaseMockResponse
  | ((req: SupabaseMockRequest) => SupabaseMockResponse);

interface TableResponders {
  select?: ResponseHandler;
  insert?: ResponseHandler;
  upsert?: ResponseHandler;
  update?: ResponseHandler;
  delete?: ResponseHandler;
}

export interface SupabaseMock {
  client: unknown;
  calls: SupabaseMockRequest[];
  setResponse: (
    table: string,
    operation: keyof TableResponders,
    response: ResponseHandler,
  ) => void;
  reset: () => void;
  fromSpy: Mock;
}

function okResponse(operation: SupabaseMockRequest['operation']): SupabaseMockResponse {
  if (operation === 'select') return { data: [], error: null };
  return { data: null, error: null };
}

export function createSupabaseMock(): SupabaseMock {
  const calls: SupabaseMockRequest[] = [];
  const responders = new Map<string, TableResponders>();

  function resolve(req: SupabaseMockRequest): SupabaseMockResponse {
    calls.push(req);
    const handler = responders.get(req.table)?.[req.operation];
    if (!handler) return okResponse(req.operation);
    return typeof handler === 'function' ? handler(req) : handler;
  }

  function makeChain(table: string, operation: SupabaseMockRequest['operation'], payload?: unknown, options?: unknown) {
    const filters: Record<string, unknown> = {};
    const chain: Record<string, unknown> = {
      eq(column: string, value: unknown) {
        filters[column] = value;
        return chain;
      },
      order() {
        return chain;
      },
      maybeSingle() {
        const res = resolve({ table, operation, filters, payload, options });
        const data = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
        return Promise.resolve({ data, error: res.error });
      },
      single() {
        const res = resolve({ table, operation, filters, payload, options });
        const data = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
        return Promise.resolve({ data, error: res.error });
      },
      then(resolve_: (r: SupabaseMockResponse) => unknown, reject_?: (e: unknown) => unknown) {
        const res = resolve({ table, operation, filters, payload, options });
        return Promise.resolve(res).then(resolve_, reject_);
      },
    };
    return chain;
  }

  const fromSpy = vi.fn((table: string) => ({
    select: (_cols?: string) => makeChain(table, 'select'),
    insert: (payload: unknown) => makeChain(table, 'insert', payload),
    upsert: (payload: unknown, options?: unknown) => makeChain(table, 'upsert', payload, options),
    update: (payload: unknown) => makeChain(table, 'update', payload),
    delete: () => makeChain(table, 'delete'),
  }));

  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signOut: vi.fn(async () => ({ error: null })),
    signInWithOtp: vi.fn(async () => ({ error: null })),
    signInWithOAuth: vi.fn(async () => ({ error: null })),
  };

  const client = { from: fromSpy, auth };

  return {
    client,
    calls,
    setResponse(table, operation, response) {
      const existing = responders.get(table) ?? {};
      existing[operation] = response;
      responders.set(table, existing);
    },
    reset() {
      calls.length = 0;
      responders.clear();
      fromSpy.mockClear();
    },
    fromSpy,
  };
}
