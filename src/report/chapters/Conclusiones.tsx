import { useState } from 'react';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import { fmt } from '../../lib/format';
import type { Story } from '../story';
import { AUDIT_URL, Dialog, EASE, LinkButton, Reveal, Slide } from '../ui';

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
          Mide la conversación pública digital en redes y medios entre enero y octubre de 2026. No mide audiencias de prensa, radio o televisión, no representa a la
          población, no infiere intención de voto ni anticipa resultados electorales. <LinkButton onClick={() => setOpen(true)}>Cómo se construyó la base</LinkButton>
        </p>
      </Reveal>
      <Dialog open={open} onClose={() => setOpen(false)} title="Cómo se construyó la base">
        <p>
          La base reúne {fmt(s.analyzed)} publicaciones de redes sociales y medios sobre Barrancabermeja, sus problemáticas y su política. Cada una se leyó completa y se
          clasificó por tema, sentimiento (positivo, negativo, neutral o no determinable) y destinatario: Ciro Fernández, otro actor político, la Alcaldía, una
          problemática de la ciudad o ninguno.
        </p>
        <p>
          Las cifras del informe se recalculan desde la base cada vez que se publica, y pruebas automáticas verifican que coincidan y que cada testimonio sea un
          fragmento literal con su enlace original. {fmt(r.revision.marcadosRevisar)} publicaciones ambiguas quedan señaladas para validación humana.
        </p>
        <a href={AUDIT_URL} download className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy-700 underline decoration-navy-300 underline-offset-4 hover:decoration-navy-700">
          <Download size={15} aria-hidden /> Descargar la auditoría de la base (CSV)
        </a>
      </Dialog>
    </Slide>
  );
}
