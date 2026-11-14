#!/usr/bin/env node
/**
 * make-web-html.js — regenerate src/taskpane/web.html from taskpane.html.
 * The public web version uses the same markup and script as the task pane,
 * without Office.js and with data-mode="web" (taskpane.js adds the preview and
 * download panel in that mode). Runs automatically before every build.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/taskpane");

export function toWebHtml(html) {
  const out = html
    .replace('<html lang="fr" dir="ltr">', '<html lang="fr" dir="ltr" data-mode="web">')
    .replace(/\s*<!-- Office\.js -->\s*<script[^>]*appsforoffice[^>]*><\/script>/,
      "\n  <!-- Web version: generated from taskpane.html by scripts/make-web-html.js — do not edit by hand -->")
    .replace("<title>HCP Charts — Statistiques du Maroc</title>", "<title>HCP Charts — créer un graphique</title>");
  if (!out.includes('data-mode="web"') || out.includes("appsforoffice")) throw new Error("taskpane.html changed shape — update make-web-html.js");
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(dir, "web.html"), toWebHtml(fs.readFileSync(path.join(dir, "taskpane.html"), "utf8")));
  console.log("✓ src/taskpane/web.html");
}
