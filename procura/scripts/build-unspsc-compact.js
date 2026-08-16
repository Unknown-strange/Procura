const fs = require("fs");

const rows = JSON.parse(fs.readFileSync("data/unspsc.json", "utf8"));

// Compact rows for runtime search (smaller than full tree dump)
const compact = rows.map((r) => ({
  k: r.key,
  c: String(r.code),
  t: String(r.title),
  p: r.parent_key,
}));

fs.writeFileSync("data/unspsc-compact.json", JSON.stringify(compact));

// Segment-only picker (already small)
const segments = compact.filter((r) => r.p == null);
fs.writeFileSync("data/unspsc-segments.json", JSON.stringify(segments, null, 2));

console.log(
  "compact MB",
  (fs.statSync("data/unspsc-compact.json").size / 1024 / 1024).toFixed(2),
  "rows",
  compact.length,
  "segments",
  segments.length,
);
