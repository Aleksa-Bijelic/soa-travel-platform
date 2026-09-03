import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Brand, Btn, Icon, ICONS } from './components';
import LoginPage from './pages/LoginPage';
import MyToursPage from './pages/MyToursPage';
import CreateTourPage from './pages/CreateTourPage';
import TourDetailPage from './pages/TourDetailPage';
import BrowseToursPage from './pages/BrowseToursPage';
import PublicTourDetailPage from './pages/PublicTourDetailPage';
import BlogsPage from './pages/BlogsPage';
import BlogDetailPage from './pages/BlogDetailPage';
import ProfilePage from './pages/ProfilePage';
import CartPage from './pages/CartPage';
import PurchasedToursPage from './pages/PurchasedToursPage';
import SimulatorPage from './pages/SimulatorPage';
import RegisterPage from './pages/RegisterPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ActiveTourPage from './pages/ActiveTourPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import SeatSelectionPage from './pages/SeatSelectionPage';
import MyReservationsPage from './pages/MyReservationsPage';
import CreateEventPage from './pages/CreateEventPage';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user?.role === 'guide' ? 'G' : user?.role === 'tourist' ? 'T' : user?.role === 'admin' ? 'A' : '?';

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div style={{ flex: 1 }}>
          <Brand />
        </div>
        <div className="nav-links" style={{ flex: 1, justifyContent: 'center' }}>
          {user?.role === 'guide' && (
            <>
              <NavLink to="/my-tours" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                My tours
              </NavLink>
              <NavLink to="/browse" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Browse
              </NavLink>
              <NavLink to="/events" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Events
              </NavLink>
            </>
          )}
          {user?.role === 'tourist' && (
            <>
              <NavLink to="/browse" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Browse tours
              </NavLink>
              <NavLink to="/events" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Events
              </NavLink>
              <NavLink to="/my-purchases" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                My purchases
              </NavLink>
              <NavLink to="/my-reservations" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Reservations
              </NavLink>
              <NavLink to="/simulator" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                Simulator
              </NavLink>
            </>
          )}
          {user?.role === 'admin' && (
                <NavLink to="/admin/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  Users
                </NavLink>
          )}
          <NavLink to="/blogs" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Blog
          </NavLink>
        </div>
        <div className="nav-right" style={{ flex: 1, justifyContent: 'flex-end' }}>
          {user?.role === 'tourist' && (
            <Btn variant="ghost" icon="cart" ariaLabel="Open cart" iconOnly onClick={() => navigate('/cart')} />
          )}
          <div className="nav-user">
            <span className="muted" style={{ fontSize: 13, cursor: 'pointer', fontWeight: 500 }} onClick={() => navigate(`/${user?.username}`)}>{user?.username}</span>
            <div className="avatar" onClick={() => navigate(`/${user?.username}`)}>{initials}</div>
          </div>
          <Btn variant="ghost" size="sm" icon="log" onClick={() => { logout(); navigate('/login'); }}>
            Sign out
          </Btn>
        </div>
      </div>
    </nav>
  );
}

function Layout() {
  return (
    <div className="app-shell">
      <Nav />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={
          <Navigate to={user?.role === 'guide' ? '/my-tours' : user?.role === 'admin' ? '/admin/users'  : '/browse'} replace />
        } />
        <Route path="my-tours" element={
          user?.role === 'guide' ? <MyToursPage /> : <Navigate to="/browse" replace />
        } />
        <Route path="tours/create" element={
          user?.role === 'guide' ? <CreateTourPage /> : <Navigate to="/browse" replace />
        } />
        <Route path="tours/:id" element={
          user?.role === 'guide' ? <TourDetailPage /> : <Navigate to="/browse" replace />
        } />

        <Route path="browse" element={<BrowseToursPage />} />
        <Route path="browse/:id" element={<PublicTourDetailPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/create" element={
          user?.role === 'guide' ? <CreateEventPage /> : <Navigate to="/events" replace />
        } />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="events/:id/seats" element={<SeatSelectionPage />} />
        <Route path="my-reservations" element={
          user?.role === 'tourist' ? <MyReservationsPage /> : <Navigate to="/events" replace />
        } />
        <Route path="blogs" element={<BlogsPage />} />
        <Route path="blogs/:id" element={<BlogDetailPage />} />
        <Route path="cart" element={
          user?.role === 'tourist' ? <CartPage /> : <Navigate to="/browse" replace />
        } />
        <Route path="my-purchases" element={
          user?.role === 'tourist' ? <PurchasedToursPage /> : <Navigate to="/browse" replace />
        } />
        <Route path="simulator" element={
          user?.role === 'tourist' ? <SimulatorPage /> : <Navigate to="/browse" replace />
        } />
        <Route path="admin/users" element={
          user?.role === 'admin' ? <AdminUsersPage /> : <Navigate to="/" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path=":username" element={<ProfilePage />} />
      </Route>

      <Route path="tours/:tourId/run/:executionId" element={
        user?.role === 'tourist' ? <ActiveTourPage /> : <Navigate to="/browse" replace />
       } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
