/** Une la escucha de Sentione y la investigación web; lo usan `npm run data` y las pruebas de reproducibilidad. */
import { readFileSync } from 'node:fs';
import { build, cleanText, fullText, toCsv } from '../src/lib/pipeline';
import { buildFiguras, buildWeb } from '../src/lib/web';
import type { Check, Figura, Registro, Resumen, ReviewEntry } from '../src/lib/types';
import { readEvidenceIds, readReview, readSource, readWebSource, ROOT, SOURCE_WEB_XLSX, SOURCE_XLSX } from './source';

export const REVIEW_WEB = 'data/revision/revision-web.json';

export function readReviewWeb(): ReviewEntry[] {
  return JSON.parse(readFileSync(`${ROOT}${REVIEW_WEB}`, 'utf8')).registros;
}

export function assemble() {
  const src = readSource();
  const ext = readWebSource();
  const s = build({ ...src, review: readReview(), archivo: SOURCE_XLSX.split('/').pop()!, evidenceIds: readEvidenceIds() });
  const all = [...src.base, ...src.pendiente];
  const w = buildWeb({
    web: ext.web,
    review: readReviewWeb(),
    sentione: all,
    auditLinks: src.audit.map((a) => a.enlace),
    ventana: src.declared.ventana,
    archivo: SOURCE_WEB_XLSX.split('/').pop()!,
    hallazgo: ext.hallazgo,
  });

  // El libro ampliado debe traer los mismos 220 registros de Sentione, sin cambios.
  const orig = new Map(src.base.map((b) => [b.id, b]));
  const same = ext.sentione.filter((e) => {
    const o = orig.get(e.id);
    return o && o.fecha === e.fecha && o.url === e.url && o.texto === e.texto && o.titulo === e.titulo && o.autor === e.autor && o.interacciones === e.interacciones;
  }).length;
  const declaredWeb = Number(ext.metodologia['Nuevas noticias web verificadas']);
  const c = (id: string, label: string, expected: number, actual: number): Check => ({ id, label, expected, actual, ok: expected === actual });
  const validacion: Check[] = [
    c('web-filas', 'Notas web declaradas en la metodología', declaredWeb, ext.web.length),
    c('web-sentione', 'Registros de Sentione idénticos en el libro ampliado', src.base.length, same),
    c('web-sentione-total', 'Registros de Sentione en el libro ampliado', src.base.length, ext.sentione.length),
    c('web-ids', 'Identificadores de notas web únicos', ext.web.length, new Set(ext.web.map((x) => x.id)).size),
    c('web-fechas', 'Notas cuya fecha coincide con la de su URL', ext.web.length, ext.web.length - w.resumen.fechasDiscrepantes.length),
    c('web-sin-texto', 'Notas sin texto original (solo titular y resumen editorial)', ext.web.length, w.resumen.sinTextoOriginal),
  ];

  const byId = new Map(all.map((r) => [r.id, r]));
  const sentioneTexts = s.registros.map((r) => ({ id: r.id, text: fullText(byId.get(r.id)!) }));
  const figuras: Figura[] = buildFiguras(ext.figuras, sentioneTexts, w.registros).map((f) =>
    f.id === 'ciro'
      ? {
          ...f,
          propias: s.registros.filter((r) => r.ciro === 'propia').length,
          nota: w.resumen.hallazgoPorValidar.enSentione
            ? `Una publicación de ${ext.hallazgo.cuenta} del ${w.resumen.hallazgoPorValidar.enSentione.fecha.slice(0, 10).split('-').reverse().join('/')} lo ubica como posible precandidato a la Alcaldía de Barrancabermeja. No hay candidatura confirmada.`
            : f.nota,
        }
      : f,
  );

  const registros: Registro[] = [...s.registros, ...w.registros].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  const resumen: Resumen = { ...s.resumen, web: { validacion, ...w.resumen } };

  const revWeb = new Map(readReviewWeb().map((r) => [r.id, r]));
  const dup = new Set(w.resumen.duplicadosConSentione);
  const auditoriaWeb = ext.web.map((x, i) => {
    const v = revWeb.get(x.id)!;
    const final = dup.has(x.id) ? 'duplicado' : v.decision === 'incluir' ? 'incluido' : 'excluido';
    return { fila: i + 1, id: x.id, preliminar: 'Investigación web', justificacion: cleanText(x.estadoPolitico), final: final as 'incluido', motivo: v.nota ?? '', enlace: x.url };
  });

  return { registros, resumen, figuras, auditoriaCsv: toCsv(s.auditoria), auditoriaWebCsv: toCsv(auditoriaWeb), sentione: s, web: w, src, ext };
}
