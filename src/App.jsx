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

/**
 * Shell principal de la aplicación.
 * Solo se monta cuando el usuario está autenticado, por lo que
 * todos los hooks de estado pueden llamarse incondicionalmente.
 */
function AppAuthenticated() {
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
 * Enrutador de autenticación.
 * Decide si mostrar un loader, Login o la app principal.
 *
 * IMPORTANTE — por qué existe el check de isAuthLoading:
 * AuthContext hidrata `user` desde localStorage en un useEffect (asíncrono).
 * Si AppInner renderizara inmediatamente, vería isAuthenticated=false en el
 * primer tick y mostraría Login. Un tick después isAuthenticated cambiaría a
 * true y la app saltaría al Dashboard sin que el usuario se autenticara.
 * Esperando a isAuthLoading=false garantizamos que la decisión se tome con
 * el estado de autenticación ya resuelto.
 */
function AppInner() {
  const { isAuthenticated, isAuthLoading } = useAuth();

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
