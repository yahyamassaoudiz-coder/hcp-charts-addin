/**
 * waffleChart.js — Waffle 10×10 (v1.2). One square = 1 %. Only meaningful for
 * percentage indicators; other units are rejected with a clear message.
 */
import { text, rect, fmt, lastValid, accent, MUTED, requireSeries } from "./_helpers.js";

export function build(slide, { pptx, labels, series, LAYOUT }) {
  requireSeries(series, 1, "Gaufre");
  const s = series[0];
  if (s.unit && s.unit !== "%") throw new Error("« Gaufre » est réservé aux indicateurs en pourcentage (%).");
  const { value, index } = lastValid(s.data);
  if (value === null) throw new Error("« Gaufre » : aucune valeur disponible.");
  const filled = Math.max(0, Math.min(100, Math.round(value)));

  const size = Math.min(LAYOUT.chart.h - 0.2, LAYOUT.chart.w * 0.45);
  const cell = size / 10, gap = cell * 0.1;
  const gx = LAYOUT.chart.x + 0.8, gy = LAYOUT.chart.y + (LAYOUT.chart.h - size) / 2;
  for (let i = 0; i < 100; i++) {
    const col = i % 10, row = 9 - Math.floor(i / 10);
    rect(slide, pptx, gx + col * cell + gap / 2, gy + row * cell + gap / 2, cell - gap, cell - gap,
      i < filled ? accent(0) : "E7E6E6");
  }
  const tx = gx + size + 0.8;
  text(slide, fmt(value) + " %", tx, gy + size * 0.25, 5, 1, { fontSize: 54, bold: true, fontFace: "+mj-lt", color: accent(0) });
  text(slide, s.name, tx, gy + size * 0.25 + 1.05, 5.5, 0.4, { fontSize: 16 });
  text(slide, labels[index], tx, gy + size * 0.25 + 1.5, 3, 0.3, { fontSize: 12, color: MUTED });
  text(slide, "1 carré = 1 %", gx, gy + size + 0.05, size, 0.22, { align: "center", fontSize: 9, color: MUTED });
  return {};
}
export default { build };
