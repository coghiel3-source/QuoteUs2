import type { Plugin } from "vite";
import { SEO_IMAGE } from "./shared/seo";

// Keep built HTML images on the public canonical origin, never on a preview host.
export function metaImagesPlugin(): Plugin {
  return {
    name: "vite-plugin-meta-images",
    transformIndexHtml(html) {
      return html.replace(
        /(<meta\s+(?:property="og:image"|name="twitter:image")\s+content=")[^"]*(")/g,
        (_match, prefix: string, suffix: string) => `${prefix}${SEO_IMAGE}${suffix}`,
      );
    },
  };
}