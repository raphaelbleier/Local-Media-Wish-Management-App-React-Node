import React, { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom'; // If you want to redirect on auth error

const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w92/'; // Oder w154, w185, etc.

function UserWishForm() {
  const [mediaType, setMediaType] = useState('movie'); // 'movie' or 'tv'
  const [searchTerm, setSearchTerm] = useState(''); // Input for search
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null); // Stores the selected TMDb item
  const [seasonNumber, setSeasonNumber] = useState(''); // Only for TV shows

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for submission

  const searchInputRef = useRef(null); // Ref for the search input
  const resultsRef = useRef(null); // Ref for the results dropdown

   // Handle clicks outside to close results
   useEffect(() => {
       const handleClickOutside = (event) => {
           if (searchInputRef.current && !searchInputRef.current.contains(event.target) &&
               resultsRef.current && !resultsRef.current.contains(event.target)) {
               setSearchResults([]); // Close results
           }
       };
       document.addEventListener("mousedown", handleClickOutside);
       return () => {
           document.removeEventListener("mousedown", handleClickOutside);
       };
   }, [searchInputRef, resultsRef]);


  // Effect to perform search with debounce
  useEffect(() => {
    if (searchTerm.length < 2 || selectedItem) { // Nur suchen, wenn mindestens 2 Zeichen und kein Item ausgewählt
      setSearchResults([]);
      setIsSearching(false);
      setSearchError('');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      setSearchError('');
      setMessage(''); // Clear general messages during search

      try {
        const response = await fetch(`/api/search-tmdb?query=${encodeURIComponent(searchTerm)}`);

        if (!response.ok) {
           const errorData = await response.json();
           throw new Error(errorData.error || `Fehler (${response.status}): Suche fehlgeschlagen`);
        }

        const data = await response.json();
        // Filter results by selected media type before displaying
        const filteredData = data.filter(item => item.tmdb_type === mediaType);

        setSearchResults(filteredData);
         if (filteredData.length === 0) {
             setSearchError('Keine passenden Ergebnisse gefunden.');
         }


      } catch (error) {
        console.error('Search Error:', error);
        setSearchError(`Fehler bei der Suche: ${error.message}`);
        setSearchResults([]); // Clear previous results on error
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(delayDebounceFn); // Cleanup timeout on each re-render or unmount
  }, [searchTerm, mediaType, selectedItem]); // Effect depends on searchTerm and mediaType

  // Reset selected item and season when media type changes
   useEffect(() => {
       setSelectedItem(null);
       setSeasonNumber('');
       setSearchTerm(''); // Clear search term on type change
        setSearchResults([]); // Clear search results
        setSearchError(''); // Clear search error
   }, [mediaType]);


  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setSearchTerm(item.original_title); // Set input text to selected title
    setSearchResults([]); // Hide results
    setSearchError(''); // Clear search error
    // Reset season number only if movie was selected
    if (item.tmdb_type === 'movie') {
        setSeasonNumber('');
    }
  };

   const handleClearSelection = () => {
       setSelectedItem(null);
       setSearchTerm(''); // Clear search input
       setSeasonResults([]); // Clear results again
       setSeasonNumber(''); // Clear season number
        setSearchError('');
   }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setMessageType('');

    if (!selectedItem) {
      setMessage('Bitte wähle einen Film oder eine Serie aus der Suche aus.');
      setMessageType('error');
      return;
    }

    // Zusätzliche Prüfung für Serien: Staffelnummer erforderlich
    if (mediaType === 'tv' && !seasonNumber) {
         setMessage('Bitte gib eine Staffelnummer für die Serie ein (z.B. "1" oder "alle Staffeln").');
         setMessageType('error');
         return;
    }
     // Stelle sicher, dass seasonNumber bei Filmen leer ist (Backend prüft auch)
     const seasonToSend = mediaType === 'tv' ? seasonNumber : null;


    setIsSubmitting(true);

    // Daten senden, die im Backend erwartet werden (neues Schema)
    const wishData = {
      tmdb_id: selectedItem.tmdb_id,
      tmdb_type: selectedItem.tmdb_type,
      original_title: selectedItem.original_title,
      release_year: selectedItem.release_year,
      poster_path: selectedItem.poster_path,
      season_number: seasonToSend,
    };

    const token = localStorage.getItem('userToken');

    if (!token) {
       setMessage('Nicht angemeldet. Bitte logge dich ein.');
       setMessageType('error');
       setIsSubmitting(false);
       // navigate('/'); // Optional: force redirect
       return;
    }

    try {
      const response = await fetch('/api/wishes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(wishData),
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
        throw new Error(errorData.error || `Fehler (${response.status}): Wunsch konnte nicht gespeichert werden.`);
      }

      const data = await response.json();
      setMessage(`Wunsch "${data.original_title}${data.season_number ? ' (Staffel ' + data.season_number + ')' : ''}" erfolgreich gespeichert!`); // Angepasste Erfolgsmeldung
      setMessageType('success');

      // Formular zurücksetzen nach Erfolg
      setMediaType('movie');
      setSearchTerm('');
      setSearchResults([]);
      setSelectedItem(null);
      setSeasonNumber('');


    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      setMessage(`Fehler beim Speichern des Wunsches: ${error.message}`);
      setMessageType('error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="card">
      <h2>Neuen Wunsch hinzufügen</h2>
      <form onSubmit={handleSubmit}>
        {/* Media Type Selection */}
        <div>
            <label htmlFor="mediaType">Typ:</label>
            <select
                id="mediaType"
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value)}
                disabled={isSubmitting || isSearching} // Disable while submitting or searching
            >
                <option value="movie">Film</option>
                <option value="tv">Serie</option>
            </select>
        </div>

        {/* Search Input with Autocomplete */}
        <div className="search-container"> {/* Container for relative positioning */}
          <label htmlFor="searchTerm">{mediaType === 'movie' ? 'Filmtitel' : 'Serientitel'} suchen:</label>
          <input
            type="text"
            id="searchTerm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Titel eingeben zum Suchen...`}
            ref={searchInputRef} // Attach ref
            autoComplete="off" // Disable browser autocomplete
            disabled={isSubmitting || isSearching || !!selectedItem} // Disable if submitting, searching, or item selected
          />
           {/* Loading or Error message for search */}
           {isSearching && <p style={{ margin: '5px 0', fontSize: '0.9em', color: 'var(--secondary-color)' }}>Sucht...</p>}
           {searchError && <div className="message error" style={{margin: '5px 0', padding: '5px'}}>{searchError}</div>}


          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="search-results" ref={resultsRef}> {/* Attach ref */}
              <ul>
                {searchResults.map((item) => (
                  <li key={item.tmdb_id} onClick={() => handleSelectItem(item)}>
                    {item.poster_path ? (
                        <img src={`${TMDB_POSTER_BASE_URL}${item.poster_path}`} alt={`${item.original_title} Poster`} className="search-result-poster" />
                    ) : (
                         <div className="search-result-poster"></div> // Placeholder div
                    )}
                    <div className="search-result-details">
                        <strong>{item.original_title}</strong>
                        <span>{item.release_year ? `(${item.release_year})` : ''}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Display Selected Item */}
        {selectedItem && (
            <div className="selected-item-display">
                 {selectedItem.poster_path ? (
                     <img src={`${TMDB_POSTER_BASE_URL}${selectedItem.poster_path}`} alt={`${selectedItem.original_title} Poster`} />
                 ) : (
                      <div style={{ width: '70px', height: '105px', backgroundColor: 'var(--tmdb-poster-placeholder-bg)', borderRadius: '4px' }}></div> // Larger placeholder
                 )}
                 <div className="selected-item-details">
                     <strong>{selectedItem.original_title}</strong>
                      <span>{selectedItem.release_year ? `(${selectedItem.release_year})` : ''} - {selectedItem.tmdb_type === 'movie' ? 'Film' : 'Serie'}</span>
                 </div>
                 <button type="button" onClick={handleClearSelection} style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--button-text-color)' }}>
                    Auswahl ändern
                 </button>
            </div>
        )}


        {/* Season Number Input (Conditional for TV Shows) */}
        {selectedItem && selectedItem.tmdb_type === 'tv' && (
          <div>
            <label htmlFor="seasonNumber">Staffelnummer (z.B. "1" oder "alle Staffeln"):</label>
            <input
              type="text"
              id="seasonNumber"
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value)}
              required // Require season number for TV
               disabled={isSubmitting}
            />
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" disabled={isSubmitting || !selectedItem || (mediaType === 'tv' && !seasonNumber)}>
            {isSubmitting ? 'Speichern...' : 'Wunsch speichern'}
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

export default UserWishForm;