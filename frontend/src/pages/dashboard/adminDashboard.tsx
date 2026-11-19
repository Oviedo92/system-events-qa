import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/auth-context';

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Administración de EVENTIA</h1>
        <p>Bienvenido, {user?.name}.</p>
        <p>Rol: Administrador</p>

        <p>Aquí se centralizará la administración de la plataforma.</p>

        <button onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </section>
  );
}