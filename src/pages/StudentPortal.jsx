/**
 * @fileoverview Portal de estudiante - Catálogo de chatbots públicos.
 *
 * Muestra una galería de chatbots publicados por docentes.
 * Permite buscar, filtrar y obtener enlaces para compartir/embeber.
 */

import { useState, useEffect } from 'react';
import { getPublicBots } from '../services/db.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { navigateTo } from '../router/useHashRoute.js';

export default function StudentPortal() {
  const { user, logout } = useAuth();
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBot, setSelectedBot] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    setLoading(true);
    const data = await getPublicBots();
    setBots(data);
    setLoading(false);
  };

  const categories = ['all', ...new Set(bots.map(b => b.subject).filter(Boolean))];

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          bot.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || bot.subject === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getEmbedCode = (bot) => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `<iframe src="${baseUrl}/bot/${bot.id}" width="100%" height="600" frameborder="0"></iframe>`;
  };

  const getDirectLink = (bot) => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/bot/${bot.id}`;
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (!user || user.role === 'docente') {
    navigateTo('/');
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid #e2e4f0', padding: '1rem 2rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1b1f5e' }}>
            📚 Catálogo de Chatbots
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#6b7280' }}>Bienvenido, {user.name || user.email}</span>
            <button
              onClick={handleLogout}
              style={{ padding: '0.5rem 1rem', background: '#fee2e2', color: '#7f1d1d', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Buscador y Filtros */}
      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Buscar chatbots..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: '1',
              minWidth: '250px',
              padding: '0.75rem 1rem',
              border: '1px solid #e2e4f0',
              borderRadius: '8px',
              fontSize: '1rem'
            }}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              border: '1px solid #e2e4f0',
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'white'
            }}
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'Todas las categorías' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grilla de Bots */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Cargando chatbots...</div>
        ) : filteredBots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <p style={{ fontSize: '1.25rem' }}>No se encontraron chatbots publicados.</p>
            <p style={{ marginTop: '0.5rem' }}>Los docentes pronto publicarán sus primeros chatbots.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {filteredBots.map(bot => (
              <div
                key={bot.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  border: '1px solid #e2e4f0',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s'
                }}
              >
                {/* Card Header */}
                <div style={{ padding: '1.25rem', borderBottom: '1px solid #f3f4f6' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1b1f5e', marginBottom: '0.5rem' }}>
                    {bot.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', lineHeight: '1.5' }}>
                    {bot.description || 'Sin descripción'}
                  </p>
                </div>

                {/* Card Body */}
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {bot.subject && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: '500'
                      }}>
                        {bot.subject}
                      </span>
                    )}
                    {bot.level && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#f3f4f6',
                        color: '#4b5563',
                        borderRadius: '9999px',
                        fontSize: '0.75rem'
                      }}>
                        {bot.level}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '1rem' }}>
                    Creador: {bot.createdBy || 'Docente'}
                  </p>

                  {/* Botones */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => navigateTo(`/bot/${bot.id}`)}
                      style={{
                        flex: 1,
                        padding: '0.625rem',
                        background: '#3d44a8',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Abrir Chat
                    </button>
                    <button
                      onClick={() => setSelectedBot(bot)}
                      style={{
                        padding: '0.625rem 1rem',
                        background: 'white',
                        border: '1px solid #3d44a8',
                        color: '#3d44a8',
                        borderRadius: '6px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      compartir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Compartir */}
      {selectedBot && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedBot(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              Compartir: {selectedBot.name}
            </h3>

            {/* Enlace Directo */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                🔗 Enlace Directo
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  readOnly
                  value={getDirectLink(selectedBot)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    border: '1px solid #e2e4f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}
                />
                <button
                  onClick={() => copyToClipboard(getDirectLink(selectedBot), 'link')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: copied === 'link' ? '#10b981' : '#3d44a8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {copied === 'link' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Código Embed */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                📱 Código de Inserción (iFrame)
              </label>
              <textarea
                readOnly
                value={getEmbedCode(selectedBot)}
                rows={4}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #e2e4f0',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
              />
              <button
                onClick={() => copyToClipboard(getEmbedCode(selectedBot), 'embed')}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: copied === 'embed' ? '#10b981' : '#3d44a8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {copied === 'embed' ? '✓ Copiado' : 'Copiar Código'}
              </button>
            </div>

            <button
              onClick={() => setSelectedBot(null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}