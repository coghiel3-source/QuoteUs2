import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { redirectIndexHtml, serveSeoHtml } from "./seo";
import { publicPages } from "../shared/seo";

export function serveStatic(app: Express, distPath = path.resolve(__dirname, "public")) {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(redirectIndexHtml);
  app.use(express.static(distPath, { index: false }));

  // Serve the SPA document only for page requests; do not turn missing assets/API into HTML.
  const template = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
  // Keep the manifest outside public/ so it cannot bypass route/noindex handling.
  const content = JSON.parse(fs.readFileSync(path.resolve(distPath, "..", "public-pages.json"), "utf-8"));
  for (const route of Object.keys(publicPages)) {
    if (typeof content[route] !== "string" || !content[route].includes("<h1")) {
      throw new Error(`Missing public prerender for ${route}; run npm run build`);
    }
  }
  app.use(serveSeoHtml(template, content));
}
