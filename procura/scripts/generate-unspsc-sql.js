const fs = require("fs");
const path = require("path");

// Prefer repo-root ../data (keeps large files out of the Next app)
const rootData = path.join(__dirname, "..", "..", "data");
const appData = path.join(__dirname, "..", "data");
const jsonPath = [
  path.join(rootData, "unspsc.json"),
  path.join(appData, "unspsc.json"),
].find((p) => fs.existsSync(p));

if (!jsonPath) {
  console.error("Missing unspsc.json. Unzip ../data/unspsc.json.zip or regenerate from the XLSX.");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const byKey = new Map(rows.map((r) => [r.key, r]));
const ordered = [];
const seen = new Set();

function add(r) {
  if (seen.has(r.key)) return;
  if (r.parent_key != null && byKey.has(r.parent_key)) add(byKey.get(r.parent_key));
  seen.add(r.key);
  ordered.push(r);
}
for (const r of rows) add(r);

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const chunks = [];
const size = 400;
for (let i = 0; i < ordered.length; i += size) {
  const slice = ordered.slice(i, i + size);
  const values = slice
    .map((r) => {
      const pk = r.parent_key == null ? "NULL" : r.parent_key;
      return `(${r.key},${pk},'${esc(r.code)}','${esc(r.title)}')`;
    })
    .join(",\n");
  chunks.push(
    `insert into public.unspsc_codes (key, parent_key, code, title) values\n${values}\non conflict (key) do update set code = excluded.code, title = excluded.title, parent_key = excluded.parent_key;`,
  );
}

fs.mkdirSync(rootData, { recursive: true });
const out = path.join(rootData, "seed_unspsc.sql");
fs.writeFileSync(out, chunks.join("\n\n"));
console.log("wrote", out, chunks.length, "batches", ordered.length, "rows");
