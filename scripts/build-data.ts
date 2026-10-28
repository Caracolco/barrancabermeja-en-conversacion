/**
 * Regenera los datos del informe desde la exportación de Sentione y la revisión registro a registro:
 *   data/fuente/*.xlsx + data/revision/revision.json → src/data/registros.json, src/data/resumen.json,
 *   public/data/auditoria.csv
 * Uso: npm run data
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { build, toCsv } from '../src/lib/pipeline';
import { readEvidenceIds, readReview, readSource, ROOT, SOURCE_XLSX } from './source';

const src = readSource();
const out = build({ ...src, review: readReview(), archivo: SOURCE_XLSX.split('/').pop()!, evidenceIds: readEvidenceIds() });

const failed = out.resumen.validacion.filter((c) => !c.ok);
for (const c of out.resumen.validacion) console.log(`${c.ok ? '✓' : '✗'} ${c.label}: ${c.actual} (esperado ${c.expected})`);
if (failed.length) {
  console.error('La exportación no coincide con las cifras declaradas.');
  process.exit(1);
}

mkdirSync(`${ROOT}public/data`, { recursive: true });
writeFileSync(`${ROOT}src/data/registros.json`, JSON.stringify(out.registros, null, 1) + '\n');
writeFileSync(`${ROOT}src/data/resumen.json`, JSON.stringify(out.resumen, null, 2) + '\n');
writeFileSync(`${ROOT}public/data/auditoria.csv`, toCsv(out.auditoria));

const r = out.resumen;
console.log(`\nRevisados ${r.revision.revisados} · incluidos ${r.revision.incluidos} · réplicas ${r.revision.replicas} · en el informe ${r.final}`);
console.log(`Ciro: ${r.ciro.propiasContadas} propias contadas, ${r.ciro.mencionesTerceros} menciones de terceros, ${r.ciro.propiasSinTexto.length} propias sin texto`);
