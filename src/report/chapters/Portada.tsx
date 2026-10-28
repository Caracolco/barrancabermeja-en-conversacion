import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { fmt, fmtDate } from '../../lib/format';
import type { Story } from '../story';
import { monthLong } from '../chart';
import { EASE, rise, stagger } from '../ui';

const COLS = 2;
const CELL = 10;
const GAP = 2;

/** Cada punto es un registro pertinente, apilado en su mes; los de Ciro Fernández van en rojo, arriba. */
function DotCalendar({ s }: { s: Story }) {
  const [hover, setHover] = useState<string | null>(null);
  const months = s.conversation.months;
  const layout = useMemo(() => {
    let col = 0;
    return months.map((m) => {
      const band = { ...m, x0: col };
      col += COLS + GAP;
      return band;
    });
  }, [months]);
  const rows = Math.max(...months.map((m) => Math.ceil(m.total / COLS)));
  const width = layout.length * (COLS + GAP) - GAP;
  const height = rows * CELL;
  const shown = layout.find((b) => b.month === hover);

  return (
    <figure className="w-full">
      <div className="relative">
        <svg
          viewBox={`-8 -8 ${width * CELL + 16} ${height + 32}`}
          className="block h-auto max-h-[52vh] w-full"
          role="img"
          aria-label={`${fmt(s.analyzed)} registros pertinentes entre ${monthLong(months[0].month)} y ${monthLong(months[months.length - 1].month)}; ${fmt(s.ciro.direct)} son de Ciro Fernández o lo mencionan.`}
        >
          {layout.map((b) =>
            Array.from({ length: b.total }, (_, i) => {
              // Los registros de Ciro ocupan los últimos puntos de la pila.
              const isCiro = i >= b.total - b.ciro;
              const c = b.x0 + (i % COLS);
              const r = rows - 1 - Math.floor(i / COLS);
              const delay = b.x0 * 0.012 + Math.floor(i / COLS) * 0.012;
              return (
                <circle
                  key={`${b.month}-${i}`}
                  className={isCiro ? 'dot-focus' : 'dot'}
                  style={{ animationDelay: isCiro ? `${delay}s, ${1.6 + (i % 5) * 0.04}s` : `${delay}s` }}
                  cx={c * CELL + CELL / 2}
                  cy={r * CELL + CELL / 2}
                  r={isCiro ? 3.7 : 3.3}
                  fill={isCiro ? '#C8102E' : '#0B1F3A'}
                  opacity={hover && hover !== b.month ? 0.18 : isCiro ? 1 : 0.86}
                />
              );
            }),
          )}
          {layout.map((b) => (
            <g key={b.month}>
              <text x={(b.x0 + COLS / 2) * CELL} y={height + 18} textAnchor="middle" className="fill-ink-faint text-[11px]">
                {monthLong(b.month).slice(0, 3)}
              </text>
              <rect
                x={b.x0 * CELL - CELL / 2}
                y={-2}
                width={(COLS + 1) * CELL}
                height={height + 26}
                fill="transparent"
                onPointerEnter={() => setHover(b.month)}
                onPointerLeave={() => setHover(null)}
              >
                <title>{`${monthLong(b.month)}: ${fmt(b.total)} registros, ${fmt(b.ciro)} de Ciro Fernández`}</title>
              </rect>
            </g>
          ))}
        </svg>
        {shown && (
          <div className="pointer-events-none absolute -top-9 left-0 rounded-md bg-navy-900 px-2.5 py-1 text-[12.5px] text-white shadow-lg">
            {monthLong(shown.month)}: <b>{fmt(shown.total)}</b> registros{shown.ciro ? `, ${fmt(shown.ciro)} de Ciro` : ''}
          </div>
        )}
      </div>
      <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[13.5px] leading-snug text-ink-muted">
        <span>Cada punto es un registro pertinente, en el mes en que se publicó: {fmt(s.analyzed)} en total.</span>
        <span className="font-semibold text-accent">Los rojos son de Ciro Fernández o lo mencionan: {fmt(s.ciro.direct)}.</span>
      </figcaption>
    </figure>
  );
}

export default function Portada({ s, onStart }: { s: Story; onStart: () => void }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto grid min-h-full w-full max-w-[1240px] content-center items-center gap-10 px-5 py-10 md:px-10 lg:grid-cols-[1fr_1.1fr] xl:gap-14 xl:px-14">
      <div>
        <motion.p variants={rise} className="kicker">
          Escucha social · {fmtDate(s.period.from)} – {fmtDate(s.period.to)}
        </motion.p>
        <motion.h1 variants={rise} className="display mt-4 text-[clamp(2.8rem,min(1rem+4.6vw,12vh),6rem)] font-medium leading-[0.95] text-navy-900">
          Barrancabermeja en Conversación
        </motion.h1>
        <motion.p variants={rise} className="mt-6 max-w-[46ch] text-[clamp(1.05rem,0.95rem+0.4vw,1.3rem)] leading-relaxed text-ink">
          Radiografía de la conversación pública digital sobre la ciudad, sus problemáticas y el contexto electoral.
        </motion.p>
        <motion.div variants={rise} className="mt-7 flex items-end gap-6 border-t border-line pt-5">
          <div>
            <p className="figure-num text-[clamp(2.4rem,min(1.8rem+2.6vw,8vh),4rem)] text-navy-900">{s.conversation.months.length}</p>
            <p className="mt-1 text-[13px] text-ink-muted">meses de escucha</p>
          </div>
          <div>
            <p className="figure-num text-[clamp(2.4rem,min(1.8rem+2.6vw,8vh),4rem)] text-navy-900">{fmt(s.rawRows)}</p>
            <p className="mt-1 text-[13px] text-ink-muted">registros capturados</p>
          </div>
          <div>
            <p className="figure-num text-[clamp(2.4rem,min(1.8rem+2.6vw,8vh),4rem)] text-accent">{fmt(s.analyzed)}</p>
            <p className="mt-1 text-[13px] text-ink-muted">pertinentes tras depurar</p>
          </div>
        </motion.div>
        <motion.button
          variants={rise}
          type="button"
          onClick={onStart}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-navy-900 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Comenzar el recorrido <ArrowRight size={17} aria-hidden />
        </motion.button>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 }} className="min-w-0">
        <DotCalendar s={s} />
      </motion.div>
    </motion.div>
  );
}
