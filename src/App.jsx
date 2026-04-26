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

export default function App() {
  const [view, setView] = useState('dashboard');
  const { bots, selectedBot, setSelectedBot, addBot } = useBots();

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

  const handleFinish = (config, docsCount) => {
    addBot(config, docsCount);
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
