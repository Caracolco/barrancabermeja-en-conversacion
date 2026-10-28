import type { Platform, Sentiment, Target, TopicId, Voice } from './types';

export const TOPIC_LABEL: Record<TopicId, string> = {
  seg: 'Seguridad y convivencia',
  amb: 'Ambiente y ciénagas',
  hipo: 'Hipopótamos',
  agua: 'Agua, energía y servicios',
  obras: 'Obras e infraestructura',
  pol: 'Política y elecciones',
  edu: 'Educación',
  gestion: 'Gestión y transparencia',
  riesgo: 'Lluvias y emergencias',
  salud: 'Salud',
  eco: 'Economía e impuestos',
  mem: 'Memoria y víctimas',
  mov: 'Movilidad y transporte',
};

/** Qué abarca cada tema en la revisión. */
export const TOPIC_SCOPE: Record<TopicId, string> = {
  seg: 'homicidios, sicariato, amenazas, recompensas, habitantes de calle y ruido',
  amb: 'contaminación por hidrocarburos, vertimientos, muerte de manatíes y defensa de las ciénagas',
  hipo: 'avistamientos en barrios y veredas, y la discusión sobre su control',
  agua: 'sequía, abastecimiento de agua, fallas y tarifas de energía, PTAR y basuras',
  obras: 'vías, puentes, Vía Yuma, malecón, granjas solares y obras inconclusas',
  pol: 'aspiraciones, campañas, uso de la Alcaldía en política y jornadas electorales',
  edu: 'colegios, becas, transporte escolar y la nueva sede de las UTS',
  gestion: 'contratos, investigaciones, huelga de trabajadores y rendición de cuentas',
  riesgo: 'crecientes del río, deslizamientos, tormentas y sismo',
  salud: 'hospital regional, puestos de salud, medicamentos y salud mental',
  eco: 'empleo, impuesto predial y desarrollo económico',
  mem: 'memoria del conflicto, víctimas y desaparecidos',
  mov: 'transporte escolar y conectividad',
};

/** Reglas del motor: palabras clave que proponen un tema. La revisión manual decide. */
export const TOPIC_RULES: [TopicId, RegExp][] = [
  ['hipo', /hipop[oó]tamo/i],
  ['pol', /\b(elecci[oó]n|electoral|candidat|precandidat|campa[ñn]a|aspira|votos?|senador[ae]?|cepeda|pacto hist[oó]rico|ley seca)/i],
  ['amb', /(manat[ií]|ci[eé]naga|hidrocarburo|vertimiento|contaminaci[oó]n|crudo|mortandad)/i],
  ['seg', /(homicid|asesina|sicari|recompensa|feminicid|granada|panfleto|disidencia|extorsi|inseguridad|habitantes? de calle|drones?|polic[ií]a|masacre)/i],
  ['agua', /(sequ[ií]a|agua potable|racionamiento|essa|energ[ií]a|ptar|acueducto|basura|relleno sanitario|el ni[ñn]o)/i],
  ['obras', /(v[ií]a yuma|pavimenta|puente|malec[oó]n|granja solar|obra|infraestructura|v[ií]as)/i],
  ['edu', /(colegio|estudiant|uts\b|becas?|educaci[oó]n|escolar)/i],
  ['salud', /(hospital|salud|medicamento|eps\b|suicid)/i],
  ['gestion', /(procuradur[ií]a|contrato|irregularidad|huelga|empr[eé]stito|corrupci[oó]n|cabildo)/i],
  ['riesgo', /(lluvia|inundaci|deslizamiento|sismo|tormenta|erosi[oó]n|alerta (amarilla|naranja))/i],
  ['mem', /(memoria|v[ií]ctimas|desaparecid)/i],
  ['eco', /(predial|empleo|desempleo|econom[ií]a|empresari)/i],
  ['mov', /(transporte|movilidad|tr[aá]nsito)/i],
];

export const SENT_LABEL: Record<Sentiment, string> = {
  positivo: 'Positivo',
  negativo: 'Negativo',
  neutral: 'Neutral',
  no_determinable: 'No determinable',
};

export const TARGET_LABEL: Record<Target, string> = {
  ciro: 'Ciro Fernández',
  otro_actor: 'Otro actor político',
  alcaldia: 'Alcaldía o administración',
  ciudad: 'Problemática de ciudad',
  sin_objetivo: 'Sin objetivo identificable',
};

export const VOICE_LABEL: Record<Voice, string> = {
  ciro: 'Cuentas de Ciro Fernández',
  medio: 'Medios y portales',
  ciudadano: 'Personas y comentarios',
  institucional: 'Instituciones y organizaciones',
};

export const PLATFORMS: Platform[] = ['Sitios web', 'X', 'Facebook', 'Instagram', 'YouTube'];

/** Cuentas propias identificadas en la base: X @CiroFernandezN y la página de Facebook 810301545696609. */
export const CIRO_ACCOUNTS = ['X: @CiroFernandezN', 'Facebook: página «Ciro Fernández» (id 810301545696609)'];
export const CIRO_X = /(?:@|twitter\.com\/|x\.com\/)CiroFernandezN\b/i;
export const CIRO_FB_PAGE = '810301545696609';
export const CIRO_NAME = /\bCiro\s+Fern[aá]ndez\b/i;
