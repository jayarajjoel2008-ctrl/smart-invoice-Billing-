export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) { super(message); this.name = 'ApiError'; this.status = status; }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: { 'X-BillPro-Request': '1', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError('Could not reach the BillPro API. Check that the server is running, or use the demo workspace.');
  }
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    const message = payload?.error || payload?.message || (response.status === 401
      ? 'Your session is not authenticated. Sign in or explore the demo workspace.'
      : `The request failed (${response.status}). Please try again.`);
    throw new ApiError(String(message), response.status);
  }
  return payload as T;
}

export const jsonBody = (body: unknown) => JSON.stringify(body);
