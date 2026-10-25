"use client";
// Office files, tables and archives: read right here (they are zip files of XML), shown as plain page content.
// Only text is ever put on the page (textContent / React text), never the file's own HTML, so nothing in it can run.
export type Office = { kind: "doc"; paras: { t: string; h: number }[] } | { kind: "rows"; sheets: { name: string; rows: string[][] }[] } | { kind: "slides"; slides: string[][] } | { kind: "zip"; files: { name: string; size: number }[] };
export const ROWS_MAX = 2000;
const COLS_MAX = 60;
const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
const els = (d: Document | Element, tag: string) => Array.from(d.getElementsByTagNameNS("*", tag));
function csvRows(text: string, sep: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const endCell = () => {
    row.push(cell);
    cell = "";
  };
  const endRow = () => {
    endCell();
    rows.push(row.slice(0, COLS_MAX));
    row = [];
  };
  for (let i = 0; i < text.length && rows.length < ROWS_MAX; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) endCell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += c;
  }
  if (cell || row.length) endRow();
  return rows;
}
const colIdx = (ref: string) => { let n = 0; for (const ch of ref.replace(/[0-9]/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
export async function readOffice(file: File, kind: OfficeKind): Promise<Office> {
  const name = file.name.toLowerCase();
  if (kind === "table") return { kind: "rows", sheets: [{ name: file.name, rows: csvRows(await file.slice(0, 8 * 1024 * 1024).text(), name.endsWith(".tsv") ? "\t" : ",") }] };
  const { unzipSync, strFromU8 } = await import("fflate");
  const buf = new Uint8Array(await file.arrayBuffer());
  if (kind === "zip") {
    const files: { name: string; size: number }[] = [];
    unzipSync(buf, {
      filter: (f) => {
        if (files.length < 5000) files.push({ name: f.name, size: f.originalSize });
        return false;
      },
    });
    return { kind: "zip", files };
  }
  const z = unzipSync(buf, { filter: (f) => /\.(xml|rels)$/.test(f.name) && f.originalSize < 60 * 1024 * 1024 });
  const get = (p: string) => (z[p] ? strFromU8(z[p]) : "");
  if (name.endsWith(".odt") || name.endsWith(".ods") || name.endsWith(".odp")) {
    const d = xml(get("content.xml"));
    if (kind === "doc") return { kind: "doc", paras: [...els(d, "h").map((e) => ({ e, h: 1 })), ...els(d, "p").map((e) => ({ e, h: 0 }))].sort((a, b) => (a.e.compareDocumentPosition(b.e) & 4 ? -1 : 1)).map(({ e, h }) => ({ t: e.textContent ?? "", h })) };
    if (kind === "sheet") return { kind: "rows", sheets: els(d, "table").map((t) => ({ name: t.getAttribute("table:name") ?? "Sheet", rows: els(t, "table-row").slice(0, ROWS_MAX).map((r) => els(r, "table-cell").slice(0, COLS_MAX).map((c) => c.textContent ?? "")) })) };
    return { kind: "slides", slides: els(d, "page").map((pg) => els(pg, "p").map((p) => p.textContent ?? "").filter(Boolean)) };
  }
  if (kind === "doc") {
    const d = xml(get("word/document.xml"));
    return { kind: "doc", paras: els(d, "p").map((p) => {
      const st = els(p, "pStyle")[0]?.getAttribute("w:val") ?? "";
      const h = /^(Heading|berschrift|Titre|Title)/i.test(st) ? (st.match(/\d/) ? +st.match(/\d/)![0] : 1) : 0;
      return { t: els(p, "t").map((t) => t.textContent).join(""), h };
    }) };
  }
  if (kind === "sheet") {
    const shared = els(xml(get("xl/sharedStrings.xml")), "si").map((si) => els(si, "t").map((t) => t.textContent).join(""));
    const wb = xml(get("xl/workbook.xml")), rels = xml(get("xl/_rels/workbook.xml.rels"));
    const target = (rid: string) => { const r = els(rels, "Relationship").find((x) => x.getAttribute("Id") === rid)?.getAttribute("Target") ?? ""; return r.startsWith("/") ? r.slice(1) : `xl/${r}`; };
    const sheets = els(wb, "sheet").slice(0, 20).map((sh) => {
      const d = xml(get(target(sh.getAttribute("r:id") ?? sh.getAttributeNS("*", "id") ?? "")));
      const rows: string[][] = [];
      for (const r of els(d, "row").slice(0, ROWS_MAX)) {
        const row: string[] = [];
        for (const c of els(r, "c")) {
          const i = colIdx(c.getAttribute("r") ?? "A");
          if (i >= COLS_MAX) continue;
          const v = els(c, "v")[0]?.textContent ?? els(c, "t").map((t) => t.textContent).join("");
          row[i] = c.getAttribute("t") === "s" ? shared[+v] ?? "" : v;
        }
        rows.push(Array.from(row, (x) => x ?? ""));
      }
      return { name: sh.getAttribute("name") ?? "Sheet", rows };
    });
    return { kind: "rows", sheets };
  }
  const slides = Object.keys(z).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => +a.match(/\d+/)![0] - +b.match(/\d+/)![0]);
  return { kind: "slides", slides: slides.map((p) => els(xml(get(p)), "p").map((pp) => els(pp, "t").map((t) => t.textContent).join("")).filter(Boolean)) };
}


export type OfficeKind = "table" | "doc" | "slides" | "sheet" | "zip";
