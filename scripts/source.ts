/** Lectura de la exportación de Sentione (solo lectura: el archivo original nunca se modifica). */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Declared } from '../src/lib/pipeline';
import type { AuditRow, FiguraFuente, ReviewEntry, SourceRow, WebRow } from '../src/lib/types';
import { readXlsx, records } from './xlsx';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const SOURCE_XLSX = 'data/fuente/Ciro_Fernandez_escucha_depurada.xlsx';
export const SOURCE_CSV = 'data/fuente/Ciro_Fernandez_base_depurada.csv';
export const SOURCE_WEB_XLSX = 'data/fuente/Ciro_Fernandez_escucha_ampliada_fuentes_publicas.xlsx';
export const SOURCE_WEB_CSV = 'data/fuente/Ciro_Fernandez_solo_nuevas_fuentes_web.csv';
export const SOURCE_AMPLIADA_CSV = 'data/fuente/Ciro_Fernandez_base_ampliada_para_Claude.csv';
export const REVIEW = 'data/revision/revision.json';
export const EVIDENCE = 'src/data/evidencias.json';

const toSource = (r: Record<string, string>, hoja: SourceRow['hoja']): SourceRow => ({
  id: r['ID'],
  fecha: r['Fecha publicación'],
  tipo: r['Tipo'],
  plataforma: r['Plataforma'],
  titulo: r['Título'] ?? '',
  texto: r['Texto original'] ?? '',
  autor: r['Autor'] ?? '',
  url: r['URL original'] ?? '',
  keyword: r['Keyword de captura'] ?? '',
  sentione: r['Sentimiento Sentione'] ?? '',
  interacciones: Number(r['Interacciones']) || 0,
  hoja,
});

/** «01/01/2026» → «2026-01-01». */
const isoDay = (d: string) => {
  const [day, m, y] = d.trim().split('/');
  return `${y}-${m}-${day}`;
};

export interface Source {
  base: SourceRow[];
  pendiente: SourceRow[];
  audit: AuditRow[];
  declared: Declared;
}

export function readSource(path = `${ROOT}${SOURCE_XLSX}`): Source {
  const wb = readXlsx(readFileSync(path));
  const sheet = (name: string) => {
    const s = wb[name];
    if (!s) throw new Error(`Falta la hoja «${name}» en ${path}`);
    return s;
  };
  const base = records(sheet('Base depurada')).map((r) => toSource(r, 'base'));
  const pendiente = records(sheet('Revisión pendiente')).map((r) => toSource(r, 'pendiente'));
  const audit: AuditRow[] = records(sheet('Auditoría')).map((r) => ({
    fila: Number(r['Fila original']),
    id: r['ID'],
    decision: r['Decisión preliminar'] as AuditRow['decision'],
    justificacion: r['Justificación'],
    categoria: r['Categoría'],
    ciro: /^s[ií]$/i.test(r['Ciro en el contenido'] ?? ''),
    enlace: r['Enlace'],
  }));

  // «Resumen y método»: dos columnas, etiqueta y valor.
  const kv = new Map(sheet('Resumen y método').map((r) => [(r[0] ?? '').trim(), (r[1] ?? '').trim()]));
  const num = (k: string) => {
    const v = Number(kv.get(k));
    if (!Number.isFinite(v)) throw new Error(`Valor declarado no numérico: ${k}`);
    return v;
  };
  const [desde, hasta] = (kv.get('Ventana declarada') ?? '').split(/\s+[–-]\s+/);
  return {
    base,
    pendiente,
    audit,
    declared: {
      filas: num('Registros originales'),
      incluidos: num('Incluidos preliminarmente'),
      pendientes: num('Pendientes de revisión'),
      excluidos: num('Excluidos'),
      duplicados: num('IDs duplicados'),
      ventana: { desde: isoDay(desde), hasta: isoDay(hasta) },
    },
  };
}

export function readReview(): ReviewEntry[] {
  return JSON.parse(readFileSync(`${ROOT}${REVIEW}`, 'utf8')).registros;
}

export function readEvidenceIds(): string[] {
  const ev = JSON.parse(readFileSync(`${ROOT}${EVIDENCE}`, 'utf8')) as Record<string, { items: { id: string }[] }>;
  return Object.values(ev).flatMap((g) => g.items.map((i) => i.id));
}

export interface WebSource {
  /** Filas de Sentione dentro del libro ampliado: deben ser idénticas a la exportación original. */
  sentione: SourceRow[];
  web: WebRow[];
  figuras: FiguraFuente[];
  hallazgo: { cuenta: string; estado: string; descripcion: string; url: string };
  metodologia: Record<string, string>;
}

/** Libro ampliado: hoja «Base depurada» (220 de Sentione + notas web) y hojas de la investigación. */
export function readWebSource(path = `${ROOT}${SOURCE_WEB_XLSX}`): WebSource {
  const wb = readXlsx(readFileSync(path));
  const sheet = (name: string) => {
    const s = wb[name];
    if (!s) throw new Error(`Falta la hoja «${name}» en ${path}`);
    return s;
  };
  const base = records(sheet('Base depurada'));
  const fichas = new Map(records(sheet('Fuentes web nuevas')).map((r) => [r['ID'], r]));
  const split = (s: string) => s.split(';').map((x) => x.trim()).filter(Boolean);
  const web: WebRow[] = base
    .filter((r) => r['Fuente'] !== 'Sentione')
    .map((r) => {
      const f = fichas.get(r['ID']);
      if (!f) throw new Error(`Nota web sin ficha en «Fuentes web nuevas»: ${r['ID']}`);
      return {
        ...toSource(r, 'web'),
        resumen: f['Resumen editorial (NO transcripción)'] ?? '',
        actores: split(f['Figuras mencionadas'] ?? ''),
        estadoPolitico: f['Estado candidatura'] ?? '',
      };
    });
  const [h] = records(sheet('Hallazgo social por validar'));
  const meta = sheet('Ampliación y metodología').slice(2);
  return {
    sentione: base.filter((r) => r['Fuente'] === 'Sentione').map((r) => toSource(r, 'base')),
    web,
    figuras: records(sheet('Figuras y verificación')).map((r) => ({
      figura: r['Figura'],
      ambito: r['Municipio/ámbito'],
      referencia: r['Tipo referencia'],
      situacion: r['Situación comprobada'],
      fecha: r['Fecha fuente'],
      url: r['URL de respaldo'],
      tratamiento: r['Tratamiento en el informe'],
    })),
    hallazgo: { cuenta: h['Cuenta'], estado: h['Estado'], descripcion: h['Descripción verificada'], url: h['URL hallazgo'] },
    metodologia: Object.fromEntries(meta.map((r) => [r[0], r[1]])),
  };
}
