import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // Optional for redirecting on auth failure

const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92/'; // Oder w154, w185, etc.

function UserWishList() {
  const [wishes, setWishes] = useState([]);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'
  const [isLoading, setIsLoading] = useState(true);

  // const navigate = useNavigate(); // For redirecting if auth fails

  const fetchMyWishes = async () => {
    setMessage('');
    setMessageType('');
    setWishes([]);

    setIsLoading(true);

    const token = localStorage.getItem('userToken');

     if (!token) {
        setMessage('Nicht angemeldet. Bitte logge dich ein.');
        setMessageType('error');
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/wishes/me', {
           headers: {
              'Authorization': `Bearer ${token}`
           }
      });

      if (response.status === 401 || response.status === 403) {
           localStorage.removeItem('userToken');
           localStorage.removeItem('username');
           setMessage('Sitzung abgelaufen oder ungültig. Bitte neu anmelden.');
           setMessageType('error');
            // Optional: force redirect
           // navigate('/');
           return;
      }


      if (!response.ok) {
        const errorData = await response.json();
         throw new Error(errorData.error || `Fehler (${response.status}): Deine Wünsche konnten nicht geladen werden.`);
      }

      const data = await response.json();
      setWishes(data);

      if (data.length === 0) {
          setMessage(`Du hast noch keine Wünsche eingetragen.`);
          setMessageType('info');
      } else {
           setMessage('');
           setMessageType('');
      }

    } catch (error) {
      console.error('Fehler beim Abrufen:', error);
      setMessage(`Fehler beim Abrufen deiner Wünsche: ${error.message}`);
      setMessageType('error');
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      if (localStorage.getItem('userToken')) {
          fetchMyWishes();
      } else {
           setIsLoading(false);
           setMessage('Du musst angemeldet sein, um deine Wünsche zu sehen.');
           setMessageType('error');
      }

  }, []);


  const username = localStorage.getItem('username') || 'Benutzer';

  return (
    <div className="card">
      <h2>Meine Wünsche für "{username}"</h2>

       {message && (
           <div className={`message ${messageType}`}>
               {message}
           </div>
       )}

      {isLoading && <p>Lädt deine Wünsche...</p>}

      {!isLoading && wishes.length > 0 && (
          <ul>
            {wishes.map((wish) => (
              <li key={wish.id} className="wish-item"> {/* Use wish-item class */}
                 <div className="wish-item-content"> {/* Container for poster and text */}
                     {wish.poster_path ? (
                          <img src={`${TMDB_POSTER_BASE_URL}${wish.poster_path}`} alt={`${wish.original_title} Poster`} className="wish-item-poster" />
                     ) : (
                          <div className="wish-item-poster"></div> // Placeholder div
                     )}
                     <div className="wish-item-details"> {/* Container for stacked text */}
                        <strong>{wish.original_title}</strong>
                        <span>
                           {wish.tmdb_type === 'movie' ? 'Film' : 'Serie'}
                           {wish.release_year ? ` (${wish.release_year})` : ''}
                           {wish.tmdb_type === 'tv' && wish.season_number ? ` | Staffel: ${wish.season_number}` : ''}
                        </span>
                     </div>
                 </div>
                <span> {/* Status badge */}
                    Status:
                     <span className={`status-badge status-${wish.status.toLowerCase()}`}>
                        {wish.status}
                    </span>
                </span>
              </li>
            ))}
          </ul>
      )}
    </div>
  );
}

export default UserWishList;