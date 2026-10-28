import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtDate, fmtPct } from '../../lib/format';
import { TARGET_LABEL } from '../../lib/config';
import type { Sentiment, Target } from '../../lib/types';
import { pct, type Evidence, type Story } from '../story';
import { Dialog, EASE, PlatformIcon, Reveal, rise, SENT_FILL, SENT_ORDER, SENT_TEXT, SentimentTag, Slide, SourceLink, Takeaway } from '../ui';

const WORDS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function voiceLine(e: Evidence): string {
  if (e.ciro === 'propia') return e.autor ?? 'Ciro Fernández';
  if (e.voz === 'ciudadano') return e.formato === 'Comentario' ? 'Comentario ciudadano' : 'Cuenta personal';
  return e.autor ?? 'Medio digital';
}

function ScopeChip({ e }: { e: Evidence }) {
  if (e.ciro === 'propia') return <span className="chip bg-accent-soft text-accent-dark">Publicación de Ciro</span>;
  if (e.ciro === 'mencion') return <span className="chip bg-accent-soft text-accent-dark">Menciona a Ciro</span>;
  return <span className="chip bg-navy-50 text-navy-700">Sobre la ciudad</span>;
}

/** Tarjeta de red social: texto original sin editar, plataforma, fecha y enlace a la fuente. */
export function EvidenceCard({ e, onOpen, clamp = false }: { e: Evidence; onOpen: () => void; clamp?: boolean }) {
  return (
    <motion.article variants={rise} className="flex h-full flex-col rounded-2xl border border-line bg-white p-[clamp(0.9rem,2vh,1.25rem)] shadow-card" data-evidence={e.id}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${e.ciro ? 'bg-accent text-white' : 'bg-navy-900 text-white'}`}>
            <PlatformIcon p={e.plataforma} size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight text-navy-900">{voiceLine(e)}</p>
            <p className="truncate text-[12px] leading-tight text-ink-muted">
              {e.formato === 'Comentario' ? 'Comentario' : e.formato === 'Artículo' ? 'Nota' : 'Publicación'} en {e.plataforma} · {fmtDate(e.fecha)}
            </p>
          </div>
        </div>
      </header>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="truncate text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">{e.about}</p>
        <ScopeChip e={e} />
      </div>
      <blockquote className="mt-1.5 flex-1">
        <p className={`text-[clamp(13.5px,0.78rem+0.25vw,15px)] leading-relaxed text-ink ${clamp ? 'line-clamp-3' : ''}`}>
          «{e.cutStart ? '…' : ''}
          {e.fragmento}
          {e.cutEnd ? '…' : ''}»
        </p>
      </blockquote>
      <footer className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[12.5px] text-ink-muted">
        <span className="inline-flex items-center gap-2">
          <SentimentTag s={e.sentimiento} />
          <span className="text-ink-faint">hacia {TARGET_LABEL[e.objetivo].toLowerCase()}</span>
        </span>
        <span className="flex items-center gap-3">
          <button type="button" onClick={onOpen} className="font-semibold text-navy-700 hover:text-accent">
            {e.cutStart || e.cutEnd ? 'Leer completo' : 'Detalle'}
          </button>
          <SourceLink href={e.url} />
        </span>
      </footer>
    </motion.article>
  );
}

export function EvidenceDialog({ e, onClose }: { e: Evidence | null; onClose: () => void }) {
  return (
    <Dialog open={!!e} onClose={onClose} title={e?.about ?? ''}>
      {e && (
        <>
          <p className="whitespace-pre-line">{e.texto}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line pt-3 text-[13.5px]">
            <dt className="text-ink-muted">Voz</dt>
            <dd>{voiceLine(e)}</dd>
            <dt className="text-ink-muted">Plataforma</dt>
            <dd>
              {e.plataforma}, {fmtDate(e.fecha)}
            </dd>
            <dt className="text-ink-muted">Sentimiento</dt>
            <dd>
              {SENT_TEXT[e.sentimiento]}, hacia {TARGET_LABEL[e.objetivo].toLowerCase()}
            </dd>
            <dt className="text-ink-muted">Ámbito</dt>
            <dd>{e.ciro ? 'Conversación sobre Ciro Fernández' : 'Conversación sobre la ciudad; no menciona a Ciro Fernández'}</dd>
            <dt className="text-ink-muted">Por qué se eligió</dt>
            <dd>{e.why}</dd>
          </dl>
          <SourceLink href={e.url} />
        </>
      )}
    </Dialog>
  );
}

function SentimentBar({ counts, total }: { counts: Record<Sentiment, number>; total: number }) {
  const order = SENT_ORDER.filter((k) => counts[k] > 0);
  return (
    <div>
      <div className="flex h-[clamp(2.25rem,6vh,3.5rem)] w-full gap-[2px] overflow-hidden rounded-[6px]">
        {order.map((k, i) => (
          <motion.div
            key={k}
            style={{ background: SENT_FILL[k] }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(counts[k], total)}%` }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.12 }}
            title={`${SENT_TEXT[k]}: ${fmt(counts[k])}`}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {SENT_ORDER.map((k) => (
          <div key={k}>
            <p className={`figure-num text-[clamp(1.9rem,min(1.5rem+1.8vw,6.5vh),3.4rem)] ${k === 'negativo' ? 'text-accent' : 'text-navy-900'}`}>{fmtPct(pct(counts[k], total), pct(counts[k], total) > 0 && pct(counts[k], total) < 1 ? 1 : 0)}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-ink-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: SENT_FILL[k] }} aria-hidden />
              {SENT_TEXT[k]}, {fmt(counts[k])}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TARGET_ORDER: Target[] = ['ciudad', 'alcaldia', 'otro_actor', 'ciro', 'sin_objetivo'];

function Targets({ s }: { s: Story }) {
  const t = s.sentiment.negTargets;
  const max = Math.max(1, ...Object.values(t));
  return (
    <div>
      <p className="mb-3 text-[14px] font-semibold text-navy-900">¿Hacia quién va la crítica?</p>
      <ul className="flex flex-col gap-2">
        {TARGET_ORDER.map((k, i) => (
          <li key={k} className="grid grid-cols-[minmax(150px,190px)_1fr_auto] items-center gap-3" title={`${TARGET_LABEL[k]}: ${fmt(t[k])} publicaciones negativas`}>
            <span className={`text-[14px] ${k === 'ciro' ? 'font-semibold text-accent' : 'text-ink'}`}>{TARGET_LABEL[k]}</span>
            <div className="relative h-[14px]">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(t[k] / max) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.35 + i * 0.06 }}
              />
            </div>
            <span className="figure-num w-[2.4em] text-right text-[18px] text-navy-900">{fmt(t[k])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tono({ s }: { s: Story }) {
  const st = s.sentiment;
  const neutralTenths = Math.round(pct(st.counts.neutral, st.total) / 10);
  return (
    <Slide
      headline={
        <>
          {cap(WORDS[neutralTenths] ?? fmt(neutralTenths))} de cada diez publicaciones informan sin tomar partido; la crítica apunta a la ciudad y a la Alcaldía,{' '}
          {st.negToCiro === 0 ? 'ninguna a Ciro' : `y ${fmt(st.negToCiro)} a Ciro`}
        </>
      }
      lead={`Las ${fmt(st.total)} publicaciones, leídas una por una: se tuvieron en cuenta negaciones, ironía y a quién se dirige cada crítica.`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-[clamp(1rem,3vh,1.75rem)]">
        <Reveal>
          <SentimentBar counts={st.counts} total={st.total} />
        </Reveal>
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
          <Reveal>
            <Targets s={s} />
          </Reveal>
          <div className="flex flex-col gap-5">
            <Reveal>
              <p className="figure-num text-[clamp(2.2rem,min(1.6rem+2.2vw,7vh),3.8rem)] text-accent">
                {fmt(st.citizens.negative)} de {fmt(st.citizens.total)}
              </p>
              <p className="mt-1 max-w-[40ch] text-[14px] leading-snug text-ink-muted">
                voces ciudadanas son negativas; {fmt(st.citizens.toAlcaldia)} se dirigen a la Alcaldía o a quien la dirige.
              </p>
            </Reveal>
            <Takeaway>
              Los medios informan; las personas reclaman. Los {fmt(st.counts.positivo)} mensajes positivos vienen sobre todo de medios e instituciones (
              {fmt(st.positiveFrom.medio + st.positiveFrom.institucional)}) y de las cuentas de Ciro ({fmt(st.positiveFrom.ciro)}). {fmt(st.counts.no_determinable)}{' '}
              {st.counts.no_determinable === 1 ? 'comentario irónico queda' : 'comentarios ambiguos quedan'} como no determinable.
            </Takeaway>
          </div>
        </div>
      </div>
    </Slide>
  );
}

function Cards({ group, lead }: { group: Story['evidence']['ciudad']; lead: string }) {
  const [open, setOpen] = useState<Evidence | null>(null);
  const cols = group.list.length > 4 ? 'md:grid-cols-2 xl:grid-cols-3' : 'md:grid-cols-3';
  return (
    <Slide headline={group.headline} lead={`${lead} ${group.nota}`}>
      <motion.div variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }} initial="hidden" animate="show" className={`grid gap-4 ${cols}`}>
        {group.list.map((e) => (
          <EvidenceCard key={e.id} e={e} onOpen={() => setOpen(e)} clamp={group.list.length > 3} />
        ))}
      </motion.div>
      <Reveal className="mt-3">
        <p className="text-[12.5px] text-ink-muted">Textos reales sin editar; se eligieron por representar un tema o una posición, no por ser los más extremos.</p>
      </Reveal>
      <EvidenceDialog e={open} onClose={() => setOpen(null)} />
    </Slide>
  );
}

export default function Voces({ s, step }: { s: Story; step: number }) {
  if (step === 1)
    return <Cards group={s.evidence.ciudad} lead={`Quejas sobre la ciudad tomadas de comentarios y cuentas personales. Son ${fmt(s.sentiment.citizens.total)} de ${fmt(s.analyzed)} publicaciones: pocas, pero concretas.`} />;
  if (step === 2) return <Cards group={s.evidence.ciro} lead={`${fmt(s.ciro.own)} publicaciones propias y ${fmt(s.ciro.third)} ${s.ciro.third === 1 ? 'mención' : 'menciones'} de terceros: lo que se dice de Ciro Fernández sale casi siempre de sus cuentas.`} />;
  return <Tono s={s} />;
}
