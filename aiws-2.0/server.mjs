import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
export async function serve(req, res, siteRoot = root) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  };
  const reply = (status, body, extra = {}) => {
    res.writeHead(status, { ...headers, ...extra });
    res.end(req.method === "HEAD" ? undefined : body);
  };
  if (!["GET", "HEAD"].includes(req.method))
    return reply(405, "Method not allowed", { Allow: "GET, HEAD" });
  try {
    const url = new URL(req.url, "http://localhost"),
      name = decodeURIComponent(
        url.pathname === "/" ? "/index.html" : url.pathname,
      );
    if (
      !/^\/(index\.html|styles\.css|examples\/(?:northstar|counter|contacts)\.json|(?:src|dist)\/[a-z][a-z0-9-]*\.mjs)$/.test(
        name,
      )
    )
      return reply(404, "Not found");
    const path = await realpath(resolve(siteRoot, "." + name)),
      resolvedRoot = await realpath(siteRoot);
    if (!path.startsWith(resolvedRoot + sep)) return reply(403, "Forbidden");
    if (!(await stat(path)).isFile()) return reply(404, "Not found");
    reply(200, await readFile(path), { "Content-Type": types[extname(path)] });
  } catch {
    return reply(404, "Not found");
  }
}
export const createStudioServer = (options = {}) =>
  createServer((req, res) => void serve(req, res, options.root || root));
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.PORT || 4173),
    host = process.env.HOST || "127.0.0.1";
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw Error("PORT must be 1–65535");
  createStudioServer().listen(port, host, () =>
    console.log(`AIWS Studio listening on ${host}:${port}`),
  );
}
