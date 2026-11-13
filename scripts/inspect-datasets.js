#!/usr/bin/env node
/**
 * inspect-datasets.js — save a readable sample of every HCP file (runs in GitHub Actions)
 * ======================================================================================
 * For each dataset in src/constants/hcpCatalog.json: download its CSV/XLSX
 * resources and write docs/samples/<dataset>.md with every sheet's name and its
 * first rows. These samples are what indicatorMap.json entries are written from
 * (field names, row labels, quarterly vs annual layout).
 *
 *   npm run inspect
 * The workflow runs it when docs/samples/ does not exist yet, or when the
 * latest commit message contains [inspect].
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";
import { readXlsx } from "../src/utils/xlsxReader.js";
import { UA, MAX_BYTES } from "./map-indicators.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs/samples");
const ROWS = 14, COLS = 16, CELL = 38, MAX_SHEETS = 6, MAX_RES = 4;

const cell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\s+/g, " ").replace(/\|/g, "/").trim();
  return s.length > CELL ? s.slice(0, CELL - 1) + "…" : s;
};

function table(matrix) {
  const rows = matrix.slice(0, ROWS).map(r => (r || []).slice(0, COLS));
  const width = Math.max(1, ...rows.map(r => r.length));
  const lines = [`| # | ${Array.from({ length: width }, (_, i) => String.fromCharCode(65 + (i % 26))).join(" | ")} |`,
                 `|---|${"---|".repeat(width)}`];
  rows.forEach((r, i) => lines.push(`| ${i} | ${Array.from({ length: width }, (_, j) => cell(r[j])).join(" | ")} |`));
  return lines.join("\n");
}

async function sampleResource(res) {
  const F = (res.format || res.url.split(".").pop() || "").toUpperCase();
  const r = await fetch(res.url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!r.ok) return `_download ${r.status}_`;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) return "_file > 25 MB_";
  if (F === "CSV") {
    const parsed = Papa.parse(buf.toString("utf8").replace(/^﻿/, ""), { header: false, skipEmptyLines: "greedy", delimitersToGuess: [";", ",", "\t", "|"] });
    return `rows: ${parsed.data.length}\n\n${table(parsed.data)}`;
  }
  if (F !== "XLSX") return `_format ${F} not sampled_`;
  const first = await readXlsx(buf);
  const parts = [`sheets: ${first.sheetNames.map(s => "`" + s + "`").join(", ")}`];
  for (let i = 0; i < Math.min(first.sheetNames.length, MAX_SHEETS); i++) {
    const { sheet, matrix } = i === 0 ? first : await readXlsx(buf, { sheet: i });
    const used = matrix.filter(r => r && r.some(v => v !== null && v !== undefined && String(v).trim() !== "")).length;
    parts.push(`#### Sheet \`${sheet}\` — ${used} non-empty rows\n\n${table(matrix)}`);
  }
  return parts.join("\n\n");
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "src/constants/hcpCatalog.json"), "utf8"));
  fs.mkdirSync(OUT, { recursive: true });
  const index = ["# HCP dataset samples", "", `Generated ${new Date().toISOString()} — ${catalog.length} datasets.`, "",
                 "| Dataset | Resources |", "|---|---|"];
  for (const ds of catalog) {
    const md = [`# ${ds.title}`, "", `- name: \`${ds.name}\``, `- modified: ${ds.modified || ""}`, ""];
    const res = (ds.resources || []).filter(r => /csv|xlsx/i.test(r.format || r.url || "")).slice(0, MAX_RES);
    for (const r of res) {
      md.push(`## ${r.name || r.id}`, "", `- id: \`${r.id}\``, `- format: ${r.format}`, `- url: ${r.url}`, "");
      try { md.push(await sampleResource(r)); } catch (e) { md.push(`_error: ${e.message}_`); }
      md.push("");
      await new Promise(ok => setTimeout(ok, 200));
    }
    fs.writeFileSync(path.join(OUT, `${ds.name}.md`), md.join("\n"));
    index.push(`| [${cell(ds.title)}](${ds.name}.md) | ${res.length} |`);
    console.log(`  ✓ ${ds.name}`);
  }
  fs.writeFileSync(path.join(OUT, "INDEX.md"), index.join("\n") + "\n");
}

main().catch(e => { console.error("❌ " + e.message); process.exit(1); });
