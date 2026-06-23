/**
 * Phase-1 proxy to the legacy web-energy backend. The browser calls
 * same-origin `/api/web-energy/<path>` (no CORS); this handler forwards to the
 * real API, keeping the base URL server-side and passing the Bearer token
 * through. Set WEB_ENERGY_API_BASE_URL to point at the backend.
 */
const BASE_URL =
  process.env.WEB_ENERGY_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://vinuni-api.eagle-p.vn";

async function proxy(
  req: Request,
  params: Promise<{ path: string[] }>,
): Promise<Response> {
  const { path } = await params;
  const incoming = new URL(req.url);
  const target = `${BASE_URL}/${path.join("/")}${incoming.search}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  const auth = req.headers.get("authorization");
  if (auth) headers.Authorization = auth;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    headers["Content-Type"] = "application/json";
    init.body = await req.text();
  }

  try {
    const res = await fetch(target, init);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return Response.json(
      { isSuccess: false, message: "Upstream request failed" },
      { status: 502 },
    );
  }
}

export function GET(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx.params);
}

export function POST(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, ctx.params);
}
