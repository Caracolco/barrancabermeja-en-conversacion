# Barrancabermeja en Conversación

Informe ejecutivo interactivo sobre la conversación pública digital de Barrancabermeja, sus problemáticas y el contexto
electoral, con foco en la presencia de Ciro Fernández y en los nombres que suenan para la Alcaldía 2027. Comparte identidad visual y arquitectura con
[Cartagena en Conversación](https://caracolco.github.io/cartagena-en-conversacion/).

**Sitio:** https://caracolco.github.io/barrancabermeja-en-conversacion/

React + Vite + TypeScript + Tailwind + Motion, publicado en GitHub Pages con GitHub Actions.

## Uso rápido

```bash
npm install
npm run data      # regenera los datos desde data/fuente/*.xlsx y data/revision/revision.json
npm run dev       # http://localhost:5173/barrancabermeja-en-conversacion/
npm test          # motor de depuración, datos reales e interfaz
npm run build     # sitio estático en dist/
```

## Estructura del informe

Seis capítulos sin numeración, navegables con las flechas del teclado, los botones anterior/siguiente, el menú lateral o
deslizando en tableta; cada pantalla tiene su dirección (`#/ciro`, `#/voces/2`).

1. **Portada**: un punto por registro pertinente, mes a mes; los rojos son de Ciro Fernández.
2. **La conversación**: volumen, evolución semanal y plataformas.
3. **Ciro Fernández**: publicaciones propias frente a menciones de terceros, meses, temas y tono de sus mensajes; y el
   **tablero 2027**: posibles aspirantes, qué fuente los nombra y que ninguna candidatura está confirmada.
4. **¿De qué habla Barrancabermeja?**: temas ordenados por volumen real, con su carga crítica y ejemplos.
5. **Percepciones y voces ciudadanas**: sentimiento y destinatario de la crítica, y nueve evidencias reales.
6. **Conclusiones**: cinco hallazgos cuantificados y el método de verificación.

Todas las cifras y titulares se calculan en `src/report/story.ts` y `src/lib/conclusions.ts` a partir de
`src/data/registros.json`; si la base cambia, los titulares cambian con ella.

## Datos y depuración

| Archivo | Contenido |
|---|---|
| `data/fuente/Ciro_Fernandez_escucha_depurada.xlsx` | Exportación de Sentione con la depuración preliminar (hojas *Base depurada*, *Revisión pendiente*, *Auditoría* y *Resumen y método*). Solo se lee. |
| `data/fuente/Ciro_Fernandez_base_depurada.csv` | La hoja *Base depurada* en CSV; una prueba verifica que coincide con el Excel. |
| `data/fuente/Ciro_Fernandez_escucha_ampliada_fuentes_publicas.xlsx` | Libro ampliado: los mismos 220 registros de Sentione más 26 notas de investigación web, figuras políticas, hallazgo por validar y metodología. Solo se lee. |
| `data/fuente/Ciro_Fernandez_base_ampliada_para_Claude.csv`, `…_solo_nuevas_fuentes_web.csv` | Las mismas tablas en CSV; las pruebas verifican que coinciden con el libro. |
| `data/fuente/ciro_x_recuperadas.json` | 14 publicaciones públicas de @CiroFernandezN que la auditoría tenía sin texto, recuperadas desde su enlace con el servicio público de inserción de X (las largas solo muestran el inicio). |
| `data/revision/verificacion-web.json` | Consulta en línea de cada nota de búsqueda pública: código HTTP, título y fecha. |
| `data/revision/revision-web.json` | Revisión de las 26 notas web: decisión, tema, sentimiento del titular, destinatario y voz. |
| `src/data/figuras.json`, `public/data/auditoria-web.csv` | Generados por `npm run data`: figuras con sus cifras en la escucha y en la web, y decisión de cada nota web. |
| `data/revision/revision.json` | Revisión registro a registro de los 346 registros con texto: decisión, motivo, tema, sentimiento, destinatario y voz. |
| `src/data/evidencias.json` | Evidencias elegidas: id, fragmento literal y motivo de la selección. |
| `src/data/registros.json`, `src/data/resumen.json` | Generados por `npm run data`. |
| `public/data/auditoria.csv` | Decisión final de cada una de las 815 filas originales, descargable desde el sitio. |

El motor (`src/lib/pipeline.ts`) son funciones puras con pruebas:

| Paso | Regla |
|---|---|
| Validación | La exportación debe coincidir con lo declarado: 815 filas, 220 incluidas, 126 pendientes, 456 excluidas y 13 duplicadas (4 identificadores). Si no, `npm run data` se detiene. |
| Pertinencia | Se conserva lo que trata de aspiraciones, elecciones, figuras políticas, la Alcaldía o problemáticas de la ciudad (seguridad, servicios, ambiente, obras, salud, educación, empleo, gestión). Salen los anuncios de rutina, los temas de otras ciudades, las notas de años anteriores y los comentarios sin relación. Lo crítico o negativo no se excluye. |
| Ciro Fernández | **Propia**: publicada por @CiroFernandezN o su página de Facebook. **Mención**: un tercero escribe «Ciro Fernández» con contexto local o político. La palabra clave de captura no cuenta. La conversación sobre la ciudad no se le atribuye. |
| Réplicas | La misma cuenta, en la misma plataforma, con el mismo texto (similitud ≥ 0,85) en menos de 7 días: se cuenta una vez. |
| Sentimiento | Positivo, negativo, neutral o no determinable, con su destinatario: Ciro Fernández, otro actor político, la Alcaldía, una problemática de la ciudad o sin objetivo. Revisado leyendo cada texto (negaciones, ironía, contexto); las notas de medios solo se polarizan si atribuyen una falla o reportan una denuncia. Los casos ambiguos quedan con la marca `revisar`. |
| Privacidad | Los comentarios y cuentas personales se muestran sin nombre de autor; se conserva el enlace público para verificar la fuente. |

El motor también propone tema y sentimiento por reglas; el resumen registra cuánto coinciden esas propuestas y el
sentimiento original de Sentione con la revisión.

### Una sola base

El informe analiza una sola base de publicaciones pertinentes: las de la escucha social y las notas de medios encontradas
por búsqueda pública se cuentan, grafican y clasifican juntas. Las pantallas no distinguen el origen ni muestran los
totales brutos de captura. El origen de cada registro se conserva solo en los datos (campo `fuente`) y en las auditorías
descargables, para poder verificarlo.

- Las notas de búsqueda pública no traen texto completo ni interacciones. Su extracto es el titular del medio; el resumen
  editorial de la investigación no se cita ni se trata como comentario ciudadano, y su sentimiento se lee en el titular.
- Las pruebas verifican que el libro ampliado trae los registros de la escucha sin cambios, que la fecha de cada nota
  coincide con la de su URL y que ninguna repite otra publicación.

**Figuras.** La situación de cada nombre sale de la hoja *Figuras y verificación*. Las cifras salen de contar sus
menciones en los textos de la escucha y en las notas web, distinguiendo cuando se le nombra con un cargo en la
administración. Fabián Oviedo se trata como figura de Bucaramanga. Ninguna candidatura se presenta como confirmada.

### Resultado

- 815 registros capturados → 346 con texto revisados → 298 pertinentes → **289 en el informe** (9 réplicas).
- Búsqueda pública: 26 notas → 23 pertinentes. **Base del informe: 325 publicaciones** (incluye 13 publicaciones de Ciro recuperadas; la otra recuperada, un mensaje de condolencia, no es pertinente).
- Ciro Fernández: 16 publicaciones propias y 1 mención de terceros con texto.
- Limitaciones: los 456 registros excluidos preliminarmente no traen texto en los archivos entregados (299 son comentarios
  de Facebook y 14 son publicaciones de @CiroFernandezN); no se pudieron volver a leer y quedan señalados en la auditoría.
  Para reabrirlos se necesita la exportación original completa de Sentione.

## Actualizar los datos

1. Reemplace el Excel en `data/fuente/` (mismas hojas y columnas).
2. Agregue a `data/revision/revision.json` la decisión de cada registro nuevo; `npm run data` falla si falta alguno.
3. Ejecute `npm run data`, `npm test` y publique con `git push`.

## Publicación

El flujo `.github/workflows/deploy.yml` ejecuta las pruebas, compila y publica en GitHub Pages cada vez que se
actualiza `main` (en *Settings → Pages*, la fuente debe ser **GitHub Actions**). La ruta base de Vite es
`/barrancabermeja-en-conversacion/`.

## Alcance

Mide la conversación digital registrada por Sentione entre el 1 de enero y el 28 de octubre de 2026. No mide audiencias
de prensa, radio o televisión, no representa a la población, no infiere intención de voto y no hace predicciones
electorales.
