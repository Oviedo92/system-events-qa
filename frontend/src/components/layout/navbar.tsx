import { useState } from 'react';
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  UserRound,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/auth-context';
import type { UserRole } from '../../services/auth.service';

const dashboardByRole: Partial<Record<UserRole, string>> = {
  PROMOTER: '/promoter/dashboard',
  MODERATOR: '/moderator/dashboard',
  ADMIN: '/admin/dashboard',
};

const dashboardLabelByRole: Partial<Record<UserRole, string>> = {
  PROMOTER: 'Panel de promotor',
  MODERATOR: 'Panel de moderación',
  ADMIN: 'Panel de administración',
};

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const { user, isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();

  function closeMenus() {
    setMenuOpen(false);
    setProfileOpen(false);
  }

  async function handleLogout() {
    closeMenus();

    try {
      await signOut();
    } catch {
      // La sesión local debe limpiarse aunque falle la petición al backend.
    }

    navigate('/', { replace: true });
  }

  const dashboardPath = user ? dashboardByRole[user.role] : undefined;
  const dashboardLabel = user ? dashboardLabelByRole[user.role] : undefined;

  return (
    <header className="site-header">
      <nav className="navbar container" aria-label="Navegación principal">
        <Link
          className="brand"
          to="/"
          aria-label="EVENTIA, página de inicio"
          onClick={closeMenus}
        >
          <span className="brand-mark">
            <Ticket size={23} strokeWidth={2.2} />
          </span>

          <span className="brand-name">
            EVENT<span>IA</span>
          </span>
        </Link>

        <div className={`nav-links ${menuOpen ? 'is-open' : ''}`}>
          <Link className="nav-link" to="/#events" onClick={closeMenus}>
            Explorar eventos
          </Link>

          <Link className="nav-link" to="/#categorias" onClick={closeMenus}>
            Categorías
          </Link>

          {!isAuthenticated && (
            <Link
              className="nav-link"
              to="/#organizadores"
              onClick={closeMenus}
            >
              Para organizadores
            </Link>
          )}
        </div>

        <div className="nav-actions">
          {!isAuthenticated ? (
            <>
              <Link className="nav-link" to="/login" onClick={closeMenus}>
                Iniciar sesión
              </Link>

              <Link
                className="button button-coral"
                to="/register"
                onClick={closeMenus}
              >
                Registrarse <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              {user?.role === 'USER' && (
                <Link
                  to="/cart"
                  className="cart-trigger"
                  aria-label="Ir al carrito"
                  title="Mi carrito"
                  onClick={closeMenus}
                >
                  <ShoppingCart size={21} />
                  <span className="cart-label">Carrito</span>
                </Link>
              )}

              {dashboardPath && dashboardLabel && (
                <Link
                  className="button button-coral"
                  to={dashboardPath}
                  onClick={closeMenus}
                >
                  <LayoutDashboard size={17} />
                  {dashboardLabel}
                </Link>
              )}

              <div className="profile-menu">
                <button
                  type="button"
                  className="nav-link profile-trigger"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  onClick={() => setProfileOpen((current) => !current)}
                >
                  <UserRound size={19} />
                  <span>{user?.name ?? 'Mi cuenta'}</span>
                  <ChevronDown size={16} />
                </button>

                {profileOpen && (
                  <div className="profile-dropdown">
                    <div className="profile-dropdown-header">
                      <strong>{user?.name ?? 'Usuario'}</strong>
                      <p>{user?.email}</p>
                      <small>{user?.role}</small>
                    </div>

                    {dashboardPath && dashboardLabel && (
                      <Link to={dashboardPath} onClick={closeMenus}>
                        <LayoutDashboard size={17} />
                        {dashboardLabel}
                      </Link>
                    )}

                    <Link to="/account" onClick={closeMenus}>
                      <UserRound size={17} />
                      Mi cuenta
                    </Link>

                    {user?.role === 'USER' && (
                      <>
                        <Link to="/my-orders" onClick={closeMenus}>
                          <ShoppingBag size={17} />
                          Mis compras
                        </Link>

                        <Link to="/my-tickets" onClick={closeMenus}>
                          <Ticket size={17} />
                          Mis entradas
                        </Link>

                        <Link to="/my-reservations" onClick={closeMenus}>
                          <CalendarClock size={17} />
                          Mis reservas
                        </Link>

                        <Link to="/cart" onClick={closeMenus}>
                          <Package size={17} />
                          Mi carrito
                        </Link>
                      </>
                    )}

                    <div className="profile-dropdown-divider" />

                    <button type="button" onClick={handleLogout}>
                      <LogOut size={17} />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <button
            className="menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>
    </header>
  );
}