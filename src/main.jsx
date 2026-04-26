/**
 * @fileoverview Punto de entrada de React.
 * Bootstrap mínimo: monta la app y carga los estilos globales.
 * No debe contener lógica de negocio ni componentes.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/globals.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
