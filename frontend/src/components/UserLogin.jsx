import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function UserLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
   const [isLoading, setIsLoading] = useState(false); // Loading state

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect target after login
  const from = location.state?.from?.pathname || "/user/add-wish";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous error
    setIsLoading(true); // Start loading

    try {
      const response = await fetch('/api/users/login', { // Neuer Endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Login fehlgeschlagen (${response.status})`);
      }

      const data = await response.json();
      onLoginSuccess(data.token, data.username); // Inform parent component and pass token/username
      navigate(from, { replace: true }); // Redirect to intended page or default

    } catch (error) {
      console.error('User Login Error:', error);
      setError(error.message);
    } finally {
        setIsLoading(false); // End loading
    }
  };

  return (
    <div className="card user-login-card"> {/* Add classes */}
      <h2>User Login</h2>
      <p>Bitte melde dich mit deinem Benutzernamen an (wird vom Admin erstellt).</p>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="user-username">Benutzername:</label>
          <input
            type="text"
            id="user-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="user-password">Passwort:</label>
          <input
            type="password"
            id="user-password"
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

export default UserLogin;