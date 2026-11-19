
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register } from '../../services/auth.service';

export default function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => {
      navigate('/login', {
        replace: true,
        state: {
          message: 'Cuenta creada correctamente. Ahora inicia sesión.',
        },
      });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [success, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible crear la cuenta.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Crear cuenta</h1>
        <p>Regístrate para descubrir eventos en EVENTIA.</p>

        {success && (
          <p role="status">
            Cuenta creada correctamente. Redirigiendo al inicio de sesión...
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Nombre completo</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            disabled={loading || success}
          />

          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading || success}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading || success}
          />

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={loading || success}>
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <p>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </section>
  );
}
