import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/auth-context';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = (
    location.state as { message?: string } | null
  )?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authenticatedUser = await signIn(
        email.trim(),
        password,
      );

      // El usuario normal vuelve al homepage.
      if (authenticatedUser.role === 'USER') {
        navigate('/', { replace: true });
        return;
      }

      // Los demás roles acceden a su panel correspondiente.
      const dashboardByRole = {
        PROMOTER: '/promoter/dashboard',
        MODERATOR: '/moderator/dashboard',
        ADMIN: '/admin/dashboard',
      } as const;

      navigate(dashboardByRole[authenticatedUser.role], {
        replace: true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No fue posible iniciar sesión.',
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Iniciar sesión</h1>
        <p>Ingresa a tu cuenta de EVENTIA.</p>

        {successMessage && (
          <p role="status">{successMessage}</p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={loading}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />

          {error && <p role="alert">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Validando credenciales...'
              : 'Iniciar sesión'}
          </button>
        </form>

        <p>
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </section>
  );
}