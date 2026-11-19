import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';

export default function ModeratorDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Panel de moderación</h1>
        <p>Bienvenido, {user?.name}.</p>
        <p>Rol: Moderador</p>

        <p>Aquí se gestionarán las solicitudes y revisiones de EVENTIA.</p>

        <button onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}