#!/usr/bin/env node
/**
 * replace-prod-urls.js — build manifest.prod.xml for deployment (v1.2, NEW)
 *   npm run deploy:prep https://hcp-charts.vercel.app
 * Keeps manifest.xml pointing at https://localhost:3000 for development and
 * writes manifest.prod.xml with every localhost URL replaced, then validates it.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const raw = process.argv[2];
if (!raw) {
  console.error("Usage: npm run deploy:prep https://your-app.vercel.app");
  process.exit(1);
}
let url;
try { url = new URL(raw); } catch { console.error(`URL invalide : ${raw}`); process.exit(1); }
if (url.protocol !== "https:") { console.error("Office exige HTTPS."); process.exit(1); }
const origin = url.origin;
const base = (url.origin + url.pathname).replace(/\/+$/, "");   // keeps /<repo> on GitHub Pages

const src = fs.readFileSync(path.join(root, "manifest.xml"), "utf8");
const count = (src.match(/https:\/\/localhost:3000/g) || []).length;
// AppDomain is an origin; every other URL gets the full base (incl. /<repo>)
let out = src.replace(/<AppDomain>https:\/\/localhost:3000<\/AppDomain>/g, `<AppDomain>${origin}</AppDomain>`)
             .replace(/https:\/\/localhost:3000/g, base);
fs.writeFileSync(path.join(root, "manifest.prod.xml"), out);
console.log(`✓ manifest.prod.xml — ${count} URL(s) localhost remplacée(s) par ${base}`);
console.log("  Validez : npx office-addin-manifest validate manifest.prod.xml");
console.log("  Chargez-le dans PowerPoint : Insertion → Compléments → Mes compléments → Charger mon complément");
