// Wraps the OpenNext worker to give every /_next chunk <script> in HTML an
// integrity attribute. Next's experimental.sri covers the framework scripts, but
// React emits client-component chunks (app/layout-*.js, app/page-*.js) without
// one, and Webflow Cloud serves /_next from its own asset host, so the external
// SRI scan flags them. The hash is computed from the same file in this worker's
// ASSETS binding, so it always matches what the asset host serves.

// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

type Env = { ASSETS: { fetch: (req: Request | string) => Promise<Response> } };

const hashes = new Map<string, Promise<string | null>>();

function chunkPath(src: string, base: string): string | null {
  try {
    const path = new URL(src, base).pathname;
    return path.startsWith("/_next/static/") && path.endsWith(".js") ? path : null;
  } catch {
    return null;
  }
}

function sha256(path: string, env: Env, base: string): Promise<string | null> {
  let p = hashes.get(path);
  if (!p) {
    p = env.ASSETS.fetch(new URL(path, base).toString())
      .then(async (r) => {
        if (!r.ok) return null;
        const digest = await crypto.subtle.digest("SHA-256", await r.arrayBuffer());
        return "sha256-" + btoa(String.fromCharCode(...new Uint8Array(digest)));
      })
      .catch(() => null);
    hashes.set(path, p);
    // A failed lookup is not cached, so a later request can retry it.
    p.then((h) => { if (!h) hashes.delete(path); });
  }
  return p;
}

export default {
  async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
    const response: Response = await handler.fetch(request, env, ctx);
    if (!(response.headers.get("content-type") || "").includes("text/html")) return response;
    const base = request.url;
    return new HTMLRewriter()
      .on("script[src]", {
        async element(el) {
          if (el.getAttribute("integrity")) return;
          const path = chunkPath(el.getAttribute("src") || "", base);
          if (!path) return;
          const integrity = await sha256(path, env, base);
          if (!integrity) return; // leave the tag as it was rather than risk a blocked script
          el.setAttribute("integrity", integrity);
          if (!el.hasAttribute("crossorigin")) el.setAttribute("crossorigin", "");
        },
      })
      .transform(response);
  },
};

// @ts-ignore re-exported Durable Objects, generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
