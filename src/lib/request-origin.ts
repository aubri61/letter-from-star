/** Next's dev proxy may normalize request.url to localhost; preserve loopback Host only. */
export function requestOrigin(
  request: Request,
  development = process.env.NODE_ENV === "development",
): string {
  const url = new URL(request.url);
  if (!development) return url.origin;
  const host = request.headers.get("host");
  if (!host) return url.origin;
  try {
    const candidate = new URL(`${url.protocol}//${host}`);
    if (
      ["127.0.0.1", "localhost", "[::1]"].includes(candidate.hostname) &&
      candidate.pathname === "/" &&
      !candidate.username &&
      !candidate.password
    )
      return candidate.origin;
  } catch {
    /* Fall back to the framework URL for malformed hosts. */
  }
  return url.origin;
}
