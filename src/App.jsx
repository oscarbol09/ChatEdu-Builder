/**
 * @fileoverview Componente raíz de la aplicación.
 * Responsabilidad única: enrutamiento de vistas.
 *
 * REGLA DE HOOKS (React):
 * Todos los hooks deben llamarse en el nivel superior del componente,
 * ANTES de cualquier retorno condicional. Se separó AppInner en dos
 * componentes para cumplir esta regla correctamente:
 *   - AppAuthenticated: se monta solo cuando el usuario ya está autenticado.
 *     Aquí viven todos los hooks de estado de la app (useBots, useState de vistas).
 *   - AppInner: decide si mostrar Login o AppAuthenticated.
 *
 * CAMBIOS (v0.3.0):
 * - AppInner consume `isAuthLoading` desde AuthContext.
 *   Mientras la hidratación de localStorage no haya terminado, se muestra
 *   null en lugar de Login o Dashboard. Esto elimina el bug donde la app
 *   mostraba el Dashboard directamente en visitas recurrentes en Azure,
 *   saltándose el Login, porque localStorage ya tenía sesión guardada.
 *
 * CAMBIOS (v0.3.1) — Fix Bug 1 Deep Linking:
 * - AppInner ahora lee el hash de la URL con useHashRoute ANTES del guard
 *   de autenticación. Las rutas /#/bot/:id son públicas y se resuelven
 *   directamente a ChatbotPublic sin pasar por Login ni Dashboard.
 *   Antes, useHashRoute existía pero nunca se conectaba al árbol de
 *   renderizado, por lo que el hash era ignorado en acceso directo.
 */

import { useState } from 'react';
import styles from './App.module.css';
import { useBots } from './hooks/useBots.js';
import Sidebar from './components/layout/Sidebar.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import Builder from './components/builder/Builder.jsx';
import Analytics from './components/analytics/Analytics.jsx';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import Login from './pages/Login.jsx';
import ChatbotPublic from './pages/bot/ChatbotPublic.jsx';
import StudentPortal from './pages/StudentPortal.jsx';
import { useHashRoute } from './router/useHashRoute.js';

/**
 * Redirección por rol: estudiantes van a /explore (StudentPortal)
 */
function AppAuthenticated() {
  const { user } = useAuth();
  
  // Docentes ven el dashboard normal, estudiantes ven StudentPortal
  const isEstudiante = user?.role === 'estudiante';
  
  const [view, setView] = useState('dashboard');
  const { bots, selectedBot, setSelectedBot, addBot, updateBot } = useBots();

  /** Bot que se está editando; null = creación nueva. */
  const [botToEdit, setBotToEdit] = useState(null);

  const handleViewAnalytics = (bot) => {
    setSelectedBot(bot);
    setView('analytics');
  };

  const handleCreateBot = () => {
    setBotToEdit(null);
    setView('builder');
  };

  const handleConfigureBot = (bot) => {
    setBotToEdit(bot);
    setView('builder');
  };

  const handleFinish = (config, files) => {
    addBot(config, files);
    setBotToEdit(null);
    setView('dashboard');
  };

  const handleUpdateBot = (botId, config, files) => {
    updateBot(botId, { ...config, files });
    setBotToEdit(null);
    setView('dashboard');
  };

  const handleCancel = () => {
    setBotToEdit(null);
    setView('dashboard');
  };

  // Si es estudiante, mostrar portal de estudiantes
  if (isEstudiante) {
    return <StudentPortal />;
  }

  return (
    <div className={styles.layout}>
      <Sidebar activeView={view} onNavigate={setView} />

      <main className={styles.main}>
        {view === 'dashboard' && (
          <Dashboard
            bots={bots}
            onCreateBot={handleCreateBot}
            onViewAnalytics={handleViewAnalytics}
            onConfigureBot={handleConfigureBot}
          />
        )}

        {view === 'builder' && (
          <Builder
            initialBot={botToEdit}
            onFinish={handleFinish}
            onUpdate={handleUpdateBot}
            onCancel={handleCancel}
          />
        )}

        {view === 'analytics' && selectedBot && (
          <Analytics
            bot={selectedBot}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Enrutador de autenticación y hash.
 * Decide si mostrar un loader, Login, la app principal o un chatbot público.
 *
 * IMPORTANTE — por qué existe el check de isAuthLoading:
 * AuthContext hidrata `user` desde localStorage en un useEffect (asíncrono).
 * Si AppInner renderizara inmediatamente, vería isAuthenticated=false en el
 * primer tick y mostraría Login. Un tick después isAuthenticated cambiaría a
 * true y la app saltaría al Dashboard sin que el usuario se autenticara.
 * Esperando a isAuthLoading=false garantizamos que la decisión se tome con
 * el estado de autenticación ya resuelto.
 *
 * ORDEN DE RESOLUCIÓN DE RUTAS:
 * 1. /#/bot/:id  → ChatbotPublic (público, sin auth, resuelto primero)
 * 2. isAuthLoading → null (esperar hidratación de sesión)
 * 3. isAuthenticated → AppAuthenticated | Login
 */
function AppInner() {
  const { isAuthenticated, isAuthLoading } = useAuth();
  const { route, params } = useHashRoute();

  // Rutas públicas: no requieren autenticación.
  // Se evalúan ANTES del guard de auth para evitar redirección a Login.
  if (route === 'bot') {
    return <ChatbotPublic botId={params.id} />;
  }

  // Esperar a que la sesión de localStorage termine de hidratarse.
  // Sin este guard, la app saltaba el Login en visitas recurrentes en Azure.
  if (isAuthLoading) return null;

  return isAuthenticated ? <AppAuthenticated /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
