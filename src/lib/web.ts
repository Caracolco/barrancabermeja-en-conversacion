/**
 * Notas de investigación web y figuras políticas. Funciones puras, igual que el motor de Sentione:
 * las notas web se revisan aparte, sin texto original, sin interacciones y sin confundir el resumen
 * editorial con lo que publicó el medio.
 */
import { CIRO_NAME } from './config';
import { cleanText, excerpt, formatOf, normalize, platformOf, similarity } from './pipeline';
import type { Figura, FiguraFuente, FiguraGrupo, Registro, ResumenWeb, ReviewEntry, SourceRow, WebRow } from './types';

/** Nombre corto, expresión para encontrarlo en los textos y grupo de cada figura de la hoja «Figuras y verificación». */
export const FIGURE_RULES: { match: RegExp; id: string; nombre: string; patron: RegExp; grupo: FiguraGrupo }[] = [
  { match: /^Ciro Fern/i, id: 'ciro', nombre: 'Ciro Fernández', patron: CIRO_NAME, grupo: 'alcaldia' },
  { match: /Carrillo/i, id: 'carrillo', nombre: 'Alberto Eloy Carrillo', patron: /\b(?:Alberto\s+)?Eloy\s+Carrillo\b/i, grupo: 'alcaldia' },
  { match: /Kellin/i, id: 'baeza', nombre: 'Kellin Baeza', patron: /\bKellin\s+Baeza\b/i, grupo: 'alcaldia' },
  { match: /Fabi[aá]n Arias/i, id: 'arias', nombre: 'Fabián Arias', patron: /\bFabi[aá]n\s+Arias\b/i, grupo: 'alcaldia' },
  { match: /Granados/i, id: 'granados', nombre: 'Leonardo Granados', patron: /\bLeonardo\s+Granados\b/i, grupo: 'alcaldia' },
  { match: /Alexis Guerrero/i, id: 'guerrero', nombre: 'Alexis Guerrero', patron: /\bAlexis\s+Guerrero\b/i, grupo: 'concejo' },
  { match: /Eduardo Ram/i, id: 'ramirez', nombre: 'Eduardo Ramírez', patron: /\bEduardo\s+Ram[ií]rez\b/i, grupo: 'concejo' },
  { match: /Randy/i, id: 'jimenez', nombre: 'Randy Jiménez', patron: /\bRandy\s+Jim[eé]nez\b/i, grupo: 'concejo' },
  { match: /Oviedo/i, id: 'oviedo', nombre: 'Fabián Oviedo', patron: /\bFabi[aá]n\s+Oviedo\b|\bOviedo\b/i, grupo: 'otro_municipio' },
  { match: /Arismendi/i, id: 'arismendi', nombre: 'Luis Arismendi', patron: /\bLuis\s+Arismendi\b/i, grupo: 'organizacion' },
];

/** Cargo de la administración junto al nombre: «el secretario de Ambiente, Leonardo Granados». */
const OFFICE = /secretari[oa]|director[a]?\b|funcionari[oa]/i;

export function asOfficial(text: string, patron: RegExp): boolean {
  const t = cleanText(text);
  const re = new RegExp(patron.source, 'gi');
  for (const m of t.matchAll(re)) if (OFFICE.test(t.slice(Math.max(0, m.index - 90), m.index + m[0].length + 60))) return true;
  return false;
}

/** /AAAA/MM/DD/ dentro de la URL, si existe. */
export function urlDate(url: string): string | null {
  const m = /\/(20\d\d)\/(\d\d)\/(\d\d)\//.exec(url);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Dominios con estructura anómala que conviene abrir antes de citar. */
export function atypicalUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return /^www\.com\./.test(h) || /^chat\./.test(h);
  } catch {
    return true;
  }
}

const normUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, '');

export interface WebInput {
  web: WebRow[];
  review: ReviewEntry[];
  /** Registros de Sentione (con texto) y enlaces de la auditoría, para detectar notas repetidas. */
  sentione: SourceRow[];
  auditLinks: string[];
  ventana: { desde: string; hasta: string };
  archivo: string;
  hallazgo: { cuenta: string; estado: string };
}

export function buildWeb(input: WebInput): { registros: Registro[]; resumen: Omit<ResumenWeb, 'validacion'> } {
  const { web, review, sentione, auditLinks, ventana } = input;
  const rev = new Map(review.map((r) => [r.id, r]));
  const missing = web.filter((w) => !rev.has(w.id)).map((w) => w.id);
  if (missing.length) throw new Error(`Notas web sin revisión: ${missing.join(', ')}`);

  // Repetidas: misma URL que un registro de Sentione o que la auditoría, o el mismo titular del mismo medio.
  const known = new Set([...auditLinks, ...sentione.map((s) => s.url)].filter(Boolean).map(normUrl));
  const dup = web
    .filter(
      (w) =>
        known.has(normUrl(w.url)) ||
        sentione.some((s) => s.autor.trim().toLowerCase() === w.autor.trim().toLowerCase() && similarity(s.titulo, w.titulo) >= 0.85),
    )
    .map((w) => w.id);
  const dupSet = new Set(dup);

  const fechasDiscrepantes = web.filter((w) => urlDate(w.url) && urlDate(w.url) !== w.fecha.slice(0, 10)).map((w) => ({ id: w.id, fecha: w.fecha, enlace: w.url }));
  const fuera = web.filter((w) => w.fecha.slice(0, 10) < ventana.desde || w.fecha.slice(0, 10) > ventana.hasta).map((w) => ({ id: w.id, fecha: w.fecha }));

  const included = web.filter((w) => rev.get(w.id)!.decision === 'incluir' && !dupSet.has(w.id) && !fuera.some((f) => f.id === w.id));
  const registros: Registro[] = included.map((w) => {
    const v = rev.get(w.id)!;
    const reg: Registro = {
      id: w.id,
      fuente: 'web',
      fecha: w.fecha.slice(0, 10),
      plataforma: platformOf(w.plataforma, w.id),
      formato: formatOf(w.tipo),
      autor: w.autor.trim() || null,
      url: w.url,
      tema: v.tema!,
      sentimiento: v.sentimiento!,
      objetivo: v.objetivo!,
      voz: v.voz!,
      // Solo el titular es texto del medio; el resumen editorial no cuenta como mención.
      ciro: CIRO_NAME.test(cleanText(w.titulo)) || w.actores.some((a) => CIRO_NAME.test(a)) ? 'mencion' : null,
      sentione: 'no_aplica',
      extracto: excerpt(w.titulo),
      resumen: cleanText(w.resumen),
      actores: w.actores,
    };
    if (v.revisar) reg.revisar = v.revisar;
    return reg;
  });

  const porMotivo: Record<string, number> = {};
  for (const w of web) {
    const v = rev.get(w.id)!;
    const motivo = dupSet.has(w.id) ? 'duplicada' : v.decision === 'excluir' ? (v.motivo ?? 'otro') : null;
    if (motivo) porMotivo[motivo] = (porMotivo[motivo] ?? 0) + 1;
  }
  const medios: Record<string, number> = {};
  for (const r of registros) medios[r.autor ?? 'Sin medio'] = (medios[r.autor ?? 'Sin medio'] ?? 0) + 1;

  // La publicación «por validar» de la investigación web: ¿está en la exportación de Sentione?
  const handle = /@(\w+)/.exec(input.hallazgo.cuenta)?.[1];
  const inSentione = handle ? sentione.find((s) => new RegExp(`twitter\\.com/${handle}/status/`, 'i').test(s.url) && CIRO_NAME.test(cleanText(s.texto))) : undefined;

  return {
    registros: registros.sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id)),
    resumen: {
      archivo: input.archivo,
      filas: web.length,
      incluidos: registros.length,
      excluidos: web.length - registros.length,
      porMotivo,
      duplicadosConSentione: dup,
      fechasDiscrepantes,
      fuera,
      urlsAtipicas: web.filter((w) => atypicalUrl(w.url)).map((w) => ({ id: w.id, url: w.url })),
      sinTextoOriginal: web.filter((w) => !cleanText(w.texto)).length,
      sinInteracciones: web.filter((w) => !w.interacciones).length,
      medios,
      hallazgoPorValidar: {
        cuenta: input.hallazgo.cuenta,
        estado: input.hallazgo.estado,
        enSentione: inSentione ? { id: inSentione.id, fecha: inSentione.fecha, url: inSentione.url } : null,
      },
    },
  };
}

/**
 * Figuras: la situación sale de la hoja de verificación; las cifras, de contar en los textos de Sentione
 * (los registros del informe) y en los titulares y actores citados de las notas web.
 */
export function buildFiguras(fuentes: FiguraFuente[], sentioneTexts: { id: string; text: string }[], web: Registro[]): Figura[] {
  return fuentes.map((f) => {
    const rule = FIGURE_RULES.find((r) => r.match.test(f.figura));
    if (!rule) throw new Error(`Figura sin regla de búsqueda: ${f.figura}`);
    const hits = sentioneTexts.filter((t) => rule.patron.test(cleanText(t.text)));
    const official = hits.filter((t) => asOfficial(t.text, rule.patron)).length;
    // Una nota cuenta si la nombra en el titular, en los actores citados o si es la URL de respaldo de la hoja.
    const webHits = web.filter(
      (w) =>
        rule.patron.test(w.extracto) ||
        (w.actores ?? []).some((a) => rule.patron.test(a) || normalize(a) === normalize(rule.nombre)) ||
        normUrl(w.url) === normUrl(f.url),
    );
    let nota = '';
    if (rule.grupo === 'otro_municipio') nota = 'Vinculado a la Alcaldía de Bucaramanga; no se cuenta como aspirante en Barrancabermeja.';
    else if (hits.length && official / hits.length >= 0.8)
      nota = `En la conversación aparece como funcionario de la administración (${official} de ${hits.length + webHits.length} publicaciones lo citan con su cargo), no como aspirante.`;
    else if (!hits.length && webHits.length) nota = `Solo ${webHits.length === 1 ? 'una publicación lo nombra' : `${webHits.length} publicaciones lo nombran`}.`;
    return { ...f, id: rule.id, nombre: rule.nombre, grupo: rule.grupo, sentione: hits.length, comoFuncionario: official, web: webHits.length, nota };
  });
}
