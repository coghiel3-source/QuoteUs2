import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { publicPages } from "@shared/seo";
import App from "./App";

/** Render only explicitly public, content-bearing pages; never prerender user data. */
export function renderPublicPage(path: string): string {
  if (!Object.prototype.hasOwnProperty.call(publicPages, path)) {
    throw new Error(`Cannot prerender non-public page: ${path}`);
  }
  // Each request gets its own query cache, even when the SSR module is reused.
  const client = new QueryClient();
  try {
    return renderToString(
      <Router ssrPath={path}>
        <App client={client} />
      </Router>,
    );
  } finally {
    client.clear();
  }
}