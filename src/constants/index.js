/**
 * @fileoverview Constantes globales de la aplicación ChatEdu Builder.
 * Esta es la única fuente de verdad para valores estáticos de configuración.
 * No debe contener funciones, hooks ni JSX.
 *
 * ════════════════════════════════════════════════════════════════
 * GUÍA RÁPIDA — CÓMO PERSONALIZAR EL FORMULARIO DEL WIZARD
 * ════════════════════════════════════════════════════════════════
 *
 * ▸ Agregar una materia nueva:
 *     Añadir el nombre al array BOT_SUBJECTS.
 *     Ejemplo: 'Economía Circular'
 *
 * ▸ Agregar un nivel educativo:
 *     Añadir al array BOT_LEVELS.
 *     Ejemplo: 'Técnico / Tecnológico'
 *
 * ▸ Agregar un tono de comunicación:
 *     Añadir al array BOT_TONES.
 *     Ejemplo: 'Motivacional'
 *
 * ▸ Cambiar el modelo de IA:
 *     Modificar GEMINI_MODEL (solo aquí, nunca en otro archivo).
 *
 * ▸ Cambiar el valor por defecto del formulario:
 *     Modificar DEFAULT_BOT_CONFIG.
 * ════════════════════════════════════════════════════════════════
 */

// ─── Modelo de IA ────────────────────────────────────────────────────────────
/**
 * Modelo de Gemini activo. Cambiar ÚNICAMENTE aquí para actualizar en toda la app.
 * Modelo actual: gemini-2.5-flash — disponible en el free tier de Google AI Studio.
 * API key gratuita (sin tarjeta): https://aistudio.google.com/apikey
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_MODEL = 'gemini-2.5-flash';

// ─── Paleta de colores ────────────────────────────────────────────────────────
export const COLORS = {
  indigo: { bg: '#1B1F5E', mid: '#3D44A8', light: '#E8EAFB', text: '#1B1F5E' },
  teal:   { bg: '#0B5E4A', mid: '#1A8C6E', light: '#E2F5EF', text: '#0B5E4A' },
  amber:  { bg: '#7A4200', mid: '#D97706', light: '#FEF3C7', text: '#7A4200' },
  red:    { bg: '#7F1D1D', mid: '#DC2626', light: '#FEE2E2', text: '#7F1D1D' },
};

// ─── Tipografía ───────────────────────────────────────────────────────────────
export const FONT      = "'Syne', 'Trebuchet MS', sans-serif";
export const FONT_BODY = "'DM Sans', 'Segoe UI', sans-serif";

// ─── Navegación ───────────────────────────────────────────────────────────────
export const NAV_ITEMS = [
  { key: 'dashboard', label: 'Mis chatbots'  },
  { key: 'builder',   label: 'Crear chatbot' },
];

// ─── Wizard ───────────────────────────────────────────────────────────────────
export const BUILDER_STEPS = ['Documentos', 'Configuración', 'Vista previa', 'Despliegue'];

// ─── Opciones de formulario ───────────────────────────────────────────────────

/**
 * MATERIAS / ASIGNATURAS
 * ──────────────────────
 * Agregar o quitar materias aquí. Se muestran en el Paso 2 del wizard.
 * El valor seleccionado también aparece en la tarjeta del Dashboard y en el
 * system prompt que recibe el modelo de IA.
 */
export const BOT_SUBJECTS = [
  // ── Ciencias básicas ──
  'Matemáticas',
  'Cálculo',
  'Álgebra Lineal',
  'Estadística',
  'Física',
  'Química',
  'Biología',
  // ── Ingenierías ──
  'Programación',
  'Estructuras de Datos',
  'Bases de Datos',
  'Redes y Comunicaciones',
  'Electrónica',
  // ── Ciencias sociales y humanidades ──
  'Historia',
  'Geografía',
  'Filosofía',
  'Lenguaje y Comunicación',
  'Ética y Ciudadanía',
  // ── Áreas profesionales ──
  'Economía',
  'Contabilidad',
  'Administración',
  'Derecho',
  'Medicina',
  'Enfermería',
  'Psicología',
  'Educación',
  // ── Sostenibilidad (relevante para tu electiva) ──
  'Economía Circular',
  'Desarrollo Sostenible',
  'Gestión Ambiental',
  // ── Otro ──
  'Otro',
];

/**
 * NIVELES EDUCATIVOS
 * ──────────────────
 * El nivel se incluye en el system prompt del chatbot para ajustar
 * la complejidad y vocabulario de las respuestas.
 */
export const BOT_LEVELS = [
  'Primaria',
  'Secundaria',
  'Técnico / Tecnológico',
  'Universitario',
  'Posgrado',
  'Educación continua',
];

/**
 * TONOS DE COMUNICACIÓN
 * ─────────────────────
 * El tono se envía al modelo en el system prompt.
 * Cada opción produce respuestas con un estilo diferente.
 */
export const BOT_TONES = [
  'Formal y académico',
  'Amigable y cercano',
  'Socrático (preguntas)',
  'Conciso y directo',
  'Motivacional',
  'Paso a paso (didáctico)',
];

/**
 * RESTRICCIONES TEMÁTICAS
 * ────────────────────────
 * Controla qué tanto puede "salirse" el chatbot del material cargado.
 */
export const RESTRICTION_OPTIONS = [
  { value: 'strict', label: 'Estricto: solo responde sobre los documentos cargados' },
  { value: 'guided', label: 'Guiado: puede contextualizar con conocimiento general'  },
  { value: 'open',   label: 'Abierto: sin restricciones temáticas'                   },
];

// ─── Configuración por defecto ────────────────────────────────────────────────
/**
 * Estado inicial del wizard. Se restaura al cancelar o al finalizar la creación.
 * Cambiar 'subject' y 'level' para que coincida con el contexto más frecuente de uso.
 */
export const DEFAULT_BOT_CONFIG = {
  name:        '',
  subject:     'Economía Circular',   // ← ajustado a tu electiva
  level:       'Universitario',
  tone:        'Amigable y cercano',
  welcome:     '',
  restriction: 'guided',
};
