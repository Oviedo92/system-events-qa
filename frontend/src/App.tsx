import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import './App.css';

import Navbar from './components/layout/navbar';
import Footer from './components/layout/footer';

import HomePage from './pages/home/homepage';
import LoginPage from './pages/auth/loginPage';
import RegisterPage from './pages/auth/registerPage';

import CartPage from './pages/cart/cartPage';
import EventsPage from './pages/events/eventsPage';
import EventDetailPage from './pages/events/eventDetailPage';
import TicketsPage from './pages/tickets/ticketsPage';

import { AuthProvider } from './contexts/authContext';
import ProtectedRoute from './routes/protectedRoute';

import PromoterDashboard from './pages/dashboard/promoterDashboard';
import ModeratorDashboard from './pages/dashboard/moderadorDashboard';
import AdminDashboard from './pages/dashboard/adminDashboard';

import PromoterApplicationPage from './pages/promoter/promoterApplicationPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="site-shell">
          <Navbar />

          <main>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              <Route path="/events" element={<EventsPage />} />
              <Route
                path="/events/:slug"
                element={<EventDetailPage />}
              />
              <Route
                path="/events/:slug/tickets"
                element={<TicketsPage />}
              />
              <Route path="/cart" element={<CartPage />} />

              {/* Rutas exclusivas para PROMOTER */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['PROMOTER']} />
                }
              >
                <Route
                  path="/promoter/dashboard"
                  element={<PromoterDashboard />}
                />
              </Route>

              {/* Rutas exclusivas para MODERATOR */}
              <Route
                element={
                  <ProtectedRoute allowedRoles={['MODERATOR']} />
                }
              >
                <Route
                  path="/moderator/dashboard"
                  element={<ModeratorDashboard />}
                />
              </Route>

              {/* Rutas exclusivas para ADMIN */}
              <Route
                element={<ProtectedRoute allowedRoles={['ADMIN']} />}
              >
                <Route
                  path="/admin/dashboard"
                  element={<AdminDashboard />}
                />
              </Route>

              <Route
                path="/promoter/application"
                element={<PromoterApplicationPage />}
              />

              {/* Ruta desconocida */}
              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />
            </Routes>
          </main>

          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}