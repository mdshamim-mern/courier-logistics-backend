import { readFileSync } from "node:fs";
import path from "node:path";
import type { Application } from "express";

const repository = "https://github.com/mdshamim-mern/courier-logistics-backend";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);

export function registerDocumentation(app: Application) {
  app.get("/docs", (req, res, next) => {
    try {
      const reference = readFileSync(path.join(process.cwd(), "docs/api-reference.md"), "utf8");
      res.setHeader("Cache-Control", "public, max-age=300");
      res.type("html").send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Dropzo API reference</title><meta name="description" content="Dropzo cookie authentication, endpoint inventory, booking quotes, parcel workflow and verified test payments"><style>body{margin:0;background:#f6f2fc;color:#30233f;font:16px/1.7 system-ui}main{max-width:1100px;margin:auto;padding:32px 20px}header,article{padding:24px;border:1px solid #ded0ee;background:#fff;border-radius:24px;margin-bottom:24px}h1{font-size:clamp(28px,5vw,48px);margin:0}nav{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}a{color:#6f32b8}nav a{padding:10px 14px;border:1px solid #ded0ee;border-radius:12px;text-decoration:none}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.8 ui-monospace,monospace}p{max-width:75ch}</style></head><body><main><header><h1>Dropzo API reference</h1><p>Import both Postman files, select the Live environment and sign in with your authorized role. Authentication uses HttpOnly cookies. Mutations are disabled by default. No password, token or webhook secret is included in the downloads.</p><nav><a href="/docs/postman/collection">Download collection</a><a href="/docs/postman/environment">Download environment</a><a href="${repository}/blob/main/docs/api-reference.md">View on GitHub</a></nav></header><article><pre>${escapeHtml(reference)}</pre></article></main></body></html>`);
    } catch (error) { next(error); }
  });
  for (const [slug, filename] of [
    ["collection", "Courier-Logistics-Updated.postman_collection.json"],
    ["environment", "Courier-Logistics-Live.postman_environment.json"],
  ]) {
    app.get(`/docs/postman/${slug}`, (req, res, next) => {
      try {
        const value = readFileSync(path.join(process.cwd(), filename), "utf8");
        res.setHeader("Cache-Control", "public, max-age=300");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.type("json").send(value);
      } catch (error) { next(error); }
    });
  }
}
