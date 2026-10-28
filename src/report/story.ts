/**
 * Cifras del informe ejecutivo. Todo se deriva de los registros depurados (src/data/registros.json) y del
 * resumen de validación; los titulares se arman con estas cifras para que cambien si la base se actualiza.
 */
import { TOPIC_LABEL } from '../lib/config';
import { buildConclusions, type Conclusion } from '../lib/conclusions';
import type { CiroRel, Figura, Format, Platform, Registro, Resumen, Sentiment, Target, TopicId, Voice } from '../lib/types';
import registrosData from '../data/registros.json';
import resumenData from '../data/resumen.json';
import curated from '../data/evidencias.json';
import figurasData from '../data/figuras.json';

export const REGISTROS = registrosData as Registro[];
export const RESUMEN = resumenData as Resumen;
export const FIGURAS = figurasData as Figura[];

export const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);

/** Lunes de la semana (ISO) de una fecha AAAA-MM-DD. */
export function weekStart(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  const day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day);
  return t.toISOString().slice(0, 10);
}

export const month = (d: string) => d.slice(0, 7);

/** Evidencia: todos los campos salen del registro original; solo `about` y `why` son editoriales. */
export interface Evidence {
  id: string;
  about: string;
  why: string;
  fragmento: string;
  texto: string;
  /** El fragmento no empieza o no termina donde lo hace el texto original. */
  cutStart: boolean;
  cutEnd: boolean;
  autor: string | null;
  voz: Voice;
  plataforma: Platform;
  formato: Format;
  fecha: string;
  url: string;
  sentimiento: Sentiment;
  objetivo: Target;
  ciro: CiroRel;
}

type CuratedItem = { id: string; about: string; why: string; fragmento: string };
type CuratedGroup = { headline: string; nota: string; items: CuratedItem[] };

export const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

export function pickEvidence(items: CuratedItem[], rs: Registro[]): Evidence[] {
  const byId = new Map(rs.map((r) => [r.id, r]));
  return items.flatMap((c) => {
    const r = byId.get(c.id);
    if (!r || !r.texto) return [];
    const texto = squash(r.texto);
    const frag = squash(c.fragmento);
    const at = texto.indexOf(frag);
    if (at < 0) return [];
    return [
      {
        id: r.id,
        about: c.about,
        why: c.why,
        fragmento: frag,
        texto,
        cutStart: at > 0,
        cutEnd: at + frag.length < texto.length && !/[.!?…]$/.test(frag),
        autor: r.autor,
        voz: r.voz,
        plataforma: r.plataforma,
        formato: r.formato,
        fecha: r.fecha,
        url: r.url,
        sentimiento: r.sentimiento,
        objetivo: r.objetivo,
        ciro: r.ciro,
      },
    ];
  });
}

export interface TopicRow {
  id: TopicId;
  label: string;
  total: number;
  negativo: number;
  negRate: number;
  share: number;
  /** Notas de investigación web sobre el tema (no se suman al volumen de la escucha). */
  web: number;
}

export interface WebStory {
  total: number;
  rows: number;
  excluded: number;
  medios: { medio: string; n: number }[];
  counts: Record<Sentiment, number>;
  ciro: number;
  /** Nota que reporta posibles aspiraciones a la Alcaldía 2027. */
  tablero?: Registro;
}

export interface FigureStory {
  alcaldia: Figura[];
  concejo: Figura[];
  otros: Figura[];
  /** Posibles aspirantes a la Alcaldía que la escucha nunca nombra. */
  soloWeb: Figura[];
  /** Posibles aspirantes que la escucha nombra solo como funcionarios. */
  funcionarios: Figura[];
}

export interface Story {
  period: { from: string; to: string; dataFrom: string; dataTo: string };
  rawRows: number;
  reviewed: number;
  analyzed: number;
  replicas: number;
  resumen: Resumen;
  conversation: {
    months: { month: string; total: number; ciro: number; web: number }[];
    weekly: { week: string; total: number; ciro: number }[];
    peak: { week: string; total: number; topic: string; topicCount: number };
    recent: { months: string[]; total: number; share: number };
    platforms: { p: Platform; n: number }[];
    articles: number;
    voices: Record<Voice, number>;
  };
  ciro: {
    direct: number;
    own: number;
    third: number;
    share: number;
    ownShare: number;
    firstOwn: string;
    monthly: { month: string; propia: number; terceros: number }[];
    topics: { id: TopicId; label: string; n: number }[];
    tone: Record<Sentiment, number>;
    platforms: { p: Platform; n: number }[];
    ownWithoutText: number;
    unverifiable: number;
    homonyms: number;
    historic: number;
    otherRecords: number;
    mention?: Evidence;
  };
  topics: { rows: TopicRow[]; critical: TopicRow[]; minForCritical: number };
  sentiment: {
    counts: Record<Sentiment, number>;
    total: number;
    negTargets: Record<Target, number>;
    /** Registros negativos dirigidos a Ciro Fernández. */
    negToCiro: number;
    citizens: { total: number; negative: number; toAlcaldia: number; comments: number };
    positiveFrom: Record<Voice, number>;
  };
  evidence: { ciudad: CuratedGroup & { list: Evidence[] }; ciro: CuratedGroup & { list: Evidence[] }; temas: Evidence[] };
  web: WebStory;
  figures: FigureStory;
  conclusions: Conclusion[];
}

const zeroSent = (): Record<Sentiment, number> => ({ positivo: 0, neutral: 0, negativo: 0, no_determinable: 0 });
const zeroTarget = (): Record<Target, number> => ({ ciro: 0, otro_actor: 0, alcaldia: 0, ciudad: 0, sin_objetivo: 0 });
const zeroVoice = (): Record<Voice, number> => ({ ciro: 0, medio: 0, ciudadano: 0, institucional: 0 });

function count<K extends string>(rs: Registro[], key: (r: Registro) => K): Map<K, number> {
  const m = new Map<K, number>();
  for (const r of rs) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return m;
}

/** Meses entre dos fechas, ambos incluidos («2026-01» … «2026-10»). */
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number);
  const end = to.slice(0, 7);
  while (`${y}-${String(m).padStart(2, '0')}` <= end) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) [y, m] = [y + 1, 1];
  }
  return out;
}

export const MIN_FOR_CRITICAL = 15;

export function buildStory(
  all: Registro[] = REGISTROS,
  resumen: Resumen = RESUMEN,
  groups = curated as Record<'ciudad' | 'ciro' | 'temas', CuratedGroup>,
  figuras: Figura[] = FIGURAS,
): Story {
  // Una sola base: todas las publicaciones pertinentes se analizan juntas.
  const rs = all;
  const webRs = all.filter((r) => r.fuente === 'web');
  const total = rs.length;
  const period = { from: resumen.fuente.ventana.desde, to: resumen.fuente.ventana.hasta, dataFrom: resumen.rango.desde, dataTo: resumen.rango.hasta };
  const isCiro = (r: Registro) => r.ciro !== null;

  // La conversación
  const months = monthsBetween(period.from, period.to).map((mo) => {
    const inMonth = rs.filter((r) => month(r.fecha) === mo);
    return { month: mo, total: inMonth.length, ciro: inMonth.filter(isCiro).length, web: webRs.filter((r) => month(r.fecha) === mo).length };
  });
  const weeks: string[] = [];
  for (let w = weekStart(period.dataFrom); w <= weekStart(period.dataTo); ) {
    weeks.push(w);
    const t = new Date(`${w}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 7);
    w = t.toISOString().slice(0, 10);
  }
  const weekly = weeks.map((week) => {
    const inWeek = rs.filter((r) => weekStart(r.fecha) === week);
    return { week, total: inWeek.length, ciro: inWeek.filter(isCiro).length };
  });
  const peakW = weekly.reduce((a, b) => (b.total > a.total ? b : a), weekly[0]);
  const peakTopics = [...count(rs.filter((r) => weekStart(r.fecha) === peakW.week), (r) => r.tema).entries()].sort((a, b) => b[1] - a[1]);
  const recentMonths = months.filter((m) => m.total > 0).slice(-3).map((m) => m.month);
  const recentTotal = rs.filter((r) => recentMonths.includes(month(r.fecha))).length;
  const platforms = [...count(rs, (r) => r.plataforma).entries()].map(([p, n]) => ({ p, n })).sort((a, b) => b.n - a.n);
  const voices = zeroVoice();
  for (const r of rs) voices[r.voz]++;

  // Ciro Fernández
  const direct = rs.filter(isCiro);
  const own = direct.filter((r) => r.ciro === 'propia');
  const third = direct.filter((r) => r.ciro === 'mencion');
  const tone = zeroSent();
  for (const r of own) tone[r.sentimiento]++;
  const ciroTopics = [...count(direct, (r) => r.tema).entries()].map(([id, n]) => ({ id, label: TOPIC_LABEL[id], n })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  const audit = resumen.ciro.mencionesAuditoria;
  const evCiro = pickEvidence(groups.ciro.items, rs);

  // Temas
  const rows: TopicRow[] = [...count(rs, (r) => r.tema).entries()]
    .map(([id, n]) => {
      const neg = rs.filter((r) => r.tema === id && r.sentimiento === 'negativo').length;
      return { id, label: TOPIC_LABEL[id], total: n, negativo: neg, negRate: pct(neg, n), share: pct(n, total), web: webRs.filter((r) => r.tema === id).length };
    })
    .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  const critical = rows.filter((t) => t.total >= MIN_FOR_CRITICAL).sort((a, b) => b.negRate - a.negRate || b.total - a.total);

  // Sentimiento
  const counts = zeroSent();
  for (const r of rs) counts[r.sentimiento]++;
  const negTargets = zeroTarget();
  for (const r of rs) if (r.sentimiento === 'negativo') negTargets[r.objetivo]++;
  const citizens = rs.filter((r) => r.voz === 'ciudadano');
  const positiveFrom = zeroVoice();
  for (const r of rs) if (r.sentimiento === 'positivo') positiveFrom[r.voz]++;

  // Investigación web
  const webCounts = zeroSent();
  for (const r of webRs) webCounts[r.sentimiento]++;
  const medios = [...count(webRs, (r) => r.autor ?? 'Sin medio').entries()].map(([medio, n]) => ({ medio, n })).sort((a, b) => b.n - a.n || a.medio.localeCompare(b.medio));
  const tableroUrl = figuras.find((f) => f.id === 'carrillo')?.url;

  const story: Omit<Story, 'conclusions'> = {
    period,
    rawRows: resumen.fuente.filas,
    reviewed: resumen.revision.revisados,
    analyzed: total,
    replicas: resumen.revision.replicas,
    resumen,
    conversation: {
      months,
      weekly,
      peak: { week: peakW.week, total: peakW.total, topic: peakTopics[0] ? TOPIC_LABEL[peakTopics[0][0]] : '', topicCount: peakTopics[0]?.[1] ?? 0 },
      recent: { months: recentMonths, total: recentTotal, share: pct(recentTotal, total) },
      platforms,
      articles: rs.filter((r) => r.formato === 'Artículo').length,
      voices,
    },
    ciro: {
      direct: direct.length,
      own: own.length,
      third: third.length,
      share: pct(direct.length, total),
      ownShare: pct(own.length, direct.length),
      firstOwn: own.map((r) => r.fecha).sort()[0] ?? '',
      monthly: months.map((m) => ({
        month: m.month,
        propia: own.filter((r) => month(r.fecha) === m.month).length,
        terceros: third.filter((r) => month(r.fecha) === m.month).length,
      })),
      topics: ciroTopics,
      tone,
      platforms: [...count(direct, (r) => r.plataforma).entries()].map(([p, n]) => ({ p, n })).sort((a, b) => b.n - a.n),
      ownWithoutText: resumen.ciro.propiasSinTexto.length,
      unverifiable: audit.filter((a) => a.final === 'sin_texto').length,
      homonyms: audit.filter((a) => /hom[oó]nimo/i.test(a.justificacion)).length,
      historic: audit.filter((a) => /hist[oó]rica/i.test(a.justificacion)).length,
      otherRecords: total - direct.length,
      mention: evCiro.find((e) => e.ciro === 'mencion'),
    },
    topics: { rows, critical, minForCritical: MIN_FOR_CRITICAL },
    sentiment: {
      counts,
      total,
      negTargets,
      negToCiro: negTargets.ciro,
      citizens: {
        total: citizens.length,
        negative: citizens.filter((r) => r.sentimiento === 'negativo').length,
        toAlcaldia: citizens.filter((r) => r.objetivo === 'alcaldia').length,
        comments: citizens.filter((r) => r.formato === 'Comentario').length,
      },
      positiveFrom,
    },
    evidence: {
      ciudad: { ...groups.ciudad, list: pickEvidence(groups.ciudad.items, rs) },
      ciro: { ...groups.ciro, list: evCiro },
      temas: pickEvidence(groups.temas.items, rs),
    },
    web: {
      total: webRs.length,
      rows: resumen.web.filas,
      excluded: resumen.web.excluidos,
      medios,
      counts: webCounts,
      ciro: webRs.filter((r) => r.ciro !== null).length,
      tablero: webRs.find((r) => r.url === tableroUrl),
    },
    figures: {
      alcaldia: figuras.filter((f) => f.grupo === 'alcaldia'),
      concejo: figuras.filter((f) => f.grupo === 'concejo'),
      otros: figuras.filter((f) => f.grupo === 'otro_municipio' || f.grupo === 'organizacion'),
      soloWeb: figuras.filter((f) => f.grupo === 'alcaldia' && f.sentione === 0 && f.web > 0),
      funcionarios: figuras.filter((f) => f.grupo === 'alcaldia' && f.sentione > 0 && f.comoFuncionario / f.sentione >= 0.8),
    },
  };
  return { ...story, conclusions: buildConclusions(story) };
}
