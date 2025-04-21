import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
   const [isLoading, setIsLoading] = useState(false); // Loading state

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target after login
  const from = location.state?.from?.pathname || "/admin/wishes";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error
    setIsLoading(true); // Start loading

    try {
      const response = await fetch('/api/admin/login', { // Endpoint bleibt gleich
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Admin Login fehlgeschlagen (${response.status})`);
      }

      const data = await response.json();
      localStorage.setItem('adminToken', data.token); // Token speichern
      onLoginSuccess(data.token); // Inform parent component (pass token if needed)
      navigate(from, { replace: true }); // Redirect to intended page or default

    } catch (error) {
      console.error('Admin Login Error:', error);
      setError(error.message);
    } finally {
        setIsLoading(false); // End loading
    }
  };

  return (
    <div className="card admin-login-card"> {/* Add classes */}
      <h2>Admin Login</h2>
      <p>Standard Benutzer/Passwort (NUR FÜR DEMO): <code>admin</code> / <code>admin</code></p>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="admin-username">Benutzername:</label>
          <input
            type="text"
            id="admin-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="admin-password">Passwort:</label>
          <input
            type="password"
            id="admin-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
             disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <div className="message error" style={{marginTop: '15px'}}>{error}</div>}
    </div>
  );
}

export default AdminLogin;