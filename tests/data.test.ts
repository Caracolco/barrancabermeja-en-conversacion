/**
 * Datos reales: la exportación cuadra con lo declarado, los datos publicados se regeneran idénticos desde
 * los archivos fuente y cada evidencia es un fragmento literal de su registro original.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cleanText, fullText, isCiroAccount } from '../src/lib/pipeline';
import { readRecovered, readReview, readSource, ROOT, SOURCE_AMPLIADA_CSV, SOURCE_CSV, SOURCE_WEB_CSV } from '../scripts/source';
import { assemble, readReviewWeb } from '../scripts/assemble';
import type { Figura, Registro, Resumen } from '../src/lib/types';
import registros from '../src/data/registros.json';
import resumen from '../src/data/resumen.json';
import figuras from '../src/data/figuras.json';
import curated from '../src/data/evidencias.json';

const src = readSource();
const recovered = readRecovered();
const review = readReview();
const full = assemble();
const out = full.sentione;
const all = registros as Registro[];
const rs = all.filter((r) => r.fuente === 'sentione');
const web = all.filter((r) => r.fuente === 'web');
const sum = resumen as Resumen;
const figs = figuras as Figura[];

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

  it('la revisión cubre exactamente los registros con texto: 346 de la exportación y 14 recuperados', () => {
    expect(review).toHaveLength(src.base.length + src.pendiente.length + recovered.length);
    expect(review).toHaveLength(360);
    expect(new Set(review.map((r) => r.id)).size).toBe(review.length);
    for (const r of review) {
      if (r.decision === 'incluir') expect(r.tema && r.sentimiento && r.objetivo && r.voz, r.id).toBeTruthy();
      else expect(r.motivo, r.id).toBeTruthy();
    }
  });
});

describe('reproducibilidad', () => {
  it('los datos publicados se regeneran idénticos desde los archivos fuente', () => {
    expect(full.registros).toEqual(all);
    expect(full.resumen).toEqual(sum);
    expect(full.figuras).toEqual(figs);
    expect(full.auditoriaCsv).toBe(readFileSync(`${ROOT}public/data/auditoria.csv`, 'utf8'));
    expect(full.auditoriaWebCsv).toBe(readFileSync(`${ROOT}public/data/auditoria-web.csv`, 'utf8'));
  });

  it('la auditoría tiene una fila por cada registro original y cuadra con el informe', () => {
    expect(out.auditoria).toHaveLength(815);
    const by = (f: string) => out.auditoria.filter((a) => a.final === f).length;
    expect(by('incluido')).toBe(rs.length);
    expect(by('replica')).toBe(sum.revision.replicas);
    expect(by('duplicado')).toBe(13);
    expect(by('incluido') + by('replica') + by('excluido') + by('sin_texto') + by('duplicado')).toBe(815);
  });

  it('cifras finales: 311 pertinentes tras la revisión, 9 réplicas, 302 de la escucha y 325 en total', () => {
    expect(sum.revision.incluidos).toBe(311);
    expect(sum.revision.replicas).toBe(9);
    expect(sum.final).toBe(302);
    expect(rs).toHaveLength(302);
    expect(all).toHaveLength(325);
  });
});

describe('atribución a Ciro Fernández', () => {
  const rows = [...src.base, ...src.pendiente, ...recovered];
  const byId = new Map(rows.map((r) => [r.id, r]));

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

  it('29 publicaciones propias, 1 mención de terceros y ninguna propia sin texto', () => {
    expect(sum.ciro.propiasContadas).toBe(29);
    expect(sum.ciro.mencionesTerceros).toBe(1);
    expect(sum.ciro.propiasSinTexto).toHaveLength(0);
  });

  it('las 14 recuperadas son las publicaciones propias que la auditoría tenía sin texto', () => {
    const audit = new Map(src.audit.map((a) => [a.id, a]));
    expect(recovered).toHaveLength(14);
    for (const r of recovered) {
      expect(audit.get(r.id)?.decision, r.id).toBe('Excluir');
      expect(audit.get(r.id)?.enlace).toBe(r.url);
      expect(r.url).toMatch(/^https:\/\/twitter\.com\/CiroFernandezN\/status\/\d+$/);
      expect(r.texto.length).toBeGreaterThan(0);
    }
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

describe('investigación web', () => {
  const ext = full.ext;

  it('trae las 26 notas declaradas y los 220 registros de Sentione sin cambios', () => {
    for (const c of sum.web.validacion) expect(c, c.label).toMatchObject({ ok: true });
    expect(ext.web).toHaveLength(26);
  });

  it('los CSV entregados coinciden con el libro ampliado', () => {
    const [h1, ...webCsv] = parseCsv(readFileSync(`${ROOT}${SOURCE_WEB_CSV}`, 'utf8').replace(/^\uFEFF/, ''));
    expect(webCsv.map((r) => r[h1.indexOf('ID')])).toEqual(ext.web.map((w) => w.id));
    expect(webCsv.map((r) => r[h1.indexOf('URL original')])).toEqual(ext.web.map((w) => w.url));
    const [h2, ...amp] = parseCsv(readFileSync(`${ROOT}${SOURCE_AMPLIADA_CSV}`, 'utf8').replace(/^\uFEFF/, ''));
    expect(amp).toHaveLength(246);
    expect(amp.filter((r) => r[h2.indexOf('Fuente')] === 'Sentione').map((r) => r[h2.indexOf('ID')])).toEqual(src.base.map((b) => b.id));
  });

  it('23 notas en el informe, separadas de la escucha y sin repetir registros de Sentione', () => {
    expect(web).toHaveLength(23);
    expect(sum.web.duplicadosConSentione).toEqual([]);
    const sentioneUrls = new Set([...src.base, ...src.pendiente].map((r) => r.url));
    for (const w of web) expect(sentioneUrls.has(w.url), w.id).toBe(false);
  });

  it('no inventa texto ni interacciones: el extracto es el titular y el resumen queda aparte', () => {
    for (const w of web) {
      const s = ext.web.find((x) => x.id === w.id)!;
      expect(s.texto).toBe('');
      expect(s.interacciones).toBe(0);
      expect(w.extracto).toBe(cleanText(s.titulo));
      expect(w.texto).toBeUndefined();
      expect(w.sentione).toBe('no_aplica');
    }
  });

  it('los resúmenes editoriales no cuentan como voz ciudadana ni como evidencia', () => {
    for (const w of web) expect(['medio', 'institucional']).toContain(w.voz);
    const ids = new Set(Object.values(curated as Record<string, { items: { id: string }[] }>).flatMap((g) => g.items.map((i) => i.id)));
    for (const w of web) expect(ids.has(w.id)).toBe(false);
  });

  it('ninguna nota web se atribuye a Ciro si no lo nombra', () => {
    for (const w of web) expect(w.ciro).toBeNull();
    expect(readReviewWeb()).toHaveLength(26);
  });
});

describe('figuras políticas', () => {
  const by = (id: string) => figs.find((f) => f.id === id)!;

  it('Fabián Oviedo se trata como Bucaramanga, no como aspirante en Barrancabermeja', () => {
    expect(by('oviedo').grupo).toBe('otro_municipio');
    expect(figs.filter((f) => f.grupo === 'alcaldia').map((f) => f.id)).toEqual(['ciro', 'carrillo', 'baeza', 'arias', 'granados']);
  });

  it('ninguna candidatura figura como confirmada', () => {
    for (const f of figs.filter((x) => x.grupo !== 'otro_municipio'))
      expect(`${f.situacion} ${f.tratamiento}`, f.nombre).toMatch(/(no|sin) (confirm|inscrip)|no clasificar|pendiente|eventual|posible/i);
  });

  it('Carrillo, Baeza y Arias no aparecen en la escucha; Granados aparece como funcionario', () => {
    for (const id of ['carrillo', 'baeza', 'arias']) expect(by(id).sentione, id).toBe(0);
    expect(by('granados').comoFuncionario / by('granados').sentione).toBeGreaterThanOrEqual(0.8);
  });

  it('la publicación «por validar» de Santander Se Conecta está en la escucha con enlace y fecha', () => {
    expect(sum.web.hallazgoPorValidar.enSentione).toMatchObject({ id: 'twitter_2099848070871625899', url: 'https://twitter.com/SanSeConecta/status/2099848070871625899' });
    expect(by('ciro').propias).toBe(29);
  });
});
