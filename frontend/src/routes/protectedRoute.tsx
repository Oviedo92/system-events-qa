import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import type { UserRole } from '../services/auth.service';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    const dashboardByRole: Record<UserRole, string> = {
      USER: '/',
      PROMOTER: '/promoter/dashboard',
      MODERATOR: '/moderator/dashboard',
      ADMIN: '/admin/dashboard',
    };

    return (
      <Navigate
        to={dashboardByRole[user.role]}
        replace
      />
    );
  }

  return <Outlet />;
}
