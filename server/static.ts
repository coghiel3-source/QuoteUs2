import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { redirectIndexHtml, serveSeoHtml } from "./seo";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(redirectIndexHtml);
  app.use(express.static(distPath, { index: false }));

  // Serve the SPA document only for page requests; do not turn missing assets/API into HTML.
  const template = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
  app.use(serveSeoHtml(template));
}
