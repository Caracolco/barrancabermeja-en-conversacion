import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Download, X } from 'lucide-react';
import { fmt, fmtPct } from '../../lib/format';
import { pct, type Story } from '../story';
import { AUDIT_URL, Dialog, EASE, LinkButton, Reveal, Slide } from '../ui';

const MOTIVO: Record<string, string> = {
  rutina: 'anuncios institucionales de rutina',
  fuera: 'temas de otras ciudades o menciones tangenciales',
  sinrel: 'comentarios sin relación',
  historica: 'notas de años anteriores',
};

export default function Conclusiones({ s }: { s: Story }) {
  const [open, setOpen] = useState(false);
  const r = s.resumen;
  return (
    <Slide
      headline={
        s.ciro.third <= 2
          ? 'Ciro Fernández habla de la ciudad; la ciudad, en la muestra, todavía no habla de él'
          : 'Cinco hallazgos sobre la conversación de Barrancabermeja y la presencia de Ciro Fernández'
      }
    >
      <ol className="grid gap-x-10 border-t border-line md:grid-cols-2" aria-label="Conclusiones">
        {s.conclusions.map((c, i) => (
          <motion.li
            key={c.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.2 + i * 0.09 }}
            className={`border-b border-line py-[clamp(0.6rem,1.8vh,1rem)] ${i === 0 ? 'md:col-span-2' : ''}`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className={`figure-num text-[clamp(1.8rem,min(1.3rem+1.4vw,5vh),2.8rem)] ${i === 0 ? 'text-accent' : 'text-navy-900'}`}>{c.figure}</p>
              <p className="max-w-[48ch] text-[12.5px] leading-snug text-ink-muted">{c.figureLabel}</p>
            </div>
            <h3 className="mt-1.5 text-[15.5px] font-bold leading-snug text-navy-900">{c.title}</h3>
            <p className={`mt-0.5 text-[13.5px] leading-normal text-ink ${i === 0 ? 'max-w-[150ch]' : 'max-w-[84ch]'}`}>{c.text}</p>
          </motion.li>
        ))}
      </ol>
      <Reveal className="mt-4">
        <p className="max-w-[96ch] text-[12.5px] leading-relaxed text-ink-muted">
          Mide la conversación digital registrada por Sentione entre enero y octubre de 2026. No mide audiencias de prensa, radio o televisión, no representa a la
          población, no infiere intención de voto ni anticipa resultados electorales. <LinkButton onClick={() => setOpen(true)}>Cómo se verificaron las cifras</LinkButton>
        </p>
      </Reveal>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cómo se verificaron las cifras">
        <p>
          Antes de depurar se comprobó que la exportación coincide con las cifras declaradas en la depuración preliminar. Todas las verificaciones se repiten en las
          pruebas automáticas cada vez que se publica el sitio.
        </p>
        <ul className="space-y-1 rounded-lg bg-navy-50 p-3 text-[13.5px]">
          {r.validacion.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              {c.ok ? <Check size={15} className="mt-0.5 shrink-0 text-sky" aria-label="Coincide" /> : <X size={15} className="mt-0.5 shrink-0 text-accent" aria-label="No coincide" />}
              <span>
                {c.label}: <b>{fmt(c.actual)}</b>
              </span>
            </li>
          ))}
        </ul>
        <p>
          Se leyeron los {fmt(r.revision.revisados)} registros con texto. Salieron {fmt(r.revision.excluidos)}:{' '}
          {Object.entries(r.revision.porMotivo)
            .map(([k, v]) => `${fmt(v)} por ${MOTIVO[k] ?? k}`)
            .join(', ')}
          . Otras {fmt(r.revision.replicas)} eran réplicas de la misma cuenta en la misma plataforma. El informe analiza <b>{fmt(s.analyzed)}</b> registros.
        </p>
        <p>
          El sentimiento se clasificó de nuevo en cuatro categorías y con su destinatario. Sentione había dejado sin clasificar {fmt(r.sentione.sinClasificar)} registros; en los{' '}
          {fmt(r.sentione.comparables)} que sí clasificó, coincide con la revisión en el {fmtPct(pct(r.sentione.coincidencia, r.sentione.comparables))}. {fmt(r.revision.marcadosRevisar)}{' '}
          registros ambiguos quedan señalados para validación humana.
        </p>
        <a href={AUDIT_URL} download className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy-700 underline decoration-navy-300 underline-offset-4 hover:decoration-navy-700">
          <Download size={15} aria-hidden /> Descargar la auditoría de las {fmt(r.fuente.filas)} filas (CSV)
        </a>
      </Dialog>
    </Slide>
  );
}
