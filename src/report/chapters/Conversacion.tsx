import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtDay, fmtPct } from '../../lib/format';
import { VOICE_LABEL } from '../../lib/config';
import type { Platform } from '../../lib/types';
import { pct, type Story } from '../story';
import { Legend, monthLong, niceTicks, useWidth } from '../chart';
import { Dialog, EASE, LinkButton, PlatformIcon, Reveal, Slide, Stat, Takeaway } from '../ui';

const PAD = { l: 40, r: 12, t: 16, b: 28 };

function WeeklyChart({ s }: { s: Story }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  // Alto según la ventana, para que el capítulo quepa sin desplazarse.
  const H = Math.round(Math.min(320, Math.max(180, (typeof window === 'undefined' ? 800 : window.innerHeight) * 0.32)));
  const data = s.conversation.weekly;
  const max = Math.max(...data.map((d) => d.total));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const w = Math.max(0, width - PAD.l - PAD.r);
  const h = H - PAD.t - PAD.b;
  const x = (i: number) => PAD.l + (data.length > 1 ? (i / (data.length - 1)) * w : 0);
  const y = (v: number) => PAD.t + h - (v / top) * h;
  const line = (k: 'total' | 'ciro') => data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d[k])}`).join('');
  const area = `${line('total')}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const peakIdx = data.findIndex((d) => d.week === s.conversation.peak.week);
  // Una etiqueta por mes, omitiendo la primera si queda pegada a la siguiente.
  const monthTicks = data
    .map((d, i) => ({ i, m: d.week.slice(0, 7) }))
    .filter((t, k, arr) => k === 0 || t.m !== arr[k - 1].m)
    .filter((t, k, arr) => !arr[k + 1] || x(arr[k + 1].i) - x(t.i) > 30);
  const hv = hover !== null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full">
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`Registros por semana. Pico en la semana del ${fmtDay(s.conversation.peak.week)} con ${fmt(s.conversation.peak.total)}.`}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left - PAD.l) / w) * (data.length - 1));
            setHover(i >= 0 && i < data.length ? i : null);
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="#E9EDF3" />
              <text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" className="fill-ink-faint text-[11px]">
                {fmt(t)}
              </text>
            </g>
          ))}
          {monthTicks.map((t) => (
            <text key={t.m} x={x(t.i)} y={H - 8} textAnchor="start" className="fill-ink-faint text-[11px]">
              {monthLong(t.m).slice(0, 3)}
            </text>
          ))}
          <motion.path d={area} fill="#E6ECF5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path d={line('total')} fill="none" stroke="#13315C" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.2 }} />
          <motion.path d={line('ciro')} fill="none" stroke="#C8102E" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE, delay: 0.4 }} />
          {peakIdx >= 0 && (
            <g>
              <line x1={x(peakIdx)} x2={x(peakIdx)} y1={y(data[peakIdx].total)} y2={y(0)} stroke="#0B1F3A" strokeDasharray="3 3" />
              <circle cx={x(peakIdx)} cy={y(data[peakIdx].total)} r={4.5} fill="#0B1F3A" stroke="#fff" strokeWidth={2} />
            </g>
          )}
          {hv && hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={y(0)} stroke="#5B6678" strokeWidth={1} />
              <circle cx={x(hover)} cy={y(hv.total)} r={4} fill="#13315C" stroke="#fff" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(hv.ciro)} r={4} fill="#C8102E" stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
      )}
      {hv && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] shadow-lg"
          style={{ left: Math.min(Math.max(x(hover) - 80, 0), width - 170) }}
        >
          <p className="font-semibold text-navy-900">Semana del {fmtDay(hv.week)}</p>
          <p className="text-ink-muted">
            <b className="text-ink">{fmt(hv.total)}</b> registros, <b className="text-ink">{fmt(hv.ciro)}</b> de Ciro
          </p>
        </div>
      )}
    </div>
  );
}

const PLATFORM_FILL: Record<Platform, string> = { 'Sitios web': '#0B1F3A', X: '#2F5B94', Facebook: '#9DB3D1', Instagram: '#C3D0E3', YouTube: '#E3E8EF' };

function Platforms({ s }: { s: Story }) {
  const list = s.conversation.platforms;
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold text-navy-900">Plataformas</p>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {list.map((p, i) => (
          <motion.div
            key={p.p}
            style={{ background: PLATFORM_FILL[p.p] }}
            initial={{ width: 0 }}
            animate={{ width: `${pct(p.n, s.analyzed)}%` }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.3 + i * 0.08 }}
            title={`${p.p}: ${fmt(p.n)}`}
          />
        ))}
      </div>
      <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] text-ink-muted">
        {list.map((p) => (
          <li key={p.p} className="inline-flex items-center gap-1.5">
            <span className="text-navy-700">
              <PlatformIcon p={p.p} size={13} />
            </span>
            {p.p} <b className="text-navy-900">{fmt(p.n)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Conversacion({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  const c = s.conversation;
  const r = s.resumen;
  const [m1, , m3] = c.recent.months;
  const medios = pct(c.voices.medio, s.analyzed);

  return (
    <Slide
      headline={
        <>
          El {fmtPct(c.recent.share)} de la conversación llegó entre {monthLong(m1)} y {monthLong(m3 ?? m1)}
        </>
      }
      lead={`De ${fmt(s.rawRows)} registros capturados, ${fmt(s.analyzed)} hablan de verdad de Barrancabermeja, sus problemas o su política. Es una conversación de medios: ${fmtPct(medios)} la producen portales y noticieros.`}
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[minmax(230px,0.8fr)_2.2fr] lg:gap-12">
        <div className="grid grid-cols-2 content-start gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-1">
          <Reveal>
            <Stat value={s.analyzed} label={`registros pertinentes, de ${fmt(s.rawRows)} capturados por Sentione`} />
          </Reveal>
          <Reveal>
            <Stat size="md" tone="red" value={c.voices.ciudadano} label={`son de personas; ${fmt(c.voices.medio)} de medios y ${fmt(c.voices.ciro)} de las cuentas de Ciro`} />
          </Reveal>
          <Reveal className="col-span-2 sm:col-span-1">
            <Platforms s={s} />
          </Reveal>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Reveal className="min-w-0">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[14px] font-semibold text-navy-900">Registros pertinentes por semana</p>
              <Legend
                items={[
                  { label: 'Todos los registros', color: '#13315C', kind: 'line' },
                  { label: 'Ciro Fernández', color: '#C8102E', kind: 'line' },
                ]}
              />
            </div>
            <WeeklyChart s={s} />
          </Reveal>
          <Takeaway action={<LinkButton onClick={() => setOpen(true)}>Cómo se depuró la base</LinkButton>}>
            La semana más intensa fue la del {fmtDay(c.peak.week)}, con {fmt(c.peak.total)} registros; {fmt(c.peak.topicCount)} trataban de{' '}
            {c.peak.topic.toLowerCase()}. El volumen crece desde agosto, cuando la ciudad suma crisis de seguridad, sequía y obras cuestionadas, y cuando
            aparecen las publicaciones de Ciro Fernández.
          </Takeaway>
        </div>
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cómo se depuró la base">
        <p>
          Sentione capturó {fmt(s.rawRows)} registros. La depuración preliminar marcó {fmt(r.preliminar.incluir)} como pertinentes, {fmt(r.preliminar.revisar)} pendientes,{' '}
          {fmt(r.preliminar.excluir)} excluidos y {fmt(r.preliminar.duplicado)} filas que repetían {fmt(r.preliminar.idsDuplicados)} identificadores. Las cuatro cifras se
          verificaron contra la auditoría del archivo.
        </p>
        <p>
          Se leyeron los {fmt(r.revision.revisados)} registros con texto: {fmt(r.revision.deIncluirAExcluir)} de los preliminarmente incluidos salieron (anuncios de
          rutina, temas de otras ciudades, notas de años anteriores) y {fmt(r.revision.deRevisarAIncluir)} pendientes entraron por tratar problemáticas de la ciudad.
          Otras {fmt(r.revision.replicas)} eran réplicas de la misma cuenta. Quedan <b>{fmt(s.analyzed)}</b>.
        </p>
        <p className="rounded-lg bg-navy-50 p-3 text-[14px] text-ink-muted">
          Los {fmt(r.excluidosSinTexto.total)} excluidos preliminarmente no traen texto en los archivos entregados ({fmt(r.excluidosSinTexto.comentariosFacebook)} son
          comentarios de Facebook): no se pudieron volver a leer. Todas las decisiones están en la auditoría descargable.
        </p>
        <p className="text-[13.5px] text-ink-muted">Voces: {Object.entries(c.voices).map(([k, v]) => `${VOICE_LABEL[k as keyof typeof VOICE_LABEL]} ${fmt(v)}`).join(' · ')}.</p>
      </Dialog>
    </Slide>
  );
}
