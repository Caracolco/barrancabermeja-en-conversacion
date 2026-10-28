/**
 * Motor de depuración. Funciones puras: reciben las filas de la exportación de Sentione y la revisión
 * registro a registro, y devuelven los registros del informe, el resumen de validación y la auditoría.
 * No lee archivos; eso lo hace scripts/build-data.ts.
 */
import { CIRO_FB_PAGE, CIRO_NAME, CIRO_X, TOPIC_RULES } from './config';
import type { AuditoriaFila, AuditRow, Check, CiroRel, Format, Platform, Registro, Resumen, ReviewEntry, Sentiment, SourceRow, TopicId } from './types';

const ENTITIES: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>', nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

/**
 * Texto legible: entidades decodificadas, restos de atributos HTML que dejan algunos portales
 * («" type="text/html" data-cms-ai="0">») eliminados y espacios colapsados. No cambia palabras.
 */
export function cleanText(s: string): string {
  return decodeEntities(s ?? '')
    .replace(/"(?:\s+(?:type|target|rel|data-[\w-]+)="[^"]*")+\s*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Para comparar textos: sin tildes, enlaces, menciones, etiquetas ni puntuación. */
export function normalize(s: string): string {
  return cleanText(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][\w.]+/g, ' ')
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function platformOf(raw: string, id = ''): Platform {
  if (/twitter|^x\b/i.test(raw)) return 'X';
  if (/facebook/i.test(raw)) return 'Facebook';
  if (/instagram/i.test(raw)) return 'Instagram';
  if (/video|youtube/i.test(raw) || id.startsWith('youtube_')) return 'YouTube';
  return 'Sitios web';
}

export function formatOf(tipo: string): Format {
  if (/comment/i.test(tipo)) return 'Comentario';
  if (/article/i.test(tipo)) return 'Artículo';
  if (/video|reel/i.test(tipo)) return 'Video';
  return 'Publicación';
}

export function sentioneOf(raw: string): Sentiment | 'sin_clasificar' {
  const r = (raw ?? '').toUpperCase();
  if (r === 'POSITIVE') return 'positivo';
  if (r === 'NEGATIVE') return 'negativo';
  if (r === 'NEUTRAL') return 'neutral';
  return 'sin_clasificar';
}

/** Publicación propia: la cuenta de X @CiroFernandezN o la página de Facebook identificada. */
export function isCiroAccount(r: Pick<SourceRow, 'autor' | 'url' | 'id'>): boolean {
  return CIRO_X.test(r.autor) || CIRO_X.test(r.url) || r.id.startsWith(`${CIRO_FB_PAGE}_`);
}

/**
 * Mención directa: el texto nombra a «Ciro Fernández» y se refiere a Barrancabermeja o a su carrera política.
 * La palabra clave de captura no cuenta: Sentione la asigna aunque el texto no lo nombre.
 */
export function mentionsCiro(text: string): boolean {
  const t = cleanText(text);
  return CIRO_NAME.test(t) && /(barrancabermeja|barranca|santander|magdalena medio|alcald|congres|precandidat|cambio radical)/i.test(t);
}

export function ciroRelation(r: SourceRow): CiroRel {
  if (isCiroAccount(r)) return 'propia';
  if (mentionsCiro(`${r.titulo} ${r.texto}`)) return 'mencion';
  return null;
}

/** Propuesta automática de tema; la revisión manual decide. */
export function suggestTopic(text: string): TopicId | null {
  const t = cleanText(text);
  for (const [id, re] of TOPIC_RULES) if (re.test(t)) return id;
  return null;
}

const NEG = /(preocupa|abandono|crisis|corrup|irregular|no (?:est[aá]n )?haciendo nada|peligro|inseguridad|injust|desprop[oó]sito|descabellad|barbarie|triste|porquer[ií]a|incumpl|retras|errores|denunci|hurtos|desempleo|molidero|se burl|vurlo|ignorando|amenazas|obligan|sinverg)/i;
const POS = /(buena noticia|qu[eé] bueno|logro|celebr|beneficia|oportunidades|reconocer el trabajo|gracias|apuesta por|avance importante)/i;
const IRONY = /(ja(?:ja)+|j[ae]j[ae]|🤣|😂|🙄|🤡|esta belleza)/i;

/**
 * Propuesta automática de sentimiento con reglas en español: negación antes de una palabra positiva,
 * ironía (risas, «esta belleza») y notas de medios que solo se polarizan con señales fuertes.
 */
export function suggestSentiment(text: string, format?: Format): Sentiment {
  const t = cleanText(text);
  const negatedPos = /\bno\s+(?:\w+\s+){0,2}(?:es\s+)?(?:una\s+)?(?:buena noticia|bueno|logro)/i.test(t);
  const neg = NEG.test(t) || negatedPos;
  const pos = POS.test(t) && !negatedPos;
  if (IRONY.test(t)) return neg ? 'negativo' : 'no_determinable';
  if (neg && pos) return format === 'Artículo' ? 'neutral' : 'negativo';
  if (neg) return format === 'Artículo' && !/(errores de gesti[oó]n|irregularidad|incumpl|retras)/i.test(t) ? 'neutral' : 'negativo';
  if (pos) return format === 'Artículo' ? 'neutral' : 'positivo';
  return 'neutral';
}

/** Similitud de Jaccard entre los conjuntos de palabras de dos textos normalizados. */
export function similarity(a: string, b: string): number {
  const A = new Set(normalize(a).split(' ').filter((w) => w.length > 2));
  const B = new Set(normalize(b).split(' ').filter((w) => w.length > 2));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export const REPLICA_SIMILARITY = 0.85;
export const REPLICA_DAYS = 7;

/**
 * Réplicas: la misma cuenta publica el mismo texto en la misma plataforma con menos de 7 días de diferencia
 * (cambian solo enlaces, etiquetas o una mención; similitud de palabras ≥ 0,85). Se conserva la primera
 * y las demás no se cuentan. La misma nota en otra plataforma o de otro medio sí cuenta: llega a otro público.
 */
export function findReplicas(rows: { id: string; autor: string; plataforma: Platform; fecha: string; texto: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  const kept: typeof rows = [];
  const sorted = [...rows].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  for (const r of sorted) {
    const author = r.autor.trim().toLowerCase();
    const orig = author
      ? kept.find(
          (p) =>
            p.autor.trim().toLowerCase() === author &&
            p.plataforma === r.plataforma &&
            Math.abs(Date.parse(r.fecha) - Date.parse(p.fecha)) <= REPLICA_DAYS * 864e5 &&
            similarity(p.texto, r.texto) >= REPLICA_SIMILARITY,
        )
      : undefined;
    if (orig) out.set(r.id, orig.id);
    else kept.push(r);
  }
  return out;
}

export interface Declared {
  filas: number;
  incluidos: number;
  pendientes: number;
  excluidos: number;
  duplicados: number;
  ventana: { desde: string; hasta: string };
}

/** Comprueba que la exportación coincide con las cifras declaradas en la depuración preliminar. */
export function validate(audit: AuditRow[], base: SourceRow[], pend: SourceRow[], declared: Declared): Check[] {
  const count = (d: AuditRow['decision']) => audit.filter((a) => a.decision === d).length;
  const seen = new Set<string>();
  let repeated = 0;
  for (const a of audit) {
    if (seen.has(a.id)) repeated++;
    seen.add(a.id);
  }
  const auditInc = new Set(audit.filter((a) => a.decision === 'Incluir').map((a) => a.id));
  const auditRev = new Set(audit.filter((a) => a.decision === 'Revisar').map((a) => a.id));
  const c = (id: string, label: string, expected: number, actual: number): Check => ({ id, label, expected, actual, ok: expected === actual });
  return [
    c('filas', 'Registros originales (filas de la auditoría)', declared.filas, audit.length),
    c('incluidos', 'Incluidos preliminarmente', declared.incluidos, count('Incluir')),
    c('pendientes', 'Pendientes de revisión', declared.pendientes, count('Revisar')),
    c('excluidos', 'Excluidos por pertinencia', declared.excluidos, count('Excluir')),
    c('duplicados', 'Filas con identificador repetido', declared.duplicados, count('Duplicado')),
    c('duplicados-id', 'Filas cuyo identificador ya apareció antes', count('Duplicado'), repeated),
    c('hoja-base', 'Hoja «Base depurada» = incluidos de la auditoría', count('Incluir'), base.filter((b) => auditInc.has(b.id)).length),
    c('hoja-pendiente', 'Hoja «Revisión pendiente» = pendientes de la auditoría', count('Revisar'), pend.filter((p) => auditRev.has(p.id)).length),
    c('suma', 'Incluidos + pendientes + excluidos + duplicados', audit.length, count('Incluir') + count('Revisar') + count('Excluir') + count('Duplicado')),
  ];
}

export interface BuildInput {
  base: SourceRow[];
  /** Publicaciones de la auditoría sin texto en la exportación, recuperadas después de su enlace público. */
  recuperadas?: SourceRow[];
  pendiente: SourceRow[];
  audit: AuditRow[];
  review: ReviewEntry[];
  declared: Declared;
  archivo: string;
  /** Registros que se muestran como evidencia: llevan el texto completo. */
  evidenceIds: string[];
}

const EXCERPT = 140;

export function excerpt(text: string, max = EXCERPT): string {
  const t = cleanText(text);
  if (t.length <= max) return t;
  const at = t.lastIndexOf(' ', max);
  return `${t.slice(0, at > max * 0.6 ? at : max)}…`;
}

export function fullText(r: Pick<SourceRow, 'titulo' | 'texto'>): string {
  const title = cleanText(r.titulo);
  const body = cleanText(r.texto);
  return title && !body.startsWith(title) ? `${title}. ${body}` : body || title;
}

export function build(input: BuildInput): { registros: Registro[]; resumen: Omit<Resumen, 'web'>; auditoria: AuditoriaFila[] } {
  const { base, pendiente, audit, review, declared } = input;
  const recuperadas = input.recuperadas ?? [];
  const auditIds = new Set(audit.map((a) => a.id));
  const ajenas = recuperadas.filter((r) => !auditIds.has(r.id)).map((r) => r.id);
  if (ajenas.length) throw new Error(`Recuperadas que no están en la auditoría: ${ajenas.join(', ')}`);
  const rows = [...base, ...pendiente, ...recuperadas];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const rev = new Map(review.map((r) => [r.id, r]));
  const missing = rows.filter((r) => !rev.has(r.id)).map((r) => r.id);
  if (missing.length) throw new Error(`Registros sin revisión: ${missing.join(', ')}`);
  const extra = review.filter((r) => !byId.has(r.id)).map((r) => r.id);
  if (extra.length) throw new Error(`Revisión de registros que no están en la fuente: ${extra.join(', ')}`);

  const included = rows.filter((r) => rev.get(r.id)!.decision === 'incluir');
  const replicas = findReplicas(included.map((r) => ({ id: r.id, autor: r.autor, plataforma: platformOf(r.plataforma, r.id), fecha: r.fecha, texto: fullText(r) })));
  const evidence = new Set(input.evidenceIds);

  const registros: Registro[] = included
    .filter((r) => !replicas.has(r.id))
    .map((r) => {
      const v = rev.get(r.id)!;
      const ciro = ciroRelation(r);
      const voz = ciro === 'propia' ? 'ciro' : v.voz!;
      const reg: Registro = {
        id: r.id,
        fuente: 'sentione',
        fecha: r.fecha.slice(0, 10),
        plataforma: platformOf(r.plataforma, r.id),
        formato: formatOf(r.tipo),
        autor: voz === 'ciudadano' || !r.autor.trim() ? null : r.autor.trim(),
        url: r.url,
        tema: v.tema!,
        sentimiento: v.sentimiento!,
        objetivo: v.objetivo!,
        voz,
        ciro,
        sentione: sentioneOf(r.sentione),
        extracto: excerpt(fullText(r)),
      };
      if (evidence.has(r.id)) reg.texto = fullText(r);
      if (v.revisar) reg.revisar = v.revisar;
      return reg;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));

  // Auditoría de las 815 filas.
  const finalOf = new Map<string, { final: AuditoriaFila['final']; motivo: string }>();
  for (const r of rows) {
    const v = rev.get(r.id)!;
    if (v.decision === 'excluir') finalOf.set(r.id, { final: 'excluido', motivo: v.motivo ?? '' });
    else if (replicas.has(r.id)) finalOf.set(r.id, { final: 'replica', motivo: `Réplica de ${replicas.get(r.id)} (misma cuenta, plataforma y texto)` });
    else finalOf.set(r.id, { final: 'incluido', motivo: v.nota ?? '' });
  }
  const seenAudit = new Set<string>();
  const auditoria: AuditoriaFila[] = audit.map((a) => {
    const first = !seenAudit.has(a.id);
    seenAudit.add(a.id);
    let f: { final: AuditoriaFila['final']; motivo: string };
    if (a.decision === 'Duplicado' || !first) f = { final: 'duplicado', motivo: 'Identificador ya presente en una fila anterior' };
    else if (finalOf.has(a.id)) f = finalOf.get(a.id)!;
    else if (CIRO_X.test(a.enlace) || a.id.startsWith(`${CIRO_FB_PAGE}_`))
      f = { final: 'sin_texto', motivo: 'Publicación propia de Ciro Fernández excluida en la depuración preliminar; el texto no está en los archivos entregados' };
    else if (a.ciro && /hom[oó]nimo|otra localidad/i.test(a.justificacion))
      f = { final: 'excluido', motivo: 'Homónimo: el enlace corresponde a un medio de otro país o localidad' };
    else if (a.ciro && /hist[oó]rica/i.test(a.justificacion))
      f = { final: 'excluido', motivo: 'Nota de años anteriores sobre su paso por el Congreso; no es conversación actual' };
    else if (a.ciro) f = { final: 'sin_texto', motivo: 'Marcada con Ciro en el contenido y excluida en la depuración preliminar; texto no disponible para verificar' };
    else f = { final: 'excluido', motivo: `Depuración preliminar: ${a.justificacion}` };
    return { fila: a.fila, id: a.id, preliminar: a.decision, justificacion: a.justificacion, final: f.final, motivo: f.motivo, enlace: a.enlace };
  });

  // Resumen.
  const prelim = (d: AuditRow['decision']) => audit.filter((a) => a.decision === d).length;
  const porMotivo: Record<string, number> = {};
  for (const v of review) if (v.decision === 'excluir') porMotivo[v.motivo ?? 'otro'] = (porMotivo[v.motivo ?? 'otro'] ?? 0) + 1;
  const baseIds = new Set(base.map((b) => b.id));
  const pendIds = new Set(pendiente.map((p) => p.id));
  const ciroOwnRows = rows.filter((r) => isCiroAccount(r) && rev.get(r.id)!.decision === 'incluir');
  const excludedPrelim = auditoria.filter((a) => a.preliminar === 'Excluir');
  const comparable = registros.filter((r) => r.sentione !== 'sin_clasificar');
  const motorTema = registros.filter((r) => suggestTopic(fullText(byId.get(r.id)!)) === r.tema).length;
  const motorSent = registros.filter((r) => suggestSentiment(fullText(byId.get(r.id)!), r.formato) === r.sentimiento).length;
  const fechas = registros.map((r) => r.fecha).sort();

  const resumen: Omit<Resumen, 'web'> = {
    fuente: { archivo: input.archivo, ventana: declared.ventana, filas: audit.length },
    rango: { desde: fechas[0], hasta: fechas[fechas.length - 1] },
    validacion: validate(audit, base, pendiente, declared),
    preliminar: {
      incluir: prelim('Incluir'),
      revisar: prelim('Revisar'),
      excluir: prelim('Excluir'),
      duplicado: prelim('Duplicado'),
      idsDuplicados: new Set(audit.filter((a) => a.decision === 'Duplicado').map((a) => a.id)).size,
    },
    revision: {
      revisados: rows.length,
      incluidos: included.length,
      excluidos: rows.length - included.length,
      replicas: replicas.size,
      porMotivo,
      deIncluirAExcluir: review.filter((v) => v.decision === 'excluir' && baseIds.has(v.id)).length,
      deRevisarAIncluir: review.filter((v) => v.decision === 'incluir' && pendIds.has(v.id)).length,
      marcadosRevisar: registros.filter((r) => r.revisar).length,
    },
    final: registros.length,
    ciro: {
      propiasConTexto: ciroOwnRows.length,
      propiasContadas: registros.filter((r) => r.ciro === 'propia').length,
      propiasSinTexto: auditoria.filter((a) => a.final === 'sin_texto' && CIRO_X.test(a.enlace)).map((a) => ({ fila: a.fila, enlace: a.enlace })),
      mencionesTerceros: registros.filter((r) => r.ciro === 'mencion').length,
      mencionesAuditoria: audit
        .filter((a) => a.ciro)
        .map((a) => {
          const f = auditoria.find((x) => x.fila === a.fila)!;
          return { fila: a.fila, decision: a.decision, justificacion: a.justificacion, enlace: a.enlace, final: f.final };
        }),
      cuentas: ['@CiroFernandezN (X)', 'Ciro Fernández (Facebook)'],
    },
    excluidosSinTexto: {
      total: excludedPrelim.length,
      facebook: excludedPrelim.filter((a) => /facebook\.com/.test(a.enlace)).length,
      comentariosFacebook: excludedPrelim.filter((a) => a.id.startsWith('fbgen_')).length,
    },
    sentione: {
      sinClasificar: registros.length - comparable.length,
      comparables: comparable.length,
      coincidencia: comparable.filter((r) => r.sentione === r.sentimiento).length,
    },
    motor: { temaCoincide: motorTema, sentimientoCoincide: motorSent, total: registros.length },
  };
  return { registros, resumen, auditoria };
}

export function toCsv(rows: AuditoriaFila[]): string {
  const cols: (keyof AuditoriaFila)[] = ['fila', 'id', 'preliminar', 'justificacion', 'final', 'motivo', 'enlace'];
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n';
}
