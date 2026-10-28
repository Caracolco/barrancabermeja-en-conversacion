import { fmt, fmtPct } from './format';
import type { Story } from '../report/story';

export interface Conclusion {
  id: 'visibilidad' | 'voz-propia' | 'temas' | 'percepcion' | 'cobertura';
  title: string;
  figure: string;
  figureLabel: string;
  text: string;
}

const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
const listJoin = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : (xs[0] ?? ''));
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n === 1 ? one : many}`;

/**
 * Máximo cinco conclusiones, todas derivadas de cifras de la base: visibilidad de Ciro, voz propia frente a
 * terceros, preocupaciones de la ciudad, percepciones y vacíos de cobertura. No infiere intención de voto.
 */
export function buildConclusions(s: Omit<Story, 'conclusions'>): Conclusion[] {
  const c = s.ciro;
  const [t1, t2, t3] = s.topics.rows;
  const crit = s.topics.critical[0];
  const st = s.sentiment;
  const negTotal = st.counts.negativo;
  const out: Conclusion[] = [];

  out.push({
    id: 'visibilidad',
    title: 'Ciro Fernández ocupa un lugar pequeño y el tablero 2027 apenas asoma',
    figure: `${fmt(c.direct)} de ${fmt(s.analyzed)}`,
    figureLabel: `publicaciones lo mencionan o salen de sus cuentas (${fmtPct(c.share, 1)})`,
    text:
      `Las otras ${fmt(c.otherRecords)} hablan de la ciudad sin nombrarlo. ` +
      `De los ${fmt(s.figures.alcaldia.length)} nombres que suenan para la Alcaldía, ${listJoin(s.figures.soloWeb.map((f) => f.nombre))} solo aparecen en una nota` +
      (s.web.tablero ? ` de ${s.web.tablero.autor}` : '') +
      (s.figures.funcionarios.length ? ` y ${listJoin(s.figures.funcionarios.map((f) => f.nombre))} figura en la conversación como funcionario` : '') +
      '. Ninguna candidatura está confirmada.',
  });

  out.push({
    id: 'voz-propia',
    title: 'Su visibilidad la construye él mismo',
    figure: fmtPct(c.ownShare),
    figureLabel: 'de su presencia son publicaciones propias',
    text:
      `${plural(c.own, 'publicación de sus cuentas', 'publicaciones de sus cuentas')} frente a ${plural(c.third, 'mención de un tercero', 'menciones de terceros')}, ` +
      'que lo ubica como posible precandidato a la Alcaldía.',
  });

  out.push({
    id: 'temas',
    title: `${t1.label} es la principal preocupación registrada`,
    figure: fmt(t1.total),
    figureLabel: `publicaciones sobre ${t1.label.toLowerCase()} (${fmtPct(t1.share)} del total)`,
    text:
      `Le siguen ${t2.label.toLowerCase()} (${fmt(t2.total)}) y ${t3.label.toLowerCase()} (${fmt(t3.total)}). ` +
      (crit ? `Entre los temas con al menos ${s.topics.minForCritical} publicaciones, ${crit.label.toLowerCase()} tiene la mayor carga crítica: ${fmtPct(crit.negRate)} negativos.` : ''),
  });

  out.push({
    id: 'percepcion',
    title: st.negToCiro === 0 ? 'La crítica se dirige a la ciudad y a la Alcaldía, no a Ciro' : 'La crítica se dirige sobre todo a la ciudad y a la Alcaldía',
    figure: fmtPct(pct(negTotal, st.total)),
    figureLabel: `de las publicaciones son negativas (${fmt(negTotal)}); el ${fmtPct(pct(st.counts.neutral, st.total))} es informativo`,
    text:
      `${fmt(st.negTargets.ciudad)} críticas apuntan a problemáticas de la ciudad y ${fmt(st.negTargets.alcaldia)} a la Alcaldía; ${st.negToCiro === 0 ? 'ninguna' : fmt(st.negToCiro)} se dirige a Ciro. ` +
      `De ${fmt(st.citizens.total)} voces ciudadanas, ${fmt(st.citizens.negative)} son negativas y ${fmt(st.citizens.toAlcaldia)} señalan a la administración.`,
  });

  out.push({
    id: 'cobertura',
    title: 'Vacíos de cobertura que conviene cerrar',
    figure: fmtPct(pct(s.conversation.voices.medio + s.conversation.voices.institucional, s.analyzed)),
    figureLabel: 'de las publicaciones provienen de medios e instituciones',
    text:
      `Solo ${fmt(st.citizens.total)} son de personas. No hay en la base respuestas ciudadanas a las publicaciones de Ciro ni publicaciones de los demás posibles aspirantes sobre el tema. ` +
      'El volumen de conversación no equivale a intención de voto.',
  });

  return out.slice(0, 5);
}
