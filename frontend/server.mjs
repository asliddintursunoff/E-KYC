import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = __dirname;
const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const backendOrigin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      send(res, 404, "Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(filePath).pipe(res);
  } catch {
    const fallback = join(root, "index.html");
    if (existsSync(fallback)) {
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      createReadStream(fallback).pipe(res);
      return;
    }
    send(res, 404, "Not found");
  }
}

async function proxyApi(req, res) {
  const target = new URL(req.url, backendOrigin);
  const headers = { ...req.headers, host: target.host };
  delete headers.connection;

  const backendReq = http.request(
    target,
    {
      method: req.method,
      headers,
    },
    (backendRes) => {
      res.writeHead(backendRes.statusCode || 500, backendRes.headers);
      backendRes.pipe(res);
    },
  );

  backendReq.on("error", (error) => {
    send(
      res,
      502,
      JSON.stringify({
        detail: `Cannot reach backend at ${backendOrigin}. ${error.message}`,
      }),
      { "Content-Type": "application/json; charset=utf-8" },
    );
  });

  req.pipe(backendReq);
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith("/api/") || req.url?.startsWith("/media/")) {
    proxyApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(port, host, () => {
  console.log(`E-KYC frontend: http://${host}:${port}`);
  console.log(`Proxying API requests to ${backendOrigin}`);
});
