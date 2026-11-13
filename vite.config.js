import { defineConfig } from "vite";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * vite.config.js (v1.2)
 *  - HTTPS with the Office dev certificate (trusted by PowerPoint; the v1.1
 *    self-signed basic-ssl cert is rejected by the Office webview).
 *    Run `npm run certs` once.
 *  - /api/ckan served by the SAME handler as production (api/ckan.js), so
 *    `npm run dev` has data (v1.1's dev server 404'd every request).
 */

function ckanDevApi() {
  return {
    name: "ckan-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/ckan", async (req, res) => {
        const { default: handler } = await import(resolve(__dirname, "api/ckan.js"));
        const url = new URL(req.url, "https://localhost");
        const query = Object.fromEntries(url.searchParams.entries());
        const shim = {
          status(code) { res.statusCode = code; return shim; },
          setHeader: (k, v) => res.setHeader(k, v),
          json(obj) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(obj)); return shim; },
          send(buf) { res.end(buf); return shim; },
          end() { res.end(); return shim; }
        };
        try { await handler({ method: req.method, query }, shim); }
        catch (e) { res.statusCode = 500; res.end(JSON.stringify({ success: false, error: e.message })); }
      });
    }
  };
}

async function httpsOptions() {
  try {
    const devCerts = await import("office-addin-dev-certs");
    return await (devCerts.default || devCerts).getHttpsServerOptions();
  } catch (e) {
    console.error("\n  ✖ Certificat de développement Office introuvable. Lancez :  npm run certs\n");
    throw e;
  }
}

export default defineConfig(async ({ command }) => ({
  plugins: [ckanDevApi()],
  root: "src/taskpane",
  base: "./",   // GitHub Pages serves from /<repo>/
  publicDir: resolve(__dirname, "public"),
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        taskpane: resolve(__dirname, "src/taskpane/taskpane.html"),
        commands: resolve(__dirname, "src/taskpane/commands.html")
      }
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    https: command === "serve" ? await httpsOptions() : undefined,
    fs: { allow: [resolve(__dirname)] }
  },
  resolve: {
    alias: {
      "@services": resolve(__dirname, "src/services"),
      "@charts": resolve(__dirname, "src/charts"),
      "@constants": resolve(__dirname, "src/constants"),
      "@utils": resolve(__dirname, "src/utils"),
      "@locales": resolve(__dirname, "src/locales")
    }
  }
}));
