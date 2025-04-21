import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Optional for redirecting on auth failure

function AdminCreateAdminForm() { // Name changed
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [isLoading, setIsLoading] = useState(false); // Loading state


    // const navigate = useNavigate(); // For redirecting if auth fails

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setMessageType('');

        if (!username || !password) {
            setMessage('Bitte gib Benutzername und Passwort ein.');
            setMessageType('error');
            return;
        }

        setIsLoading(true);

        const token = localStorage.getItem('adminToken');

        if (!token) {
            setMessage('Kein Admin-Token gefunden. Bitte neu einloggen.');
            setMessageType('error');
             setIsLoading(false);
            // navigate('/admin');
            return;
        }

        try {
            const response = await fetch('/api/admin/admins', { // Endpoint changed
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminToken');
                 // Trigger App.jsx to update state if needed (or rely on route protection)
                setMessage('Authentifizierung fehlgeschlagen. Bitte neu einloggen.');
                setMessageType('error');
                 setIsLoading(false);
                // navigate('/admin');
                return;
            }

            if (!response.ok) {
                const errorData = await response.json();
                 // Specific message for duplicate username
                 if (response.status === 409) {
                     throw new Error(`Benutzername '${username}' existiert bereits.`);
                 }
                throw new Error(errorData.error || `Fehler (${response.status}): Admin-Benutzer ${username} konnte nicht erstellt werden.`);
            }

            const data = await response.json();
            setMessage(`Admin-Benutzer "${data.username}" erfolgreich erstellt!`);
            setMessageType('success');
            setUsername(''); // Formular zurücksetzen
            setPassword('');

        } catch (error) {
            console.error('Fehler beim Erstellen des Admin-Users:', error);
            setMessage(`Fehler beim Erstellen des Admin-Benutzers: ${error.message}`);
            setMessageType('error');
        } finally {
             setIsLoading(false);
        }
    };


    return (
         <div className="card admin-section">
            <h2>Neuen Admin-Benutzer erstellen</h2> {/* Updated Title */}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="new-admin-username">Benutzername:</label>
                    <input
                        type="text"
                        id="new-admin-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                <div>
                    <label htmlFor="new-admin-password">Passwort:</label>
                    <input
                        type="password"
                        id="new-admin-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                </div>
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Erstelle...' : 'Admin erstellen'}
                </button>
            </form>
             {message && (
                <div className={`message ${messageType}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

export default AdminCreateAdminForm;