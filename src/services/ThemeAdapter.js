/**
 * ThemeAdapter.js — make generated slides inherit the destination theme (v1.2)
 * =============================================================================
 * PptxGenJS writes some hardcoded values (Arial, black/grey axis text, white
 * fills). insertSlidesFromBase64({ formatting: useDestinationTheme }) only
 * re-themes elements that REFERENCE the theme, so this pass rewrites the
 * generated package before insertion:
 *
 *   - every latin typeface        -> +mn-lt (theme body font); titles keep +mj-lt
 *   - grey  srgbClr (r=g=b)       -> schemeClr tx1 + lumMod/lumOff (theme text tint)
 *   - white srgbClr               -> schemeClr bg1 (theme background)
 *   - chart series idx >= 6       -> accentN with a darker/lighter shade so 7+
 *                                    series stay distinguishable
 *   - series named in `transparentSeries` -> noFill
 *   - data points whose category is in `hiddenCategories` -> noFill (gauge half)
 *
 * Saturated colours (e.g. green/red deltas) are left untouched on purpose.
 */

import JSZip from "jszip";

const GREY_TOLERANCE = 6;

function greyToScheme(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if (Math.max(r, g, b) - Math.min(r, g, b) > GREY_TOLERANCE) return null;
  const L = (r + g + b) / 3 / 255;
  if (L >= 0.98) return '<a:schemeClr val="bg1"/>';
  // light greys are "panel" colours -> a shade of the background
  if (L >= 0.85) return `<a:schemeClr val="bg1"><a:lumMod val="${Math.round(L * 100000)}"/></a:schemeClr>`;
  if (L <= 0.02) return '<a:schemeClr val="tx1"/>';
  const mod = Math.round((1 - L) * 100000);
  const off = Math.round(L * 100000);
  return `<a:schemeClr val="tx1"><a:lumMod val="${mod}"/><a:lumOff val="${off}"/></a:schemeClr>`;
}

/** Replace grey/white srgbClr (self-closing or with children) by theme refs. */
export function themeColors(xml) {
  return xml.replace(
    /<a:srgbClr val="([0-9A-Fa-f]{6})"(?:\s*\/>|>(.*?)<\/a:srgbClr>)/gs,
    (match, hex, children) => {
      const scheme = greyToScheme(hex);
      if (!scheme) return match;
      // keep alpha if present
      const alpha = children && /<a:alpha [^>]*\/>/.exec(children);
      if (alpha && scheme.endsWith("/>")) {
        return scheme.replace("/>", `>${alpha[0]}</a:schemeClr>`);
      }
      return scheme;
    }
  );
}

/** Point every non-theme latin/ea/cs typeface at the theme body font. */
export function themeFonts(xml) {
  return xml.replace(/(<a:(?:latin|ea|cs) typeface=")([^"+][^"]*)(")/g, "$1+mn-lt$3");
}

const SHADES = ['<a:lumMod val="75000"/>', '<a:lumMod val="60000"/><a:lumOff val="40000"/>',
                '<a:lumMod val="50000"/>', '<a:lumMod val="40000"/><a:lumOff val="60000"/>'];

/** Per-series fixes inside a chart part. */
export function adaptSeries(xml, transparentSeries = [], hiddenCategories = []) {
  return xml.replace(/<c:ser>(.*?)<\/c:ser>/gs, (block, inner) => {
    // hidden data points (by category name)
    for (const cat of hiddenCategories) {
      const catBlock = /<c:cat>(.*?)<\/c:cat>/s.exec(inner);
      if (!catBlock) continue;
      const pt = new RegExp(`<c:pt idx="(\\d+)"><c:v>${cat}</c:v></c:pt>`).exec(catBlock[1]);
      if (!pt) continue;
      const i = pt[1];
      inner = inner.replace(new RegExp(`(<c:dPt>\\s*<c:idx val="${i}"/>.*?<c:spPr>).*?(</c:spPr>)`, "s"),
        "$1<a:noFill/><a:ln><a:noFill/></a:ln>$2");
    }
    const idxMatch = /<c:idx val="(\d+)"\/>/.exec(inner);
    const idx = idxMatch ? parseInt(idxMatch[1], 10) : 0;
    const nameMatch = /<c:tx>.*?<c:v>(.*?)<\/c:v>.*?<\/c:tx>/s.exec(inner);
    const name = nameMatch ? nameMatch[1] : "";

    if (transparentSeries.includes(name)) {
      inner = inner.replace(/<c:spPr>(.*?)<\/c:spPr>/s, "<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>");
      inner = inner.replace(/<c:dLbls>.*?<\/c:dLbls>/s,
        '<c:dLbls><c:delete val="1"/></c:dLbls>');
      return `<c:ser>${inner}</c:ser>`;
    }

    // pie/doughnut slices 7+ (data points) get shades too
    inner = inner.replace(/<c:dPt>\s*<c:idx val="(\d+)"\/>(.*?)<\/c:dPt>/gs, (m, pIdx, body) => {
      const p = parseInt(pIdx, 10);
      if (p < 6) return m;
      const shade = SHADES[(Math.floor(p / 6) - 1) % SHADES.length];
      return m.replace(/<a:schemeClr val="(accent[1-6])"\s*\/>/g, (mm, acc) => `<a:schemeClr val="${acc}">${shade}</a:schemeClr>`);
    });

    if (idx >= 6) {
      const shade = SHADES[(Math.floor(idx / 6) - 1) % SHADES.length];
      inner = inner.replace(/<a:schemeClr val="(accent[1-6])"\s*\/>/g,
        (m, acc) => `<a:schemeClr val="${acc}">${shade}</a:schemeClr>`);
    }
    return `<c:ser>${inner}</c:ser>`;
  });
}

/**
 * Re-theme a whole PPTX package.
 * @param {string} base64 - output of pptx.write({ outputType: "base64" })
 * @param {{ transparentSeries?: string[], hiddenCategories?: string[] }} options
 * @returns {Promise<string>} base64
 */
export async function adaptToTheme(base64, options = {}) {
  const { transparentSeries = [], hiddenCategories = [] } = options;
  const zip = await JSZip.loadAsync(base64, { base64: true });

  const parts = Object.keys(zip.files).filter(n =>
    /^ppt\/(slides\/slide\d+|charts\/chart\d+)\.xml$/.test(n)
  );

  for (const name of parts) {
    let xml = await zip.file(name).async("string");
    xml = themeFonts(xml);
    xml = themeColors(xml);
    if (name.includes("/charts/")) xml = adaptSeries(xml, transparentSeries, hiddenCategories);
    zip.file(name, xml);
  }

  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}

export default { adaptToTheme, themeColors, themeFonts, adaptSeries };
