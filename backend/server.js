// C:\Users\PC1\Desktop\wuensche-app-ui\backend\server.js

require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch').default; // <--- Diese Zeile ist entscheidend!
console.log('Type of fetch after require:', typeof fetch);


const app = express();
const port = process.env.PORT || 3001;
const dbPath = path.resolve(__dirname, 'database.sqlite');
const JWT_SECRET = process.env.JWT_SECRET;
const TMDB_API_READ_TOKEN = process.env.TMDB_API_READ_TOKEN; // TMDb API Key aus .env

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

// ⚠️ WICHTIG: CORS in Produktion einschränken!
app.use(cors());
app.use(express.json());

// --- Datenbank-Initialisierung (Schema angepasst!) ---
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Fehler beim Verbinden zur Datenbank:', err.message);
    } else {
        console.log('Verbunden mit der SQLite-Datenbank.');
        db.serialize(() => {
            // Users-Tabelle (Unverändert)
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`);

            // Wuensche-Tabelle (ERWEITERTES Schema!)
            db.run(`CREATE TABLE IF NOT EXISTS wuensche (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL, -- Foreign Key zu users.id
                tmdb_id INTEGER NOT NULL, -- TMDb ID
                tmdb_type TEXT NOT NULL, -- 'movie' oder 'tv'
                original_title TEXT NOT NULL, -- Originaltitel von TMDb
                release_year TEXT, -- Erscheinungsjahr/Startjahr von TMDb (kann null sein)
                poster_path TEXT, -- Poster-Pfad von TMDb (kann null sein)
                season_number TEXT, -- Staffelnummer (für TV, kann null oder 'alle Staffeln' sein)
                status TEXT DEFAULT 'Offen', -- 'Offen' oder 'Erledigt'
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )`, (err) => {
                 if (err) {
                     console.error('Fehler beim Erstellen/Aktualisieren der wuensche Tabelle:', err.message);
                     console.warn('ACHTUNG: Wenn die Tabelle bereits mit einem älteren Schema existiert, MUSS database.sqlite gelöscht werden!');
                 } else {
                     console.log('Wuensche Tabelle geprüft/erstellt.');
                     db.run(`CREATE INDEX IF NOT EXISTS idx_wuensche_user_id ON wuensche(user_id)`);
                     db.run(`CREATE INDEX IF NOT EXISTS idx_wuensche_status ON wuensche(status)`);
                 }
            });


            // Admin_users Tabelle (Unverändert)
            db.run(`CREATE TABLE IF NOT EXISTS admin_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )`, (err) => {
                if (err) {
                    console.error('Fehler beim Erstellen der admin_users Tabelle:', err.message);
                } else {
                    console.log('Admin_users Tabelle geprüft/erstellt.');
                    const defaultUsername = 'admin';
                    const defaultPassword = 'admin'; // ⚠️ NUR FÜR DEMO!
                    const saltRounds = 10;

                    db.get("SELECT id FROM admin_users WHERE username = ?", [defaultUsername], (err, row) => {
                        if (err) {
                             console.error('Fehler beim Prüfen auf Standard-Admin:', err.message);
                             return;
                        }
                        if (!row) {
                            bcrypt.hash(defaultPassword, saltRounds, (err, hash) => {
                                if (err) {
                                    console.error('Fehler beim Hashing des Standard-Admin-Passworts:', err.message);
                                    return;
                                }
                                db.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, [defaultUsername, hash], function(err) {
                                    if (err) {
                                        console.error('Fehler beim Hinzufügen des Standard-Admins:', err.message);
                                    } else {
                                        console.log(`Standard-Admin '${defaultUsername}' erfolgreich hinzugefügt.`);
                                    }
                                });
                            });
                        } else {
                             console.log(`Standard-Admin '${defaultUsername}' existiert bereits.`);
                        }
                    });
                }
            });
        });
    }
});

// --- Middleware zur User-Authentifizierung ---
const authenticateUser = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); // Kein Token
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT Verification Error (User):", err.message);
            return res.sendStatus(403); // Token ungültig
        }
        if (!user || !user.id || user.role !== 'user') {
             console.warn("JWT Verification Error (User): Token payload missing user info or incorrect role.");
             return res.sendStatus(403); // Payload nicht wie erwartet für User
        }
        req.user = user;
        next();
    });
};

// --- Middleware zur Admin-Authentifizierung ---
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.sendStatus(401); // Kein Token
    }

    jwt.verify(token, JWT_SECRET, (err, admin) => {
        if (err) {
            console.error("JWT Verification Error (Admin):", err.message);
            return res.sendStatus(403); // Token ungültig
        }
        if (!admin || !admin.id || admin.role !== 'admin') {
            console.warn("JWT Verification Error (Admin): Token payload missing admin info or incorrect role.");
             return res.sendStatus(403); // Payload nicht wie erwartet für Admin
        }
        req.admin = admin;
        next();
    });
};


// --- API Endpoints für normale Benutzer ---

// User Login (Unverändert)
app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT id, username, password FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) {
            console.error('Fehler beim Suchen des Users:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        if (!user) {
             console.warn(`User Login-Versuch fehlgeschlagen: User '${username}' nicht gefunden.`);
            return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Fehler beim Vergleichen der Passwörter (User):', err.message);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            if (!isMatch) {
                 console.warn(`User Login-Versuch fehlgeschlagen: Falsches Passwort für User '${username}'.`);
                return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
            }

            const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token, username: user.username });
        });
    });
});

// Wunsch erstellen (Benötigt User Auth, akzeptiert neue Felder)
app.post('/api/wishes', authenticateUser, (req, res) => {
    // Erwarte die neuen Felder vom Frontend
    const { tmdb_id, tmdb_type, original_title, release_year, poster_path, season_number } = req.body;
    const userId = req.user.id;

    // Prüfe, ob die notwendigen Felder vorhanden sind (mindestens die TMDb-Daten und Titel)
    if (!tmdb_id || !tmdb_type || !original_title) {
         console.warn('Ungültige Wunschdaten empfangen:', req.body);
        return res.status(400).json({ error: 'Ungültige Wunschdaten.' });
    }
    // Stelle sicher, dass type movie oder tv ist
    if (tmdb_type !== 'movie' && tmdb_type !== 'tv') {
         console.warn('Ungültiger tmdb_type empfangen:', tmdb_type);
        return res.status(400).json({ error: 'Ungültiger Medien-Typ.' });
    }
    // Für TV-Shows muss season_number vorhanden sein (kann aber leer sein oder 'alle Staffeln')
     if (tmdb_type === 'tv' && season_number === undefined) { // Prüfe auf undefined, da '' oder null gültig sein könnte
         console.warn('Staffelnummer fehlt für TV-Wunsch:', req.body);
         return res.status(400).json({ error: 'Staffelnummer ist für Serien erforderlich.' });
     }
     // Für Movies darf season_number NICHT gesetzt sein
     if (tmdb_type === 'movie' && season_number !== undefined && season_number !== null && season_number !== '') {
         console.warn('Staffelnummer bei Filmwunsch gesendet:', req.body);
          // Lasse es für den Moment zu, aber logge es als Warnung
          // return res.status(400).json({ error: 'Staffelnummer nicht für Filme erlaubt.' });
     }


    db.run(`INSERT INTO wuensche (user_id, tmdb_id, tmdb_type, original_title, release_year, poster_path, season_number, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
           [userId, tmdb_id, tmdb_type, original_title, release_year, poster_path, season_number || null, 'Offen'], // season_number null setzen, falls leer oder undefined
           function(err) {
        if (err) {
            console.error('Fehler beim Speichern des Wunsches:', err.message);
            return res.status(500).json({ error: err.message });
        }
         // Hole den gerade gespeicherten Wunsch inkl. Benutzername für die Response
        db.get(`SELECT w.id, w.tmdb_id, w.tmdb_type, w.original_title, w.release_year, w.poster_path, w.season_number, w.status, u.username as benutzer_bezeichner
                FROM wuensche w JOIN users u ON w.user_id = u.id WHERE w.id = ?`, [this.lastID], (err, wish) => {
            if (err) {
                 console.error('Fehler beim Abrufen des gespeicherten Wunsches:', err.message);
                 // Rückgabe mit minimalen Daten, falls Abruf fehlschlägt
                 return res.status(201).json({ id: this.lastID, message: 'Wunsch gespeichert, Details konnten nicht abgerufen werden.' });
            }
             res.status(201).json(wish); // Gib den vollen Wunsch zurück
        });
    });
});

// Wünsche des authentifizierten Benutzers abrufen (Benötigt User Auth, holt neue Felder)
app.get('/api/wishes/me', authenticateUser, (req, res) => {
    const userId = req.user.id;

    // Joint mit users Tabelle, um den Benutzernamen zu bekommen (für Konsistenz)
    db.all(`SELECT w.id, w.tmdb_id, w.tmdb_type, w.original_title, w.release_year, w.poster_path, w.season_number, w.status, u.username as benutzer_bezeichner
            FROM wuensche w
            JOIN users u ON w.user_id = u.id
            WHERE w.user_id = ?`,
           [userId], (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Benutzerwünsche:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});


// --- API Endpoint für TMDb Suche (Keine Auth nötig, da nur Proxy) ---
app.get('/api/search-tmdb', async (req, res) => {
    const query = req.query.query;
    if (!query) {
        return res.status(400).json({ error: 'Suchbegriff fehlt.' });
    }

    if (!TMDB_API_READ_TOKEN) {
         console.error("TMDB_API_READ_TOKEN ist nicht in der .env Datei gesetzt!");
         return res.status(500).json({ error: 'Serverfehler: API-Schlüssel fehlt.' });
    }

    const url = `${TMDB_API_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&language=de-DE`;

    try {
        const response = await fetch(url, { // <--- Hier ist der Aufruf
            headers: {
                'Authorization': `Bearer ${TMDB_API_READ_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`TMDb API Error: ${response.status} - ${response.statusText}`, errorBody);
            return res.status(response.status).json({ error: `Fehler beim Abrufen von TMDb (${response.status}).` });
        }

        const data = await response.json();

        const formattedResults = data.results
            .filter(item => (item.media_type === 'movie' || item.media_type === 'tv'))
            .map(item => ({
                tmdb_id: item.id,
                tmdb_type: item.media_type,
                original_title: item.media_type === 'movie' ? item.title : item.name,
                release_year: item.media_type === 'movie' ?
                              (item.release_date ? item.release_date.split('-')[0] : null) :
                              (item.first_air_date ? item.first_air_date.split('-')[0] : null),
                poster_path: item.poster_path,
            }));

        res.json(formattedResults);

    } catch (error) {
        console.error('Fehler bei TMDb-Suche:', error);
        res.status(500).json({ error: 'Interner Fehler bei TMDb-Suche.' });
    }
});


// --- API Endpoints für Administratoren (Benötigen Admin Auth) ---

// Admin Login (Unverändert)
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    db.get(`SELECT id, username, password FROM admin_users WHERE username = ?`, [username], (err, admin) => {
        if (err) {
            console.error('Fehler beim Suchen des Admin-Users:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        if (!admin) {
            console.warn(`Admin Login-Versuch fehlgeschlagen: Admin '${username}' nicht gefunden.`);
            return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
        }

        bcrypt.compare(password, admin.password, (err, isMatch) => {
            if (err) {
                console.error('Fehler beim Vergleichen der Passwörter (Admin):', err.message);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            if (!isMatch) {
                 console.warn(`Admin Login-Versuch fehlgeschlagen: Falsches Passwort für Admin '${username}'.`);
                return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
            }

            const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        });
    });
});

// Alle Wünsche abrufen (Admin UI) - Geschützt (holt neue Felder)
app.get('/api/admin/wishes', authenticateAdmin, (req, res) => {
    db.all(`SELECT w.id, w.tmdb_id, w.tmdb_type, w.original_title, w.release_year, w.poster_path, w.season_number, w.status, u.username as benutzer_bezeichner
            FROM wuensche w
            JOIN users u ON w.user_id = u.id`, [], (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen aller Wünsche (Admin):', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Wunschstatus aktualisieren (Admin UI) - Geschützt (Response angepasst)
app.put('/api/admin/wishes/:wishId', authenticateAdmin, (req, res) => {
    const wishId = req.params.wishId;
    const { status } = req.body;
    const statusToSet = 'Erledigt';

    if (!status || status !== statusToSet) {
        return res.status(400).json({ error: `Ungültiger oder fehlender Status. Nur '${statusToSet}' erlaubt.` });
    }

    db.run(`UPDATE wuensche SET status = ? WHERE id = ?`,
           [statusToSet, wishId], function(err) {
        if (err) {
            console.error(`Fehler beim Aktualisieren des Wunsches ${wishId}:`, err.message);
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Wunsch nicht gefunden.' });
        }
        // Lade den aktualisierten Wunsch inkl. Benutzername für die Response
         db.get(`SELECT w.id, w.tmdb_id, w.tmdb_type, w.original_title, w.release_year, w.poster_path, w.season_number, w.status, u.username as benutzer_bezeichner
                 FROM wuensche w JOIN users u ON w.user_id = u.id WHERE w.id = ?`, [wishId], (err, row) => {
            if (err) {
                 console.error(`Fehler beim Abrufen des aktualisierten Wunsches ${wishId}:`, err.message);
                 return res.json({ message: 'Wunschstatus aktualisiert (Details konnten nicht abgerufen werden).' });
            }
             res.json({ message: 'Wunsch erfolgreich aktualisiert.', updatedWish: row });
         });
    });
});

// Neuen ADMIN-Benutzer erstellen (Admin UI) - Geschützt (Unverändert)
app.post('/api/admin/admins', authenticateAdmin, (req, res) => {
     const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }

    const saltRounds = 10;
     bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Fehler beim Hashing des neuen Admin-Passworts:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }

        db.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) {
                if (err.errno === 19) {
                     console.warn(`Versuch, existierenden Admin-User '${username}' zu erstellen.`);
                     return res.status(409).json({ error: 'Benutzername existiert bereits.' });
                }
                console.error('Fehler beim Erstellen des neuen Admin-Users:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, username: username });
        });
    });
});

// Neuen NORMALEN Benutzer erstellen (Admin UI) - Geschützt (Unverändert)
app.post('/api/admin/users', authenticateAdmin, (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Fehler beim Hashing des neuen User-Passworts:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }

        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) {
                 if (err.errno === 19) {
                     console.warn(`Versuch, existierenden User '${username}' zu erstellen.`);
                     return res.status(409).json({ error: 'Benutzername existiert bereits.' });
                 }
                console.error('Fehler beim Erstellen des neuen User-Users:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, username: username });
        });
    });
});

// Statistiken abrufen (Admin UI) - Geschützt (holt Zählungen aus neuem Schema)
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
    db.get(`SELECT COUNT(*) AS total_wishes FROM wuensche`, [], (err, total) => {
        if (err) {
            console.error('Fehler beim Abrufen der Gesamtstatistik:', err.message);
            return res.status(500).json({ error: err.message });
        }
        db.get(`SELECT COUNT(*) AS open_wishes FROM wuensche WHERE status = 'Offen'`, [], (err, open) => {
            if (err) {
                console.error('Fehler beim Abrufen der Offen-Statistik:', err.message);
                return res.status(500).json({ error: err.message });
            }
             db.get(`SELECT COUNT(*) AS done_wishes FROM wuensche WHERE status = 'Erledigt'`, [], (err, done) => {
                 if (err) {
                     console.error('Fehler beim Abrufen der Erledigt-Statistik:', err.message);
                     return res.status(500).json({ error: err.message });
                 }
                 res.json({
                     total_wishes: total.total_wishes,
                     open_wishes: open.open_wishes,
                     done_wishes: done.done_wishes,
                 });
             });
        });
    });
});


// --- Frontend statische Dateien servieren ---
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendBuildPath));

app.get('*', (req, res) => {
     if (!req.path.startsWith('/api/')) {
         res.sendFile(path.join(frontendBuildPath, 'index.html'));
     } else {
         res.status(404).send('API endpoint not found');
     }
});


// --- Server starten ---
app.listen(port, () => {
    console.log(`Backend läuft auf http://localhost:${port}`);
    console.log(`Standard-Admin: Benutzername 'admin', Passwort 'admin' (⚠️ NUR FÜR DEMO!)`);
    console.log(`Frontend wird von ${frontendBuildPath} serviert (benötigt \`npm run build\` im frontend-Ordner),`);
    console.log(`alternativ Frontend separat starten (Vite) auf seinem eigenen Port (meist 3000).`);
     if (!TMDB_API_READ_TOKEN) {
         console.warn("⚠️ WARNUNG: TMDB_API_READ_TOKEN ist nicht in der .env Datei gesetzt. TMDb-Suche wird nicht funktionieren.");
     }
});