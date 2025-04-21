import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // Optional for redirecting on auth failure

const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92/'; // Oder w154, w185, etc.

function AdminWishList() {
  const [wishes, setWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
   const [updateMessage, setUpdateMessage] = useState(null);
   // state, um die ID des aktuell aktualisierten Wunsches zu speichern
   const [updatingWishId, setUpdatingWishId] = useState(null); // <-- Dieser State verfolgt die ID korrekt

//   const navigate = useNavigate(); // For redirecting if auth fails

  const fetchAllWishes = async () => {
    setError('');
    setUpdateMessage(null);
    setLoading(true);
    const token = localStorage.getItem('adminToken');

    if (!token) {
        setError('Kein Admin-Token gefunden. Bitte neu einloggen.');
        setLoading(false);
        // navigate('/admin'); // Uncomment if you want to auto-redirect
        return;
    }

    try {
      const response = await fetch('/api/admin/wishes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
           localStorage.removeItem('adminToken');
           // Trigger App.jsx to update state if needed (or rely on route protection)
           setError('Authentifizierung fehlgeschlagen. Bitte neu einloggen.');
           setLoading(false);
           // navigate('/admin');
           return;
      }

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || `Fehler (${response.status}): Wünsche konnten nicht geladen werden.`);
      }

      const data = await response.json();
      setWishes(data);
      setLoading(false);

       if (data.length === 0) {
            if (!error) {
                 setUpdateMessage({ text: 'Keine Wünsche im System gefunden.', type: 'info' });
            }
       } else {
           setUpdateMessage(null);
       }


    } catch (error) {
      console.error('Fehler beim Laden der Wünsche (Admin):', error);
      setError(`Fehler beim Laden der Wünsche: ${error.message}`);
      setLoading(false);
    }
  };

  useEffect(() => {
     if (localStorage.getItem('adminToken')) {
        fetchAllWishes();
     } else {
         setLoading(false);
         setError('Du musst als Admin angemeldet sein, um alle Wünsche zu sehen.');
     }

  }, []);

  const handleMarkAsDone = async (wishIdToUpdate) => { // <-- Parameter Name geändert zur Klarheit
      setUpdateMessage(null);
      setUpdatingWishId(wishIdToUpdate); // Setze den State mit der ID des zu aktualisierenden Wunsches

      const token = localStorage.getItem('adminToken');

       if (!token) {
          setUpdateMessage({ text: 'Kein Admin-Token gefunden. Bitte neu einloggen.', type: 'error' });
           setUpdatingWishId(null);
          // navigate('/admin');
          return;
      }

      try {
          const response = await fetch(`/api/admin/wishes/${wishIdToUpdate}`, { // <-- Hier wishIdToUpdate verwenden
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status: 'Erledigt' })
          });

          if (response.status === 401 || response.status === 403) {
              localStorage.removeItem('adminToken');
              setUpdateMessage({ text: 'Authentifizierung fehlgeschlagen. Bitte neu einloggen.', type: 'error' });
               setUpdatingWishId(null);
              // navigate('/admin');
              return;
          }


          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Fehler (${response.status}): Wunsch ${wishIdToUpdate} konnte nicht aktualisiert werden.`);
          }

          const data = await response.json();

          if (data && data.updatedWish) {
               setWishes(prevWishes =>
                   prevWishes.map(wish =>
                       wish.id === wishIdToUpdate ? data.updatedWish : wish // <-- Hier wishIdToUpdate verwenden
                   )
               );
               setUpdateMessage({ text: `Wunsch "${data.updatedWish.original_title}" als 'Erledigt' markiert.`, type: 'success' });
          } else {
               fetchAllWishes();
               setUpdateMessage({ text: `Wunsch ${wishIdToUpdate} Status aktualisiert (Liste wird neu geladen).`, type: 'success' });
          }


      } catch (error) {
          console.error(`Fehler beim Aktualisieren von Wunsch ${wishIdToUpdate}:`, error);
          setUpdateMessage({ text: `Fehler beim Aktualisieren: ${error.message}`, type: 'error' });
      } finally {
           setUpdatingWishId(null); // Setze den State zurück, wenn Aktualisierung abgeschlossen ist
      }
  };


  if (loading) {
    return <div className="card admin-section">Lädt Wünsche...</div>;
  }

  if (error && wishes.length === 0) {
     return <div className="card message error admin-section">{error}</div>;
  }


  return (
    <div className="card admin-section">
      <h2>Alle Wünsche (Admin)</h2>
       {updateMessage && (
            <div className={`message ${updateMessage.type}`}>
                {updateMessage.text}
            </div>
        )}
       {error && wishes.length > 0 && (
            <div className="message error">{error}</div>
       )}

      {wishes.length === 0 ? (
          !error && <p className="message info">Keine Wünsche gefunden.</p>
      ) : (
          <ul>
            {wishes.map((wish) => ( // <-- Hier ist 'wish' die Variable für das aktuelle Element
              <li key={wish.id} className="admin-wish-item">
                 <div className="wish-item-content">
                     {wish.poster_path ? (
                          <img src={`${TMDB_POSTER_BASE_URL}${wish.poster_path}`} alt={`${wish.original_title} Poster`} className="wish-item-poster" />
                     ) : (
                          <div className="wish-item-poster"></div>
                     )}
                     <div className="wish-item-details">
                        <strong>{wish.original_title}</strong>
                        <span>
                           {wish.tmdb_type === 'movie' ? 'Film' : 'Serie'}
                           {wish.release_year ? ` (${wish.release_year})` : ''}
                           {wish.tmdb_type === 'tv' && wish.season_number ? ` | Staffel: ${wish.season_number}` : ''}
                        </span>
                         <span>gewünscht von: {wish.benutzer_bezeichner}</span>
                     </div>
                 </div>
                <span>
                    Status:
                     <span className={`status-badge status-${wish.status.toLowerCase()}`}>
                        {wish.status}
                    </span>
                </span>

                {wish.status === 'Offen' && (
                  <button
                    onClick={() => handleMarkAsDone(wish.id)} // <-- Richtig: wish.id an die Funktion übergeben
                    disabled={updatingWishId === wish.id || loading} // <-- Richtig: updatingWishId mit wish.id vergleichen
                  >
                    {updatingWishId === wish.id ? 'Erledige...' : 'Erledigen'} {/* <-- Richtig: updatingWishId mit wish.id vergleichen */}
                  </button>
                )}
              </li>
            ))}
          </ul>
      )}
    </div>
  );
}

export default AdminWishList;