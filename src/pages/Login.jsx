import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('docente@example.com');
  const [role, setRole] = useState('docente');
  const [err, setErr] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    // Sencillo login de prueba: cualquier email/rol se acepta; en producción usar SSO
    if (!email) { setErr('Ingrese un correo'); return; }
    login({ email, role });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <form onSubmit={onSubmit} style={{ width: 420, padding: 20, border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Iniciar sesión</h2>
        {err && <div style={{ color: 'red', marginBottom: 8 }}>{err}</div>}
        <div style={{ marginBottom: 12 }}>
          <label>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ width: '100%', padding: 8 }}>
            <option value="docente">Docente</option>
            <option value="estudiante">Estudiante</option>
          </select>
        </div>
        <button type="submit" style={{ width: '100%', padding: 10, background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6 }}>Entrar</button>
      </form>
    </div>
  );
}
