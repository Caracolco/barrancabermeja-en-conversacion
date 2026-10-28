export type Sentiment = 'positivo' | 'negativo' | 'neutral' | 'no_determinable';

/** Hacia quién se dirige el sentimiento. */
export type Target = 'ciro' | 'otro_actor' | 'alcaldia' | 'ciudad' | 'sin_objetivo';

/** Quién habla: la cuenta de Ciro, un medio, una persona o una institución. */
export type Voice = 'ciro' | 'medio' | 'ciudadano' | 'institucional';

export type TopicId = 'seg' | 'amb' | 'hipo' | 'agua' | 'obras' | 'gestion' | 'pol' | 'riesgo' | 'edu' | 'salud' | 'mov' | 'eco' | 'mem';

export type Platform = 'X' | 'Facebook' | 'Instagram' | 'Sitios web' | 'YouTube';

export type Format = 'Publicación' | 'Comentario' | 'Artículo' | 'Video';

/** Propia: publicada por una cuenta de Ciro. Mención: un tercero lo nombra en su texto. */
export type CiroRel = 'propia' | 'mencion' | null;

/** Fila de la exportación de Sentione (hojas «Base depurada» y «Revisión pendiente»). */
export interface SourceRow {
  id: string;
  fecha: string;
  tipo: string;
  plataforma: string;
  titulo: string;
  texto: string;
  autor: string;
  url: string;
  keyword: string;
  sentione: string;
  interacciones: number;
  hoja: 'base' | 'pendiente';
}

/** Fila de la hoja «Auditoría»: una por cada registro de la exportación original. */
export interface AuditRow {
  fila: number;
  id: string;
  decision: 'Incluir' | 'Revisar' | 'Excluir' | 'Duplicado';
  justificacion: string;
  categoria: string;
  ciro: boolean;
  enlace: string;
}

/** Decisión de la revisión registro a registro (data/revision/revision.json). */
export interface ReviewEntry {
  id: string;
  fecha: string;
  ref: string;
  decision: 'incluir' | 'excluir';
  motivo?: string;
  tema?: TopicId;
  sentimiento?: Sentiment;
  objetivo?: Target;
  voz?: Voice;
  nota?: string;
  revisar?: string;
}

/** Registro pertinente que entra en el informe. */
export interface Registro {
  id: string;
  fecha: string;
  plataforma: Platform;
  formato: Format;
  /** Solo para medios, instituciones y cuentas públicas; los comentarios no exponen autor. */
  autor: string | null;
  url: string;
  tema: TopicId;
  sentimiento: Sentiment;
  objetivo: Target;
  voz: Voice;
  ciro: CiroRel;
  sentione: Sentiment | 'sin_clasificar';
  extracto: string;
  /** Texto completo depurado de entidades HTML; solo en las evidencias. */
  texto?: string;
  revisar?: string;
}

export interface Check {
  id: string;
  label: string;
  expected: number;
  actual: number;
  ok: boolean;
}

export interface Resumen {
  fuente: { archivo: string; ventana: { desde: string; hasta: string }; filas: number };
  rango: { desde: string; hasta: string };
  validacion: Check[];
  preliminar: { incluir: number; revisar: number; excluir: number; duplicado: number; idsDuplicados: number };
  revision: {
    revisados: number;
    incluidos: number;
    excluidos: number;
    replicas: number;
    porMotivo: Record<string, number>;
    deIncluirAExcluir: number;
    deRevisarAIncluir: number;
    marcadosRevisar: number;
  };
  final: number;
  ciro: {
    propiasConTexto: number;
    propiasContadas: number;
    propiasSinTexto: { fila: number; enlace: string }[];
    mencionesTerceros: number;
    mencionesAuditoria: { fila: number; decision: string; justificacion: string; enlace: string; final: string }[];
    cuentas: string[];
  };
  excluidosSinTexto: { total: number; facebook: number; comentariosFacebook: number };
  sentione: { sinClasificar: number; coincidencia: number; comparables: number };
  motor: { temaCoincide: number; sentimientoCoincide: number; total: number };
}

export interface AuditoriaFila {
  fila: number;
  id: string;
  preliminar: string;
  justificacion: string;
  final: 'incluido' | 'excluido' | 'duplicado' | 'replica' | 'sin_texto';
  motivo: string;
  enlace: string;
}
