/**
 * Lector mínimo de XLSX: descomprime el libro y lee las celdas de cada hoja como texto.
 * Sentione exporta rutas internas absolutas («/xl/workbook.xml») que algunas librerías no aceptan;
 * este lector las resuelve y no depende de estilos ni fórmulas.
 */
import { strFromU8, unzipSync } from 'fflate';

const XML_ENT: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
const unxml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (XML_ENT[e] ?? m),
  );

/** Texto de los nodos <t> (cadenas en línea o compartidas, con o sin prefijo de espacio de nombres). */
const texts = (xml: string) => [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((m) => unxml(m[1])).join('');

const colIndex = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export type Sheet = string[][];

export function readXlsx(data: Uint8Array): Record<string, Sheet> {
  const files = unzipSync(data);
  const file = (path: string) => {
    const key = path.replace(/^\//, '');
    const f = files[key];
    if (!f) throw new Error(`Falta ${key} dentro del XLSX`);
    return strFromU8(f);
  };
  const resolve = (target: string) => (target.startsWith('/') ? target.slice(1) : `xl/${target}`);

  const rels = new Map<string, string>();
  for (const m of file('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[1])?.[1];
    const target = /\bTarget="([^"]+)"/.exec(m[1])?.[1];
    if (id && target) rels.set(id, resolve(target));
  }

  const sharedPath = [...rels.values()].find((p) => /sharedStrings\.xml$/.test(p));
  const shared = sharedPath ? [...file(sharedPath).matchAll(/<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((m) => texts(m[1])) : [];

  const out: Record<string, Sheet> = {};
  for (const m of file('xl/workbook.xml').matchAll(/<(?:\w+:)?sheet\b([^>]*)\/?>/g)) {
    const name = unxml(/\bname="([^"]*)"/.exec(m[1])?.[1] ?? '');
    const rid = /\br:id="([^"]+)"/.exec(m[1])?.[1] ?? '';
    const xml = file(rels.get(rid) ?? '');
    const rows: Sheet = [];
    for (const r of xml.matchAll(/<(?:\w+:)?row\b[^>]*?(?:\/>|>([\s\S]*?)<\/(?:\w+:)?row>)/g)) {
      const row: string[] = [];
      for (const c of (r[1] ?? '').matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)) {
        const ref = /\br="([A-Z]+\d+)"/.exec(c[1])?.[1];
        const type = /\bt="(\w+)"/.exec(c[1])?.[1];
        const body = c[2] ?? '';
        const v = /<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1];
        let value = '';
        if (type === 'inlineStr') value = texts(body);
        else if (type === 's') value = shared[Number(v)] ?? '';
        else if (v != null) value = unxml(v);
        row[ref ? colIndex(ref) : row.length] = value;
      }
      rows.push(Array.from(row, (x) => x ?? ''));
    }
    out[name] = rows;
  }
  return out;
}

/** Filas como objetos, con la primera fila como encabezado. */
export function records(sheet: Sheet): Record<string, string>[] {
  const [header, ...rest] = sheet;
  return rest.filter((r) => r.some((v) => v !== '')).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
