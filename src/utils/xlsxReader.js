/**
 * xlsxReader.js — dependency-light XLSX reader (v1.2, NEW)
 * =========================================================
 * HCP publishes most data.gov.ma resources as Excel. This reads .xlsx
 * (Office Open XML) with JSZip — already required by PptxGenJS — and works
 * identically in the browser and in Node (no DOMParser needed).
 *
 * Legacy binary .xls (BIFF) is NOT supported: the mapper prefers CSV/XLSX
 * resources and flags XLS-only datasets for manual conversion.
 */

import JSZip from "jszip";

const ENTITIES = { "&lt;": "<", "&gt;": ">", "&amp;": "&", "&quot;": '"', "&apos;": "'" };
export function decodeXml(s) {
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(lt|gt|amp|quot|apos);/g, m => ENTITIES[m]);
}

function colIndex(ref) {
  const letters = /^[A-Z]+/.exec(ref)[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textOf(xmlFragment) {
  let out = "";
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xmlFragment))) out += m[1];
  return decodeXml(out);
}

/**
 * Read a workbook.
 * @param {ArrayBuffer|Uint8Array|Buffer} data
 * @param {{ sheet?: string|number }} options
 * @returns {Promise<{ sheetNames: string[], sheet: string, matrix: any[][] }>}
 */
export async function readXlsx(data, options = {}) {
  let zip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch (e) {
    throw new Error("Fichier Excel illisible (format .xls non supporté ou fichier corrompu).");
  }
  const wb = await zip.file("xl/workbook.xml")?.async("string");
  if (!wb) throw new Error("Classeur XLSX invalide : xl/workbook.xml manquant.");
  const rels = (await zip.file("xl/_rels/workbook.xml.rels")?.async("string")) || "";

  const relTargets = {};
  for (const m of rels.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)) relTargets[m[1]] = m[2];
  for (const m of rels.matchAll(/<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)) relTargets[m[2]] = m[1];

  const sheets = [...wb.matchAll(/<sheet\b[^>]*\/>/g)].map(m => {
    const tag = m[0];
    const name = decodeXml(/name="([^"]*)"/.exec(tag)[1]);
    const rid = /r:id="([^"]+)"/.exec(tag)?.[1];
    let target = relTargets[rid] || "";
    target = target.replace(/^\/?xl\//, "").replace(/^\//, "");
    return { name, path: "xl/" + target };
  });
  if (!sheets.length) throw new Error("Classeur XLSX sans feuille.");

  let chosen = sheets[0];
  if (typeof options.sheet === "number") chosen = sheets[options.sheet] || chosen;
  else if (options.sheet) chosen = sheets.find(s => s.name === options.sheet) || chosen;

  const ssXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) || "";
  const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textOf(m[1]));

  const sheetXml = await zip.file(chosen.path)?.async("string");
  if (!sheetXml) throw new Error(`Feuille introuvable : ${chosen.name}`);

  const matrix = [];
  for (const rowM of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rIdx = parseInt(/\br="(\d+)"/.exec(rowM[1])?.[1] || String(matrix.length + 1), 10) - 1;
    const row = [];
    for (const c of rowM[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const body = c[2] || "";
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const t = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const ci = ref ? colIndex(ref) : row.length;
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let val = null;
      if (t === "s") val = v !== undefined ? shared[parseInt(v, 10)] ?? null : null;
      else if (t === "inlineStr") val = textOf(body);
      else if (t === "str") val = v !== undefined ? decodeXml(v) : null;
      else if (t === "b") val = v === "1";
      else if (t === "e") val = null;
      else if (v !== undefined) { const n = Number(v); val = Number.isFinite(n) ? n : decodeXml(v); }
      row[ci] = val;
    }
    matrix[rIdx] = row;
  }
  for (let i = 0; i < matrix.length; i++) if (!matrix[i]) matrix[i] = [];

  return { sheetNames: sheets.map(s => s.name), sheet: chosen.name, matrix };
}

export default { readXlsx, decodeXml };
