import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtDate, fmtPct } from '../../lib/format';
import { pct, type Story } from '../story';
import { Legend, monthLong } from '../chart';
import { Dialog, EASE, LinkButton, PlatformIcon, Reveal, SENT_FILL, Slide, SourceLink, Stat, Takeaway } from '../ui';

function SplitBar({ own, third }: { own: number; third: number }) {
  const total = own + third || 1;
  return (
    <div>
      <div className="flex h-11 w-full gap-[2px] overflow-hidden rounded-[6px]">
        <motion.div
          className="flex items-center bg-navy-900 pl-3 text-[15px] font-semibold text-white"
          initial={{ width: 0 }}
          animate={{ width: `${pct(own, total)}%` }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
        >
          {fmt(own)}
        </motion.div>
        <motion.div
          className="flex min-w-[2.2rem] items-center justify-center bg-accent text-[15px] font-semibold text-white"
          initial={{ width: 0 }}
          animate={{ width: `${pct(third, total)}%` }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}
        >
          {fmt(third)}
        </motion.div>
      </div>
      <div className="mt-2 flex justify-between gap-4 text-[13px] text-ink-muted">
        <span>Publicaciones propias ({fmtPct(pct(own, total))})</span>
        <span>Menciones de terceros ({fmtPct(pct(third, total))})</span>
      </div>
    </div>
  );
}

function Monthly({ data }: { data: Story['ciro']['monthly'] }) {
  const max = Math.max(1, ...data.map((d) => d.propia + d.terceros));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold text-navy-900">Registros directos por mes</p>
        <Legend
          items={[
            { label: 'Propios', color: '#0B1F3A' },
            { label: 'De terceros', color: '#C8102E' },
          ]}
        />
      </div>
      <div className="flex h-[clamp(64px,11vh,120px)] items-end gap-[6px] border-b border-line md:gap-2">
        {data.map((d, i) => {
          const total = d.propia + d.terceros;
          return (
            <div key={d.month} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${monthLong(d.month)}: ${d.propia} propios, ${d.terceros} de terceros`}>
              <span className="mb-1 text-center text-[12px] font-semibold text-navy-900">{total || ''}</span>
              <motion.div
                className="flex flex-col justify-end gap-[2px] overflow-hidden"
                initial={{ height: 0 }}
                animate={{ height: `${(total / max) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.05 }}
              >
                {d.terceros > 0 && <div className="rounded-t-[4px] bg-accent" style={{ flex: d.terceros }} />}
                {d.propia > 0 && <div className={`bg-navy-900 ${d.terceros ? '' : 'rounded-t-[4px]'}`} style={{ flex: d.propia }} />}
              </motion.div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[6px] md:gap-2">
        {data.map((d) => (
          <span key={d.month} className="min-w-0 flex-1 text-center text-[11px] text-ink-faint">
            {monthLong(d.month).slice(0, 3)}
          </span>
        ))}
      </div>
    </div>
  );
}

const listJoin = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : (xs[0] ?? ''));

export default function Ciro({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  const c = s.ciro;
  const topics = c.topics.slice(0, 4);
  const m = c.mention;

  return (
    <Slide
      headline={
        <>
          Ciro Fernández se escucha en su propia voz: {fmt(c.own)} de sus {fmt(c.direct)} registros los publicó él
        </>
      }
      lead="Solo cuentan las publicaciones de sus cuentas y los textos que lo nombran. La conversación general sobre la ciudad no se le atribuye."
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(230px,0.8fr)_2fr] lg:gap-12">
        <div className="grid grid-cols-3 content-start gap-x-5 gap-y-[clamp(0.75rem,2.5vh,1.5rem)] lg:grid-cols-1">
          <Reveal>
            <Stat size="xl" tone="red" value={c.direct} label={`registros directos de ${fmt(s.analyzed)} pertinentes`} />
          </Reveal>
          <Reveal>
            <Stat size="md" value={c.share} format={(n) => fmtPct(n, 1)} label={`de la conversación; ${fmt(c.otherRecords)} registros no lo mencionan`} />
          </Reveal>
          <Reveal>
            <Stat size="md" value={c.ownWithoutText} label="publicaciones suyas en X, excluidas sin texto en la depuración preliminar" />
          </Reveal>
        </div>

        <div className="flex min-w-0 flex-col gap-[clamp(0.9rem,2.6vh,1.5rem)]">
          <Reveal>
            <SplitBar own={c.own} third={c.third} />
          </Reveal>
          <Reveal>
            <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
              <Monthly data={c.monthly} />
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[13px] font-semibold text-navy-900">De qué habla en sus publicaciones</p>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink">
                    {topics.map((t, i) => (
                      <span key={t.id}>
                        {t.label} <b className="text-navy-900">{t.n}</b>
                        {i < topics.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-navy-900">Tono de sus mensajes</p>
                  <p className="mt-1.5 flex flex-wrap gap-x-4 text-[14.5px] text-ink">
                    {(['negativo', 'neutral', 'positivo'] as const).map((k) => (
                      <span key={k} className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: SENT_FILL[k] }} aria-hidden />
                        <b className="text-navy-900">{c.tone[k]}</b> {k === 'positivo' ? 'positivos' : k === 'neutral' ? 'neutrales' : 'críticos'}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">La crítica apunta a problemas de la ciudad; describe su mensaje, no cómo lo percibe la ciudadanía.</p>
                </div>
              </div>
            </div>
          </Reveal>
          {m && (
            <Reveal>
              <figure className="rounded-2xl border border-line bg-white px-4 py-3 md:px-5" data-evidence={m.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-muted">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-accent">
                    <PlatformIcon p={m.plataforma} size={14} /> La única mención de un tercero
                  </span>
                  <span>
                    {m.autor} · {m.plataforma}, {fmtDate(m.fecha)}
                  </span>
                </div>
                <blockquote className="mt-1.5 text-[clamp(14px,0.8rem+0.25vw,15.5px)] leading-relaxed text-ink">
                  «{m.cutStart ? '…' : ''}
                  {m.fragmento}
                  {m.cutEnd ? '…' : ''}»
                </blockquote>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="text-[12.5px] text-ink-muted">Lo ubica como posible precandidato a la Alcaldía de Barrancabermeja.</p>
                  <SourceLink href={m.url} />
                </div>
              </figure>
            </Reveal>
          )}
          <Takeaway action={<LinkButton onClick={() => setOpen(true)}>Qué no alcanza a medir esta muestra</LinkButton>}>
            Publica desde el {fmtDate(c.firstOwn)} sobre {listJoin(topics.map((t) => t.label.toLowerCase()))}. Con {fmt(c.third)}{' '}
            {c.third === 1 ? 'mención' : 'menciones'} de terceros no hay base para medir cómo lo percibe la ciudadanía.
          </Takeaway>
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Qué no alcanza a medir esta muestra">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Cuentas propias identificadas: {s.resumen.ciro.cuentas.join(' y ')}. Sus publicaciones no lo nombran en el texto; por eso la depuración preliminar las marcó como «no
            menciona a Ciro». Aquí cuentan como publicaciones propias.
          </li>
          <li>
            {fmt(c.ownWithoutText)} publicaciones de @CiroFernandezN se excluyeron en la depuración preliminar y su texto no está en los archivos entregados. Si son pertinentes,
            su voz propia sería mayor.
          </li>
          <li>
            De los {fmt(s.resumen.ciro.mencionesAuditoria.length)} registros marcados con «Ciro en el contenido», {fmt(c.homonyms)} son homónimos de otros países, {fmt(c.historic)} es una
            nota antigua sobre su paso por el Congreso, {fmt(c.unverifiable)} de Facebook no traen texto para verificarlos y {fmt(c.third)} es la mención incluida.
          </li>
          <li>Se capturaron sus publicaciones, pero no los comentarios que reciben: la respuesta de la ciudadanía a sus mensajes queda fuera de la muestra.</li>
        </ul>
        <p className="text-ink-muted">Recuperar el texto de esas publicaciones y capturar los comentarios de sus cuentas permitiría medir su conversación con más certeza.</p>
      </Dialog>
    </Slide>
  );
}
