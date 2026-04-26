/**
 * @fileoverview Componente raíz de la aplicación.
 * Responsabilidad única: enrutamiento de vistas.
 */

import styles from './App.module.css';
import { useBots } from './hooks/useBots.js';
import Sidebar from './components/layout/Sidebar.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import Builder from './components/builder/Builder.jsx';
import Analytics from './components/analytics/Analytics.jsx';
import { useState } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import Login from './pages/Login.jsx';

function AppInner() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Login />;
  }
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
 
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
