import JSZip from "jszip";
/** Build a tiny .xlsx from a matrix (strings via sharedStrings, numbers inline). */
export async function makeXlsx(matrix, sheetName = "Données") {
  const zip = new JSZip();
  const shared = [];
  const sIdx = (s) => { let i = shared.indexOf(s); if (i < 0) { shared.push(s); i = shared.length - 1; } return i; };
  const col = (i) => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const rows = matrix.map((r, ri) => `<row r="${ri + 1}">` + r.map((v, ci) => {
    if (v === null || v === undefined) return "";
    const ref = `${col(ci)}${ri + 1}`;
    return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="s"><v>${sIdx(String(v))}</v></c>`;
  }).join("") + "</row>").join("");
  zip.file("xl/workbook.xml", `<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${sheetName}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `<worksheet><sheetData>${rows}</sheetData></worksheet>`);
  zip.file("xl/sharedStrings.xml", `<sst>${shared.map(s => `<si><t>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></si>`).join("")}</sst>`);
  return zip.generateAsync({ type: "nodebuffer" });
}
