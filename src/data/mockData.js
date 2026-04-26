/**
 * @fileoverview Datos de demostración para ChatEdu Builder.
 * Contiene únicamente estructuras de datos estáticas para poblar la UI en desarrollo.
 * No debe contener lógica de negocio, funciones ni llamadas a APIs.
 */

import { COLORS } from '../constants/index.js';

/**
 * Lista inicial de chatbots de ejemplo que se muestran en el Dashboard.
 * @type {Array<{id: number, name: string, subject: string, level: string, docs: number, queries: number, active: boolean, color: string}>}
 */
export const MOCK_BOTS = [
  {
    id:      1,
    name:    'Asistente de Álgebra Lineal',
    subject: 'Matemáticas',
    level:   'Universitario',
    docs:    3,
    queries: 142,
    active:  true,
    color:   COLORS.indigo.mid,
  },
  {
    id:      2,
    name:    'Tutor de Historia Colombiana',
    subject: 'Historia',
    level:   'Secundaria',
    docs:    5,
    queries: 89,
    active:  true,
    color:   COLORS.teal.mid,
  },
  {
    id:      3,
    name:    'Guía de Química Orgánica',
    subject: 'Química',
    level:   'Universitario',
    docs:    2,
    queries: 67,
    active:  false,
    color:   COLORS.amber.mid,
  },
];

/**
 * Métricas de analítica de demostración.
 * En producción, estos datos vendrán de un endpoint del servidor.
 * @type {{totalQueries: number, avgSession: string, topTopics: string[], gaps: string[], weekly: number[]}}
 */
export const ANALYTICS = {
  totalQueries: 298,
  avgSession:   '4.2 min',
  topTopics: [
    'Matrices y determinantes',
    'Independencia de Colombia',
    'Grupos funcionales',
    'Límites y derivadas',
  ],
  gaps: [
    'Transformaciones lineales',
    'Período colonial temprano',
  ],
  /** Consultas por día: [Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo] */
  weekly: [12, 28, 34, 22, 41, 55, 38],
};
