/** Motor de depuración: reglas puras, sin depender de la base real. */
import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import {
  ciroRelation,
  cleanText,
  findReplicas,
  formatOf,
  isCiroAccount,
  mentionsCiro,
  normalize,
  platformOf,
  sentioneOf,
  similarity,
  suggestSentiment,
  suggestTopic,
  validate,
  type Declared,
} from '../src/lib/pipeline';
import { readXlsx, records } from '../scripts/xlsx';
import type { AuditRow, SourceRow } from '../src/lib/types';

const row = (o: Partial<SourceRow>): SourceRow => ({
  id: 'x',
  fecha: '2026-09-01 10:00:00',
  tipo: 'Tweet',
  plataforma: 'X (Twitter)',
  titulo: '',
  texto: '',
  autor: '',
  url: '',
  keyword: '',
  sentione: 'NEUTRAL',
  interacciones: 0,
  hoja: 'base',
  ...o,
});

describe('limpieza de texto', () => {
  it('decodifica entidades y quita restos de atributos HTML sin cambiar palabras', () => {
    expect(cleanText('parece un &quot;molidero&quot;')).toBe('parece un "molidero"');
    expect(cleanText('alerta en Barrancabermeja&quot; type=&quot;text/html&quot; data-cms-ai=&quot;0&quot;&gt; río')).toBe('alerta en Barrancabermeja río');
    expect(cleanText('  dos   espacios\n y línea ')).toBe('dos espacios y línea');
  });

  it('normaliza para comparar: sin tildes, enlaces, menciones ni etiquetas', () => {
    expect(normalize('¡La @ESSAGrupoEPM anuncia! https://t.co/x #Barrancabermeja Energía')).toBe('la anuncia energia');
  });
});

describe('plataforma, formato y sentimiento de Sentione', () => {
  it('traduce las etiquetas de la exportación', () => {
    expect(platformOf('X (Twitter)')).toBe('X');
    expect(platformOf('Websites')).toBe('Sitios web');
    expect(platformOf('Video', 'youtube_abc')).toBe('YouTube');
    expect(formatOf('Comment')).toBe('Comentario');
    expect(formatOf('Reels')).toBe('Video');
    expect(sentioneOf('NEGATIVE')).toBe('negativo');
    expect(sentioneOf('SIN CLASIFICAR')).toBe('sin_clasificar');
  });
});

describe('Ciro Fernández: cuentas propias y menciones', () => {
  it('reconoce sus cuentas por autor, enlace o página de Facebook', () => {
    expect(isCiroAccount(row({ autor: 'Ciro Fernández (@CiroFernandezN)' }))).toBe(true);
    expect(isCiroAccount(row({ url: 'https://twitter.com/CiroFernandezN/status/1' }))).toBe(true);
    expect(isCiroAccount(row({ id: '810301545696609_1699011794919129', autor: 'Ciro Fernández' }))).toBe(true);
    expect(isCiroAccount(row({ autor: 'Ciro Fernández López', id: '123_456' }))).toBe(false);
  });

  it('una publicación propia cuenta como propia aunque no lo nombre', () => {
    expect(ciroRelation(row({ autor: 'Ciro Fernández (@CiroFernandezN)', texto: 'Las vías rurales no aguantan más abandono.' }))).toBe('propia');
  });

  it('una mención exige el nombre completo y contexto local o político', () => {
    expect(mentionsCiro('Ciro Fernández entraría en la baraja de precandidatos para la alcaldía de Barrancabermeja')).toBe(true);
    expect(mentionsCiro('El profesor Ciro Fernández encerró a sus alumnos en Sinaloa')).toBe(false);
    expect(mentionsCiro('Ciro llegó a la reunión en Barrancabermeja')).toBe(false);
  });

  it('la palabra clave de captura no convierte un registro en mención', () => {
    expect(ciroRelation(row({ keyword: 'Ciro Fernández alcaldía de Barrancabermeja', texto: 'Ley seca en Barrancabermeja por elecciones' }))).toBeNull();
  });
});

describe('propuestas automáticas', () => {
  it('tema por palabras clave', () => {
    expect(suggestTopic('Nuevo avistamiento de un hipopótamo en el barrio')).toBe('hipo');
    expect(suggestTopic('Asesinan a comerciante: ofrecen recompensa')).toBe('seg');
    expect(suggestTopic('Texto sin pistas')).toBeNull();
  });

  it('sentimiento: negación, ironía y notas de medios', () => {
    expect(suggestSentiment('Qué bueno que ya se pueda pasar por el puente')).toBe('positivo');
    expect(suggestSentiment('Esto no es una buena noticia para la ciudad')).toBe('negativo');
    expect(suggestSentiment('Jajaja el presidente estará alerta')).toBe('no_determinable');
    expect(suggestSentiment('la alcaldía no están haciendo nada, los niños están en peligro')).toBe('negativo');
    expect(suggestSentiment('Denuncian contaminación en la ciénaga', 'Artículo')).toBe('neutral');
    expect(suggestSentiment('Alcaldía retrasa obras del malecón por errores de gestión', 'Artículo')).toBe('negativo');
  });
});

describe('réplicas', () => {
  const base = { autor: 'Blu Santanderes (@BLUSantanderes)', plataforma: 'X' as const };
  it('marca la misma cuenta, plataforma y texto en menos de 7 días', () => {
    const r = findReplicas([
      { ...base, id: 'a', fecha: '2026-09-04 15:00:00', texto: 'Alcaldía de Barrancabermeja retrasa obras del Malecón #VocesySonidos https://t.co/1' },
      { ...base, id: 'b', fecha: '2026-09-06 08:00:00', texto: 'Alcaldía de Barrancabermeja retrasa obras del Malecón #MañanasBlu https://t.co/1' },
    ]);
    expect([...r.entries()]).toEqual([['b', 'a']]);
  });

  it('no marca otra plataforma, otro autor, otra semana ni comentarios sin autor', () => {
    const t = 'Alcaldía de Barrancabermeja retrasa obras del Malecón';
    const r = findReplicas([
      { ...base, id: 'a', fecha: '2026-09-04', texto: t },
      { ...base, id: 'b', plataforma: 'Facebook', fecha: '2026-09-04', texto: t },
      { ...base, id: 'c', autor: 'Otro medio', fecha: '2026-09-04', texto: t },
      { ...base, id: 'd', fecha: '2026-09-20', texto: t },
      { ...base, id: 'e', autor: '', fecha: '2026-09-04', texto: t },
      { ...base, id: 'f', autor: '', fecha: '2026-09-04', texto: t },
    ]);
    expect(r.size).toBe(0);
  });

  it('la similitud tolera una mención eliminada pero no un texto distinto', () => {
    expect(similarity('La @ESSAGrupoEPM anuncia cobros adicionales por superar metas de consumo', 'La ESSA anuncia cobros adicionales por superar metas de consumo')).toBeGreaterThan(0.85);
    expect(similarity('Hipopótamo en el barrio Limonar', 'Recompensa por el homicidio de un comerciante')).toBeLessThan(0.2);
  });
});

describe('validación contra las cifras declaradas', () => {
  const a = (fila: number, id: string, decision: AuditRow['decision']): AuditRow => ({ fila, id, decision, justificacion: '', categoria: '', ciro: false, enlace: '' });
  const audit = [a(2, 'i1', 'Incluir'), a(3, 'r1', 'Revisar'), a(4, 'e1', 'Excluir'), a(5, 'i1', 'Duplicado')];
  const declared: Declared = { filas: 4, incluidos: 1, pendientes: 1, excluidos: 1, duplicados: 1, ventana: { desde: '2026-01-01', hasta: '2026-10-28' } };

  it('todas las comprobaciones pasan cuando la exportación cuadra', () => {
    const checks = validate(audit, [row({ id: 'i1' })], [row({ id: 'r1' })], declared);
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('detecta una cifra declarada que no coincide', () => {
    const checks = validate(audit, [row({ id: 'i1' })], [row({ id: 'r1' })], { ...declared, incluidos: 2 });
    expect(checks.find((c) => c.id === 'incluidos')!.ok).toBe(false);
  });
});

describe('lector de XLSX', () => {
  it('lee libros con rutas internas absolutas, cadenas en línea y compartidas', () => {
    const ns = 'xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    const files = {
      '_rels/.rels': strToU8('<Relationships><Relationship Target="/xl/workbook.xml" Id="r0"/></Relationships>'),
      'xl/workbook.xml': strToU8(`<x:workbook ${ns}><x:sheets><x:sheet name="Hoja &amp; uno" sheetId="1" r:id="R1"/></x:sheets></x:workbook>`),
      'xl/_rels/workbook.xml.rels': strToU8(
        '<Relationships><Relationship Target="/xl/worksheets/sheet1.xml" Id="R1"/><Relationship Type="sharedStrings" Target="sharedStrings.xml" Id="R2"/></Relationships>',
      ),
      'xl/sharedStrings.xml': strToU8(`<x:sst ${ns}><x:si><x:t>compartida</x:t></x:si></x:sst>`),
      'xl/worksheets/sheet1.xml': strToU8(
        `<x:worksheet ${ns}><x:sheetData><x:row r="1"><x:c r="A1" t="str"><x:v>ID</x:v></x:c><x:c r="C1" t="str"><x:v>Texto</x:v></x:c></x:row>` +
          `<x:row r="2"><x:c r="A2" t="n"><x:v>7</x:v></x:c><x:c r="C2" t="s"><x:v>0</x:v></x:c></x:row>` +
          `<x:row r="3"><x:c r="A3" t="inlineStr"><x:is><x:t>a &quot;b&quot;</x:t></x:is></x:c></x:row></x:sheetData></x:worksheet>`,
      ),
    };
    const wb = readXlsx(zipSync(files));
    expect(Object.keys(wb)).toEqual(['Hoja & uno']);
    expect(records(wb['Hoja & uno'])).toEqual([
      { ID: '7', '': '', Texto: 'compartida' },
      { ID: 'a "b"', '': '', Texto: '' },
    ]);
  });
});

describe('investigación web y figuras', () => {
  it('lee la fecha de la URL y detecta dominios atípicos', async () => {
    const { urlDate, atypicalUrl, asOfficial } = await import('../src/lib/web');
    expect(urlDate('https://enlacetelevision.com/2026/10/26/renuncias/')).toBe('2026-10-26');
    expect(urlDate('https://www.procuraduria.gov.co/Pages/nota.aspx')).toBeNull();
    expect(atypicalUrl('https://www.com.elcolombiano.com/negocios/x')).toBe(true);
    expect(atypicalUrl('https://chat.policia.gov.co/noticia/x')).toBe(true);
    expect(atypicalUrl('https://www.vanguardia.com/santander/x')).toBe(false);
    expect(asOfficial('El secretario de Ambiente y Transición Energética, Leonardo Granados, explicó', /Leonardo\s+Granados/)).toBe(true);
    expect(asOfficial('Leonardo Granados aspiraría a la Alcaldía', /Leonardo\s+Granados/)).toBe(false);
  });

  it('una nota repetida de Sentione se descarta y el resumen editorial no crea menciones', async () => {
    const { buildWeb } = await import('../src/lib/web');
    const w = (id: string, o: Partial<SourceRow> & { resumen?: string }) => ({
      ...row({ id, tipo: 'Article', plataforma: 'Websites', autor: 'Medio', fecha: '2026-10-10', titulo: 'Titular', url: `https://medio.co/2026/10/10/${id}/`, ...o }),
      resumen: o.resumen ?? '',
      actores: [],
      estadoPolitico: '',
    });
    const review = ['a', 'b'].map((id) => ({ id, fecha: '', ref: '', decision: 'incluir' as const, tema: 'pol' as const, sentimiento: 'neutral' as const, objetivo: 'sin_objetivo' as const, voz: 'medio' as const }));
    const out = buildWeb({
      web: [w('a', { resumen: 'Ciro Fernández aspiraría a la Alcaldía de Barrancabermeja' }), w('b', { url: 'https://sentione.co/x' })],
      review,
      sentione: [row({ id: 's1', url: 'https://sentione.co/x' })],
      auditLinks: [],
      ventana: { desde: '2026-01-01', hasta: '2026-10-28' },
      archivo: 'x.xlsx',
      hallazgo: { cuenta: 'Cuenta (@Cuenta)', estado: '' },
    });
    expect(out.registros.map((r) => r.id)).toEqual(['a']);
    expect(out.registros[0].ciro).toBeNull();
    expect(out.resumen.duplicadosConSentione).toEqual(['b']);
  });
});
