import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import UserLogin from './components/UserLogin'; // Neue User Login Komponente
import UserWishForm from './components/UserWishForm';
import UserWishList from './components/UserWishList';
import AdminLogin from './components/AdminLogin';
import AdminWishList from './components/AdminWishList';
import AdminCreateAdminForm from './components/AdminCreateAdminForm'; // Umbenannt
import AdminCreateUserForm from './components/AdminCreateUserForm'; // Neu
import AdminStatistics from './components/AdminStatistics'; // Neu
import ThemeToggle from './components/ThemeToggle';


function App() {
  // Status für User-Auth und Admin-Auth
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  const location = useLocation();

  // Check authentication status from localStorage on app load
  useEffect(() => {
      const userToken = localStorage.getItem('userToken');
      const adminToken = localStorage.getItem('adminToken');

      // Simplistic token validation: just check if token exists.
      // In a real app, you would verify the token's validity with the backend.
      if (userToken) {
          setIsUserAuthenticated(true);
      }
      if (adminToken) {
          setIsAdminAuthenticated(true);
      }
  }, []);

  // --- Handlers for Auth State Changes ---
  const handleUserLogin = (token, username) => {
    localStorage.setItem('userToken', token);
    localStorage.setItem('username', username); // Store username for display
    setIsUserAuthenticated(true);
    // console.log('User logged in');
  };

  const handleUserLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('username');
    setIsUserAuthenticated(false);
    // console.log('User logged out');
    // No auto-redirect here, App component doesn't navigate
  };

  const handleAdminLogin = (token) => {
    localStorage.setItem('adminToken', token);
    setIsAdminAuthenticated(true);
    // console.log('Admin logged in');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAdminAuthenticated(false);
    // console.log('Admin logged out');
     // No auto-redirect here
  };


  // --- Protected Route Components ---
  const ProtectedUserRoute = ({ element }) => {
      // If admin is logged in, they are NOT a regular user for user-only routes
      if (isAdminAuthenticated) return <Navigate to="/admin/wishes" replace />;
      return isUserAuthenticated ? element : <Navigate to="/" state={{ from: location }} replace />;
  };

   const ProtectedAdminRoute = ({ element }) => {
     // If user is logged in, they are NOT an admin for admin-only routes
     if (isUserAuthenticated) return <Navigate to="/user/wishes" replace />; // Or another user landing page
     return isAdminAuthenticated ? element : <Navigate to="/admin" state={{ from: location }} replace />;
   };


  return (
    <div>
      <h1>Film- und Serienwünsche</h1>

      <nav>
        {/* Navigation Links */}
        {isUserAuthenticated ? (
            <>
                {/* Links for logged-in regular user */}
                 <Link to="/user/add-wish">Wunsch hinzufügen</Link>
                 <Link to="/user/my-wishes">Meine Wünsche</Link>
                 {/* Display username */}
                 <span>Hallo, {localStorage.getItem('username') || 'Benutzer'}</span>
                 <button onClick={handleUserLogout} className="nav-logout-button" style={{ backgroundColor: 'var(--button-logout-bg)', color: 'var(--button-text-color)' }}>Logout</button>
            </>
        ) : isAdminAuthenticated ? (
             <>
                {/* Links for logged-in admin */}
                <Link to="/admin/wishes">Alle Wünsche</Link>
                <Link to="/admin/stats">Statistiken</Link>
                <Link to="/admin/create-user">User erstellen</Link>
                <Link to="/admin/create-admin">Admin erstellen</Link> {/* Link to create new admins */}
                 <button onClick={handleAdminLogout} className="nav-logout-button" style={{ backgroundColor: 'var(--button-logout-bg)', color: 'var(--button-text-color)' }}>Logout</button>
             </>
        ) : (
            <>
                {/* Links for logged-out users */}
                 <Link to="/">User Login</Link>
                 <Link to="/admin">Admin Login</Link>
            </>
        )}
         {/* Theme Toggle is always visible */}
        <ThemeToggle />
      </nav>

      {/* Router Definition */}
      <Routes>
        {/* Landing page: User Login if not authenticated, otherwise redirect */}
        <Route path="/" element={isUserAuthenticated ? <Navigate to="/user/add-wish" replace /> : isAdminAuthenticated ? <Navigate to="/admin/wishes" replace /> : <UserLogin onLoginSuccess={handleUserLogin} />} />

        {/* User Routes (Protected) */}
        <Route path="/user/add-wish" element={<ProtectedUserRoute element={<UserWishForm />} />} />
        <Route path="/user/my-wishes" element={<ProtectedUserRoute element={<UserWishList />} />} />

        {/* Admin Login Route */}
        {/* Redirect if admin is already logged in */}
        <Route path="/admin" element={isAdminAuthenticated ? <Navigate to="/admin/wishes" replace /> : isUserAuthenticated ? <Navigate to="/user/add-wish" replace /> : <AdminLogin onLoginSuccess={handleAdminLogin} />} />


        {/* Admin Routes (Protected) */}
        <Route path="/admin/wishes" element={<ProtectedAdminRoute element={<AdminWishList />} />} />
        <Route path="/admin/stats" element={<ProtectedAdminRoute element={<AdminStatistics />} />} />
        <Route path="/admin/create-user" element={<ProtectedAdminRoute element={<AdminCreateUserForm />} />} /> {/* Route for creating normal users */}
         <Route path="/admin/create-admin" element={<ProtectedAdminRoute element={<AdminCreateAdminForm />} />} /> {/* Route for creating admins */}


        {/* Fallback or Redirect for any other path */}
         {/* If authenticated as user, go to user area */}
         {isUserAuthenticated ? (
             <Route path="*" element={<Navigate to="/user/add-wish" replace />} />
         ) : isAdminAuthenticated ? (
            // If authenticated as admin, go to admin area
             <Route path="*" element={<Navigate to="/admin/wishes" replace />} />
         ) : (
            // If not authenticated, go to login page
             <Route path="*" element={<Navigate to="/" replace />} />
         )}

      </Routes>
    </div>
  );
}

export default App;