/**
 * Static server so a generated .excalidraw file can be eyeballed in a real
 * Excalidraw canvas without uploading it anywhere.
 *
 *   node .claude/skills/architecture-diagrams/preview/server.mjs   -> http://localhost:4173
 *
 * Scenes are discovered under DIAGRAMS_DIR (default <cwd>/diagrams/dist), so the
 * server lives with the skill while the diagrams live with the project.
 */
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIAGRAMS = process.env.DIAGRAMS_DIR ?? join(process.cwd(), "diagrams", "dist");
const PORT = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".excalidraw": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const listScenes = () => {
  if (!existsSync(DIAGRAMS)) return [];
  return readdirSync(DIAGRAMS)
    .filter((f) => f.endsWith(".excalidraw"))
    .sort();
};

const send = (res, code, type, body) => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
};

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);

  if (url === "/" || url === "/index.html") {
    return createReadStream(join(HERE, "index.html"))
      .on("open", () => res.writeHead(200, { "content-type": TYPES[".html"], "cache-control": "no-store" }))
      .pipe(res);
  }

  if (url === "/api/scenes") {
    return send(res, 200, TYPES[".json"], JSON.stringify({ dir: DIAGRAMS, scenes: listScenes() }));
  }

  if (url.startsWith("/scenes/")) {
    // basename() keeps this from escaping DIAGRAMS via ../ in the request path.
    const file = join(DIAGRAMS, basename(url.slice("/scenes/".length)));
    if (!existsSync(file) || !statSync(file).isFile()) {
      return send(res, 404, "text/plain", `not found: ${url}`);
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    return createReadStream(file).pipe(res);
  }

  send(res, 404, "text/plain", `not found: ${url}`);
}).listen(PORT, () => {
  const n = listScenes().length;
  console.log(`preview  ->  http://localhost:${PORT}`);
  console.log(`scenes   ->  ${DIAGRAMS}  (${n} found)`);
});
