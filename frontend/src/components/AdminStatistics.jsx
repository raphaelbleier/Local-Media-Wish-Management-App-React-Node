import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // Optional for redirecting on auth failure

function AdminStatistics() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // const navigate = useNavigate(); // For redirecting if auth fails

    const fetchStats = async () => {
        setError('');
        setLoading(true);
        const token = localStorage.getItem('adminToken');

         if (!token) {
             setError('Kein Admin-Token gefunden. Bitte neu einloggen.');
             setLoading(false);
             // navigate('/admin');
             return;
         }

        try {
            const response = await fetch('/api/admin/stats', { // Neuer Endpoint
                 headers: {
                    'Authorization': `Bearer ${token}`
                 }
            });

             if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('adminToken');
                 setError('Authentifizierung fehlgeschlagen. Bitte neu einloggen.');
                 setLoading(false);
                // navigate('/admin');
                return;
            }


            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Fehler (${response.status}): Statistiken konnten nicht geladen werden.`);
            }

            const data = await response.json();
            setStats(data);
            setLoading(false);

        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
            setError(`Fehler beim Laden der Statistiken: ${error.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        // Nur fetchen, wenn ein Token existiert (sollte durch ProtectedRoute sichergestellt sein)
         if (localStorage.getItem('adminToken')) {
            fetchStats();
         } else {
             setIsLoading(false);
             setError('Du musst als Admin angemeldet sein, um Statistiken zu sehen.');
         }
    }, []);


    if (loading) {
        return <div className="card admin-section">Lädt Statistiken...</div>;
    }

    if (error) {
        return <div className="card message error admin-section">{error}</div>;
    }

    if (!stats) {
         return <div className="card admin-section message info">Keine Statistiken verfügbar.</div>;
    }


    return (
        <div className="card admin-section">
            <h2>Statistiken</h2>
            <div className="admin-stats"> {/* CSS class for layout */}
                <div>
                    <h3>Gesamte Wünsche</h3>
                    <p>{stats.total_wishes}</p>
                </div>
                <div>
                    <h3>Offene Wünsche</h3>
                    <p>{stats.open_wishes}</p>
                </div>
                 <div>
                    <h3>Erledigte Wünsche</h3>
                    <p>{stats.done_wishes}</p>
                </div>
                {/* Durchschnittszeit (nicht implementiert) */}
                {/*
                 <div>
                     <h3>Durchschnittliche Erledigungszeit</h3>
                     <p>{stats.average_completion_time || 'N/A'}</p>
                 </div>
                */}
            </div>
        </div>
    );
}

export default AdminStatistics;