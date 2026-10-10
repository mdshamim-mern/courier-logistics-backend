import { readFileSync } from "node:fs";
import path from "node:path";
import type { Application } from "express";
import { documentationScript, documentationStyles, renderDocumentation, type DocumentationCollection } from "./documentation-view";

export function registerDocumentation(app: Application) {
  app.get("/docs/assets/documentation.css", (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.type("css").send(documentationStyles);
  });
  app.get("/docs/assets/documentation.js", (req, res) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.type("js").send(documentationScript);
  });
  app.get("/docs/postman/publishing", (req, res, next) => {
    try {
      res.type("text").send(readFileSync(path.join(process.cwd(), "docs/postman-publishing.bn.md"), "utf8"));
    } catch (error) { next(error); }
  });
  app.get("/docs", (req, res, next) => {
    try {
      const reference = readFileSync(path.join(process.cwd(), "docs/api-reference.md"), "utf8");
      const collection = JSON.parse(readFileSync(path.join(process.cwd(), "Courier-Logistics-Updated.postman_collection.json"), "utf8")) as DocumentationCollection;
      res.setHeader("Cache-Control", "public, max-age=300");
      res.type("html").send(renderDocumentation(collection, reference));
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
