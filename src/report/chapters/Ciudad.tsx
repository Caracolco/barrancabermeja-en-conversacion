import { motion } from 'motion/react';
import { fmt, fmtDate, fmtPct } from '../../lib/format';
import { TOPIC_SCOPE } from '../../lib/config';
import type { Story } from '../story';
import { Legend } from '../chart';
import { EASE, PlatformIcon, Reveal, Slide, SourceLink, Takeaway } from '../ui';

const SHOWN = 8;
const WORDS: Record<number, string> = { 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve' };

export default function Ciudad({ s }: { s: Story }) {
  const all = s.topics.rows;
  const rows = all.slice(0, SHOWN);
  const rest = all.slice(SHOWN);
  const restTotal = rest.reduce((a, t) => a + t.total, 0);
  const max = rows[0]?.total ?? 1;
  const [t1, t2, t3] = all;
  const [c1, c2] = s.topics.critical;
  const critical = new Set([c1?.id, c2?.id]);
  const examples = s.evidence.temas;

  return (
    <Slide
      headline={
        <>
          {t1.label} domina: {fmt(t1.total)} registros, casi uno de cada {WORDS[Math.round(s.analyzed / t1.total)] ?? fmt(Math.round(s.analyzed / t1.total))}. Le siguen {t2.label.toLowerCase()} y {t3.label.toLowerCase()}
        </>
      }
      lead="Temas según el volumen real registrado, no una lista predefinida. Cada registro se asigna a su tema principal tras leer el texto."
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[1.7fr_minmax(260px,1fr)] lg:gap-12">
        <div className="min-w-0">
          <Reveal className="mb-4">
            <Legend
              items={[
                { label: 'Registros sobre el tema', color: '#13315C' },
                { label: 'De ellos, negativos', color: '#C8102E' },
              ]}
            />
          </Reveal>
          <ul className="flex flex-col gap-[clamp(0.35rem,1.2vh,0.65rem)]">
            {rows.map((t, i) => {
              const hot = critical.has(t.id);
              return (
                <motion.li
                  key={t.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.05 }}
                  className="grid grid-cols-[minmax(132px,190px)_1fr_auto] items-center gap-x-4"
                  title={`${t.label}: ${fmt(t.total)} registros, ${fmt(t.negativo)} negativos. Incluye ${TOPIC_SCOPE[t.id]}.`}
                >
                  <span className={`truncate text-[15px] ${i < 3 ? 'font-bold text-navy-900' : hot ? 'font-semibold text-navy-900' : 'text-ink'}`}>{t.label}</span>
                  <div className="relative h-[20px] min-w-0">
                    <motion.div
                      className="absolute inset-y-0 left-0 flex gap-[2px] overflow-hidden rounded-r-[4px]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(t.total / max) * 100}%` }}
                      transition={{ duration: 0.9, ease: EASE, delay: 0.25 + i * 0.05 }}
                    >
                      <div className="h-full bg-navy-800" style={{ flex: t.total - t.negativo }} />
                      <div className="h-full bg-accent" style={{ flex: t.negativo }} />
                    </motion.div>
                  </div>
                  <span className="w-[7.5em] text-right text-[13px] text-ink-muted">
                    <b className="figure-num mr-1.5 text-[19px] text-navy-900">{fmt(t.total)}</b>
                    {fmtPct(t.negRate)} neg.
                  </span>
                </motion.li>
              );
            })}
          </ul>
          {rest.length > 0 && (
            <Reveal className="mt-3">
              <p className="text-[13px] text-ink-muted">
                Otros {rest.length} temas suman {fmt(restTotal)}: {rest.map((t) => `${t.label.toLowerCase()} (${fmt(t.total)})`).join(', ')}.
              </p>
            </Reveal>
          )}
        </div>
        <div className="flex flex-col justify-between gap-6">
          <Reveal>
            <p className="text-[13px] font-semibold text-navy-900">Así lo cuentan los medios</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {examples.map((e) => (
                <li key={e.id} className="py-2.5" data-evidence={e.id}>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-accent">{e.about}</p>
                  <p className="mt-0.5 text-[14.5px] leading-snug text-ink">«{e.fragmento}»</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-muted">
                    <span className="inline-flex items-center gap-1">
                      <PlatformIcon p={e.plataforma} size={12} /> {e.autor ?? e.plataforma}, {fmtDate(e.fecha)}
                    </span>
                    <SourceLink href={e.url} />
                  </p>
                </li>
              ))}
            </ul>
          </Reveal>
          <Takeaway>
            {(['seg', 'amb', 'hipo'] as const).every((id) => [t1.id, t2.id, t3.id].includes(id))
              ? 'La ciudad conversa sobre todo de violencia y de su entorno natural: ciénagas contaminadas, manatíes muertos e hipopótamos en los barrios.'
              : `${t1.label}, ${t2.label.toLowerCase()} y ${t3.label.toLowerCase()} concentran la conversación.`}
            {c1 && c2 && (
              <>
                {' '}
                Donde más se critica es en {c1.label.toLowerCase()} ({fmtPct(c1.negRate)} negativos) y {c2.label.toLowerCase()} ({fmtPct(c2.negRate)}).
              </>
            )}
          </Takeaway>
        </div>
      </div>
    </Slide>
  );
}
