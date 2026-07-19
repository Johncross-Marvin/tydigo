import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const distDir = join(process.cwd(), "dist");
const serverDir = join(distDir, "server");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt", ".webmanifest", ".xml"]);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    if (entry === "server" || entry === ".openai") continue;

    const fullPath = join(directory, entry);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const files = {};

for (const filePath of await walk(distDir)) {
  const routePath = `/${relative(distDir, filePath).split(sep).join("/")}`;
  const ext = extname(filePath);
  const isText = textExtensions.has(ext);
  const buffer = await readFile(filePath);

  files[routePath] = {
    body: isText ? buffer.toString("utf8") : buffer.toString("base64"),
    encoding: isText ? "text" : "base64",
    mimeType: mimeTypes.get(ext) ?? "application/octet-stream",
  };
}

const worker = `const files = ${JSON.stringify(files)};

const worker = {
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const url = new URL(request.url);
    const file = resolveFile(url.pathname);

    if (!file) {
      return new Response("Not Found", { status: 404 });
    }

    const body = request.method === "HEAD" ? null : decodeBody(file);
    const headers = new Headers({
      "Content-Type": file.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": url.pathname.startsWith("/assets/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });

    return new Response(body, { status: 200, headers });
  },
};

function resolveFile(pathname) {
  if (pathname === "/" || pathname === "") return files["/index.html"];
  if (files[pathname]) return files[pathname];
  if (!pathname.split("/").pop().includes(".")) return files["/index.html"];
  return null;
}

function decodeBody(file) {
  if (file.encoding === "base64") {
    const binary = atob(file.body);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return bytes;
  }

  return file.body;
}

export default worker;
`;

await mkdir(serverDir, { recursive: true });
await writeFile(join(serverDir, "index.js"), worker);
