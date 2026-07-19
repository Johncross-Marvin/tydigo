import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const serverDir = join(process.cwd(), "dist", "server");

const worker = `const worker = {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status !== 404) {
      return withSecurityHeaders(assetResponse, url.pathname);
    }

    const indexUrl = new URL("/index.html", request.url);
    const indexRequest = new Request(indexUrl, request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    return withSecurityHeaders(indexResponse, "/index.html");
  },
};

function withSecurityHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    headers.set("Cache-Control", "no-cache");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default worker;
`;

await mkdir(serverDir, { recursive: true });
await writeFile(join(serverDir, "index.js"), worker);
