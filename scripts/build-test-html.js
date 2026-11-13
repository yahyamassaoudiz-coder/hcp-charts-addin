#!/usr/bin/env node
/**
 * build-test-html.js — the add-in as ONE standalone .html file, for testing in a browser
 * =====================================================================================
 *   npm run build:test-html
 *   npm run build:test-html -- https://<owner>.github.io/<repo>/
 *
 * Same task pane, same chart engine, same data as the PowerPoint add-in:
 *  - data: the published snapshots on GitHub Pages (CORS-enabled), unlocked at
 *    start-up from data/status.json, so the file keeps working as indicators
 *    get mapped — no rebuild needed;
 *  - output: outside PowerPoint, « Insérer » downloads the native .pptx slide.
 * Everything (JS, CSS, PptxGenJS) is inlined; open the file by double-click.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "dist-test");
const TMP = path.join(OUT_DIR, ".vite");
const DEFAULT_BASE = "https://yahyamassaoudiz-coder.github.io/hcp-charts-addin/";

const dataBase = (process.argv[2] || process.env.VITE_DATA_BASE || DEFAULT_BASE).replace(/\/?$/, "/");
process.env.VITE_DATA_SOURCE = "static";
process.env.VITE_DATA_BASE = dataBase;

await build({
  configFile: false,
  logLevel: "warn",
  root: path.join(ROOT, "src/taskpane"),
  base: "./",
  publicDir: false,
  build: {
    outDir: TMP,
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: false,
    rollupOptions: {
      input: path.join(ROOT, "src/taskpane/taskpane.html"),
      output: { inlineDynamicImports: true }
    }
  }
});

let html = fs.readFileSync(path.join(TMP, "taskpane.html"), "utf8");
const read = (rel) => fs.readFileSync(path.join(TMP, rel.replace(/^\.\//, "")), "utf8");

// Office.js is only meaningful inside PowerPoint; the test page runs without it.
html = html.replace(/<script[^>]*appsforoffice\.microsoft\.com[^>]*><\/script>\s*/i, "");

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g,
  (_, href) => `<style>\n${read(href)}\n</style>`);
html = html.replace(/<script type="module"[^>]*src="([^"]+\.js)"[^>]*><\/script>/g,
  (_, src) => `<script type="module">\n${read(src).replace(/<\/script/gi, "<\\/script")}\n</script>`);

if (/src="\.\/assets\//.test(html) || /href="\.\/assets\//.test(html)) {
  throw new Error("An asset was not inlined — check the build output.");
}

const banner = `
<div id="hcp-test-banner" style="font:12px/1.4 system-ui,sans-serif;padding:6px 12px;background:#fff4d6;color:#5c4400;border-bottom:1px solid #e8d49a">
  <b>Mode test navigateur</b> — « Insérer » télécharge la diapositive (.pptx). Données : <code style="font-size:11px">${dataBase}</code>
</div>`;
html = html.replace(/<body([^>]*)>/i, (m) => m + banner);
html = html.replace(/<title>([^<]*)<\/title>/i, "<title>HCP Charts — test</title>");

fs.writeFileSync(path.join(OUT_DIR, "hcp-charts-test.html"), html);
fs.rmSync(TMP, { recursive: true, force: true });
const kb = Math.round(fs.statSync(path.join(OUT_DIR, "hcp-charts-test.html")).size / 1024);
console.log(`✓ dist-test/hcp-charts-test.html (${kb} KB) — data from ${dataBase}`);
