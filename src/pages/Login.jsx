/**
 * @fileoverview Pantalla de inicio de sesión.
 *
 * NOTA: Esta pantalla implementa un login de demostración que acepta cualquier
 * email sin validación de contraseña. En producción, reemplazar por
 * Microsoft Entra ID (Azure AD) con la librería @azure/msal-react.
 *
 * CORRECCIÓN (v0.1.1):
 * Estilos inline eliminados. Ahora usa Login.module.css (AGENT.md §2).
 */

import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('docente@example.com');
  const [role, setRole] = useState('docente');
  const [err, setErr] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setErr('Ingrese un correo electrónico.');
      return;
    }
    login({ email, role });
  };

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={onSubmit}>
        <h2 className={styles.title}>Iniciar sesión</h2>

        {err && <p className={styles.error}>{err}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="role">Rol</label>
          <select
            id="role"
            className={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="docente">Docente</option>
            <option value="estudiante">Estudiante</option>
          </select>
        </div>

        <button type="submit" className={styles.btn}>Entrar</button>

        <p className={styles.disclaimer}>
          Demo: cualquier correo es válido. En producción se usará autenticación institucional.
        </p>
      </form>
    </div>
  );
}
