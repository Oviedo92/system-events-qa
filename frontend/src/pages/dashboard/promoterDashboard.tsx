import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';

export default function PromoterDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Panel del promotor</h1>
        <p>Bienvenido, {user?.name}.</p>
        <p>Rol: Promotor</p>

        <p>Desde aquí podrás gestionar tus eventos y publicaciones.</p>

        <button onClick={() => navigate('/events')}>
          Consultar eventos
        </button>

        <button onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}