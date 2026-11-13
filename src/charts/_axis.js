/**
 * _axis.js — value-axis frame for shape-built charts (v1.2)
 * Draws horizontal gridlines + labels and returns a y(value) mapper.
 */
import { niceRange, text, line, fmt, FAINT, MUTED } from "./_helpers.js";

export function valueFrame(slide, pptx, box, values, opts = {}) {
  const { includeZero = true, gutter = 0.7 } = opts;
  const { min, max, step } = niceRange(values, includeZero);
  const plot = { x: box.x + gutter, y: box.y, w: box.w - gutter, h: box.h };
  const y = (v) => plot.y + plot.h - ((v - min) / (max - min)) * plot.h;
  for (let v = min; v <= max + step / 2; v += step) {
    const yy = y(v);
    line(slide, pptx, plot.x, yy, plot.x + plot.w, yy, Math.abs(v) < step / 1e6 ? MUTED : FAINT, Math.abs(v) < step / 1e6 ? 1 : 0.5);
    text(slide, fmt(v), box.x, yy - 0.12, gutter - 0.1, 0.24, { align: "right", fontSize: 10, color: MUTED });
  }
  return { plot, y, min, max };
}
