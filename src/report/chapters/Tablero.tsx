import { useState } from 'react';
import { motion } from 'motion/react';
import { fmt, fmtDate } from '../../lib/format';
import type { Figura } from '../../lib/types';
import type { Story } from '../story';
import { Dialog, EASE, LinkButton, PlatformIcon, Reveal, Slide, SourceLink, Takeaway } from '../ui';

const WORDS = ['ningún', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Qué se sabe de cada nombre, en una línea; la situación completa queda en la ventana de detalle. */
function status(f: Figura): string {
  if (f.id === 'ciro') return 'Posible precandidato según un tercero en X';
  if (f.sentione && f.comoFuncionario / f.sentione >= 0.8) return 'Posible aspiración según un medio; en la escucha aparece como funcionario';
  if (/Concejo/i.test(f.referencia) && /Alcald/i.test(f.referencia)) return 'Posible aspiración según un medio; cargo por definir';
  return 'Posible aspiración según un medio';
}

function Count({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const w = max ? Math.max((value / max) * 100, value ? 1.5 : 0) : 0;
  return (
    <div className="flex min-w-0 items-center gap-2.5" title={label}>
      <div className="relative h-[14px] min-w-0 flex-1">
        <motion.div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.3 }} />
      </div>
      <span className="figure-num w-[2.2em] shrink-0 text-right text-[19px] text-navy-900">{fmt(value)}</span>
    </div>
  );
}

function Row({ f, max, i, onOpen }: { f: Figura; max: number; i: number; onOpen: () => void }) {
  const focus = f.id === 'ciro';
  const escucha = focus ? (f.propias ?? 0) + f.sentione : f.sentione;
  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.15 + i * 0.06 }}
      className={`grid grid-cols-[minmax(150px,1.1fr)_1fr_minmax(64px,0.45fr)] items-center gap-x-4 rounded-lg px-2 py-[clamp(0.3rem,1vh,0.55rem)] md:gap-x-8 md:px-3 ${focus ? 'bg-accent-soft' : ''}`}
    >
      <div className="min-w-0">
        <button type="button" onClick={onOpen} className={`text-left text-[15px] font-semibold leading-tight hover:underline ${focus ? 'text-accent' : 'text-navy-900'}`}>
          {f.nombre}
        </button>
        <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{status(f)}</p>
      </div>
      <Count
        value={escucha}
        max={max}
        color={focus ? '#C8102E' : f.comoFuncionario ? '#9DB3D1' : '#0B1F3A'}
        label={focus ? `${f.propias} publicaciones propias y ${f.sentione} mención de un tercero` : `${f.sentione} registros; ${f.comoFuncionario} lo citan como funcionario`}
      />
      <span className="figure-num text-right text-[19px] text-navy-900" title={`${f.web} notas de investigación web`}>
        {fmt(f.web)}
      </span>
    </motion.li>
  );
}

export default function Tablero({ s }: { s: Story }) {
  const [open, setOpen] = useState<Figura | null>(null);
  const fig = s.figures;
  const max = Math.max(1, ...fig.alcaldia.map((f) => (f.propias ?? 0) + f.sentione));
  const t = s.web.tablero;
  const oviedo = fig.otros.find((f) => f.id === 'oviedo');
  const n = fig.alcaldia.length;

  return (
    <Slide
      headline={
        <>
          {cap(WORDS[n] ?? fmt(n))} nombres suenan para la Alcaldía 2027; ninguna candidatura está confirmada
        </>
      }
      lead="Posibles aspiraciones reportadas por terceros o por medios, no candidaturas inscritas ni anuncios propios. La escucha casi no habla de ellos como aspirantes."
    >
      <div className="grid min-h-0 flex-1 gap-8 lg:grid-cols-[1.8fr_minmax(250px,1fr)] lg:gap-12">
        <div className="flex min-w-0 flex-col gap-3">
          <Reveal>
            <div className="grid grid-cols-[minmax(150px,1.1fr)_1fr_minmax(64px,0.45fr)] gap-x-4 px-2 text-[12.5px] font-semibold text-navy-900 md:gap-x-8 md:px-3">
              <span>Posible aspirante a la Alcaldía</span>
              <span>Registros de la escucha (Sentione)</span>
              <span className="text-right">Notas web</span>
            </div>
          </Reveal>
          <ul className="flex flex-col gap-0.5">
            {fig.alcaldia.map((f, i) => (
              <Row key={f.id} f={f} max={max} i={i} onOpen={() => setOpen(f)} />
            ))}
          </ul>
          <Reveal>
            <p className="px-2 text-[12.5px] leading-snug text-ink-muted md:px-3">
              En azul claro, registros que nombran a la persona como funcionaria de la Alcaldía. Para Ciro, en rojo, sus publicaciones propias y la mención de un tercero.
            </p>
          </Reveal>
        </div>
        <div className="flex flex-col gap-5">
          {t && (
            <Reveal>
              <figure className="rounded-2xl border border-line bg-white px-4 py-3 md:px-5" data-evidence={t.id}>
                <p className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-sky">
                  <PlatformIcon p={t.plataforma} size={14} /> Investigación web · titular original
                </p>
                <blockquote className="mt-1.5 text-[15px] leading-snug text-ink">«{t.extracto}»</blockquote>
                <p className="mt-1.5 text-[12.5px] text-ink-muted">
                  {t.autor}, {fmtDate(t.fecha)}. La única fuente que nombra a {fig.soloWeb.map((f) => f.nombre).join(', ')}.
                </p>
                <div className="mt-1.5">
                  <SourceLink href={t.url} />
                </div>
              </figure>
            </Reveal>
          )}
          <Reveal>
            <p className="text-[13px] font-semibold text-navy-900">Para el Concejo, sin confirmar</p>
            <p className="mt-1 text-[14px] leading-snug text-ink">{fig.concejo.map((f) => f.nombre).join(', ')}.</p>
            {oviedo && (
              <p className="mt-3 rounded-lg bg-navy-50 p-3 text-[13px] leading-snug text-ink">
                <b>{oviedo.nombre}</b> no es aspirante en Barrancabermeja: su eventual aspiración es a la Alcaldía de Bucaramanga. Aparece junto a Ciro solo en la publicación de
                Santander Se Conecta.
              </p>
            )}
          </Reveal>
          <Takeaway action={<LinkButton onClick={() => setOpen(fig.alcaldia[0])}>Qué se verificó de cada nombre</LinkButton>}>
            {fig.funcionarios.map((f) => f.nombre).join(' y ')} es visible en la escucha, pero como funcionario de la Alcaldía. Los demás solo aparecen en una nota del{' '}
            {t ? fmtDate(t.fecha) : 'último mes'}. El tablero electoral todavía no es tema de la conversación digital.
          </Takeaway>
        </div>
      </div>
      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.nombre ?? ''}>
        {open && (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
              <dt className="text-ink-muted">Referencia</dt>
              <dd>
                {open.referencia} · {open.ambito}
              </dd>
              <dt className="text-ink-muted">Situación</dt>
              <dd>{open.id === 'ciro' ? open.nota : open.situacion}</dd>
              <dt className="text-ink-muted">Escucha</dt>
              <dd>
                {open.id === 'ciro'
                  ? `${open.propias} publicaciones propias y ${open.sentione} mención de un tercero.`
                  : `${fmt(open.sentione)} registros lo nombran${open.comoFuncionario ? `; ${fmt(open.comoFuncionario)} con su cargo en la administración` : ''}.`}
              </dd>
              <dt className="text-ink-muted">Notas web</dt>
              <dd>{fmt(open.web)}</dd>
              <dt className="text-ink-muted">Tratamiento</dt>
              <dd>{open.tratamiento}</dd>
            </dl>
            {open.id !== 'ciro' && open.nota && <p className="text-ink-muted">{open.nota}</p>}
            {/^https?:\/\//.test(open.url) && !/twstalker/.test(open.url) && <SourceLink href={open.url} />}
            <div className="border-t border-line pt-3 text-[13.5px] text-ink-muted">
              {fig.alcaldia
                .filter((f) => f.id !== open.id)
                .map((f) => (
                  <button key={f.id} type="button" onClick={() => setOpen(f)} className="mr-3 font-semibold text-navy-700 hover:text-accent">
                    {f.nombre}
                  </button>
                ))}
            </div>
          </>
        )}
      </Dialog>
    </Slide>
  );
}
