/**
 * Regenera los datos del informe desde las fuentes y las revisiones:
 *   Sentione: data/fuente/Ciro_Fernandez_escucha_depurada.xlsx + data/revision/revision.json
 *   Web:      data/fuente/Ciro_Fernandez_escucha_ampliada_fuentes_publicas.xlsx + data/revision/revision-web.json
 * → src/data/registros.json, src/data/resumen.json, src/data/figuras.json,
 *   public/data/auditoria.csv, public/data/auditoria-web.csv
 * Uso: npm run data
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { assemble } from './assemble';
import { ROOT } from './source';

const out = assemble();
const checks = [...out.resumen.validacion, ...out.resumen.web.validacion];
for (const c of checks) console.log(`${c.ok ? '✓' : '✗'} ${c.label}: ${c.actual} (esperado ${c.expected})`);
if (checks.some((c) => !c.ok)) {
  console.error('Las fuentes no coinciden con las cifras declaradas.');
  process.exit(1);
}

mkdirSync(`${ROOT}public/data`, { recursive: true });
writeFileSync(`${ROOT}src/data/registros.json`, JSON.stringify(out.registros, null, 1) + '\n');
writeFileSync(`${ROOT}src/data/resumen.json`, JSON.stringify(out.resumen, null, 2) + '\n');
writeFileSync(`${ROOT}src/data/figuras.json`, JSON.stringify(out.figuras, null, 2) + '\n');
writeFileSync(`${ROOT}public/data/auditoria.csv`, out.auditoriaCsv);
writeFileSync(`${ROOT}public/data/auditoria-web.csv`, out.auditoriaWebCsv);

const r = out.resumen;
console.log(`\nSentione: revisados ${r.revision.revisados} · incluidos ${r.revision.incluidos} · réplicas ${r.revision.replicas} · en el informe ${r.final}`);
console.log(`Web: ${r.web.filas} notas · incluidas ${r.web.incluidos} · excluidas ${r.web.excluidos}`);
console.log(`Ciro: ${r.ciro.propiasContadas} propias, ${r.ciro.mencionesTerceros} menciones de terceros, ${r.ciro.propiasSinTexto.length} propias sin texto`);
for (const f of out.figuras) console.log(`  ${f.nombre}: escucha ${f.sentione} (funcionario ${f.comoFuncionario}) · web ${f.web}${f.nota ? ` · ${f.nota}` : ''}`);
