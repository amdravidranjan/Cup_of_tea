import type { NextRequest } from "next/server";

/**
 * The client IP for an audit entry.
 *
 * Behind the reverse proxy a government deployment would sit behind, the
 * socket address is the proxy's, so the forwarded headers are the only
 * useful source. `x-forwarded-for` is a comma-separated chain and the first
 * entry is the original client.
 *
 * These headers are client-settable and therefore spoofable. That is
 * acceptable for what this field is: a supporting detail on an audit row,
 * never an authorization input — the actor identity on every entry comes
 * from the session, not from here.
 */
export function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? null;
}
