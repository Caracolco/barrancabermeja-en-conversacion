/**
 * Datos reales: la exportación cuadra con lo declarado, los datos publicados se regeneran idénticos desde
 * los archivos fuente y cada evidencia es un fragmento literal de su registro original.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { build, cleanText, fullText, isCiroAccount, toCsv } from '../src/lib/pipeline';
import { readEvidenceIds, readReview, readSource, ROOT, SOURCE_CSV, SOURCE_XLSX } from '../scripts/source';
import type { Registro, Resumen } from '../src/lib/types';
import registros from '../src/data/registros.json';
import resumen from '../src/data/resumen.json';
import curated from '../src/data/evidencias.json';

const src = readSource();
const review = readReview();
const out = build({ ...src, review, archivo: SOURCE_XLSX.split('/').pop()!, evidenceIds: readEvidenceIds() });
const rs = registros as Registro[];
const sum = resumen as Resumen;

/** CSV con comillas y saltos de línea dentro de los campos. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') row.push(cell), (cell = '');
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell), rows.push(row), (row = []), (cell = '');
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.filter((r) => r.some((c) => c !== ''));
}

describe('validación de la exportación de Sentione', () => {
  it('coincide con las cifras declaradas: 815, 220, 126, 456 y 13', () => {
    expect(src.declared).toMatchObject({ filas: 815, incluidos: 220, pendientes: 126, excluidos: 456, duplicados: 13 });
    for (const c of out.resumen.validacion) expect(c, c.label).toMatchObject({ ok: true });
  });

  it('las 13 filas duplicadas repiten 4 identificadores', () => {
    expect(out.resumen.preliminar.duplicado).toBe(13);
    expect(out.resumen.preliminar.idsDuplicados).toBe(4);
  });

  it('el CSV entregado es la misma hoja «Base depurada» del Excel', () => {
    const [header, ...rows] = parseCsv(readFileSync(`${ROOT}${SOURCE_CSV}`, 'utf8').replace(/^﻿/, ''));
    expect(rows).toHaveLength(src.base.length);
    const idx = (h: string) => header.indexOf(h);
    rows.forEach((r, i) => {
      const b = src.base[i];
      expect(r[idx('ID')]).toBe(b.id);
      expect(r[idx('URL original')]).toBe(b.url);
      expect(r[idx('Texto original')].replace(/\r\n/g, '\n')).toBe(b.texto.replace(/\r\n/g, '\n'));
    });
  });

  it('la revisión cubre exactamente los 346 registros con texto', () => {
    expect(review).toHaveLength(src.base.length + src.pendiente.length);
    expect(new Set(review.map((r) => r.id)).size).toBe(review.length);
    for (const r of review) {
      if (r.decision === 'incluir') expect(r.tema && r.sentimiento && r.objetivo && r.voz, r.id).toBeTruthy();
      else expect(r.motivo, r.id).toBeTruthy();
    }
  });
});

describe('reproducibilidad', () => {
  it('los datos publicados se regeneran idénticos desde los archivos fuente', () => {
    expect(out.registros).toEqual(rs);
    expect(out.resumen).toEqual(sum);
    expect(toCsv(out.auditoria)).toBe(readFileSync(`${ROOT}public/data/auditoria.csv`, 'utf8'));
  });

  it('la auditoría tiene una fila por cada registro original y cuadra con el informe', () => {
    expect(out.auditoria).toHaveLength(815);
    const by = (f: string) => out.auditoria.filter((a) => a.final === f).length;
    expect(by('incluido')).toBe(rs.length);
    expect(by('replica')).toBe(sum.revision.replicas);
    expect(by('duplicado')).toBe(13);
    expect(by('incluido') + by('replica') + by('excluido') + by('sin_texto') + by('duplicado')).toBe(815);
  });

  it('cifras finales: 298 pertinentes tras la revisión, 9 réplicas, 289 en el informe', () => {
    expect(sum.revision.incluidos).toBe(298);
    expect(sum.revision.replicas).toBe(9);
    expect(sum.final).toBe(289);
    expect(rs).toHaveLength(289);
  });
});

describe('atribución a Ciro Fernández', () => {
  const all = [...src.base, ...src.pendiente];
  const byId = new Map(all.map((r) => [r.id, r]));

  it('las publicaciones propias salen de sus cuentas y las menciones lo nombran en el texto', () => {
    for (const r of rs.filter((x) => x.ciro === 'propia')) expect(isCiroAccount(byId.get(r.id)!), r.id).toBe(true);
    for (const r of rs.filter((x) => x.ciro === 'mencion')) expect(cleanText(fullText(byId.get(r.id)!))).toMatch(/Ciro Fern[aá]ndez/);
  });

  it('ningún registro que no lo menciona se le atribuye', () => {
    for (const r of rs.filter((x) => x.ciro === null)) {
      expect(r.objetivo, r.id).not.toBe('ciro');
      expect(r.voz).not.toBe('ciro');
      expect(cleanText(fullText(byId.get(r.id)!))).not.toMatch(/Ciro Fern[aá]ndez/);
    }
  });

  it('16 publicaciones propias, 1 mención de terceros y 14 propias sin texto', () => {
    expect(sum.ciro.propiasContadas).toBe(16);
    expect(sum.ciro.mencionesTerceros).toBe(1);
    expect(sum.ciro.propiasSinTexto).toHaveLength(14);
    for (const p of sum.ciro.propiasSinTexto) expect(p.enlace).toMatch(/twitter\.com\/CiroFernandezN\//);
  });

  it('los comentarios de personas no exponen el nombre del autor', () => {
    for (const r of rs.filter((x) => x.voz === 'ciudadano')) expect(r.autor).toBeNull();
  });
});

describe('evidencias', () => {
  const groups = curated as Record<string, { items: { id: string; fragmento: string }[] }>;
  const all = [...src.base, ...src.pendiente];
  const byId = new Map(all.map((r) => [r.id, r]));

  it('cada fragmento es literal del texto original y el enlace es el de la fuente', () => {
    for (const g of Object.values(groups))
      for (const e of g.items) {
        const s = byId.get(e.id);
        expect(s, e.id).toBeTruthy();
        const reg = rs.find((r) => r.id === e.id)!;
        expect(reg, `${e.id} está en el informe`).toBeTruthy();
        expect(cleanText(fullText(s!)).replace(/\s+/g, ' ')).toContain(e.fragmento);
        expect(reg.url).toBe(s!.url);
      }
  });

  it('entre seis y nueve evidencias en voces, y las de la ciudad no mencionan a Ciro', () => {
    const n = groups.ciudad.items.length + groups.ciro.items.length;
    expect(n).toBeGreaterThanOrEqual(6);
    expect(n).toBeLessThanOrEqual(9);
    for (const e of groups.ciudad.items) expect(rs.find((r) => r.id === e.id)!.ciro).toBeNull();
    for (const e of groups.ciro.items) expect(rs.find((r) => r.id === e.id)!.ciro).not.toBeNull();
  });
});
