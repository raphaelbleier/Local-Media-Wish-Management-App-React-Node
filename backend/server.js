// backend/server.js

require('dotenv').config();

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch').default;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, query, param, validationResult } = require('express-validator');
const morgan = require('morgan');

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'TMDB_API_READ_TOKEN'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error(`❌ ERROR: Missing required environment variables: ${missingEnvVars.join(', ')}`);
    console.error('Please create a .env file based on .env.example');
    process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;
const dbPath = path.resolve(__dirname, 'database.sqlite');
const JWT_SECRET = process.env.JWT_SECRET;
const TMDB_API_READ_TOKEN = process.env.TMDB_API_READ_TOKEN;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3';

// Security: Helmet for security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https://image.tmdb.org"],
        },
    },
}));

// Security: CORS configuration based on environment
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = process.env.CORS_ORIGINS
            ? process.env.CORS_ORIGINS.split(',')
            : ['http://localhost:3000', 'http://localhost:5173'];
        
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Security: Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15', 10) * 60 * 1000, // 15 minutes default
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Security: Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login requests per windowMs
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
});

// Logging
if (isProduction) {
    app.use(morgan('combined'));
} else {
    app.use(morgan('dev'));
}

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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
                    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin'; // Allow override via env
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

// --- Helper Functions ---

// Password validation
const validatePassword = (password) => {
    // Minimum 8 characters, at least one letter and one number
    const minLength = 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return password.length >= minLength && hasLetter && hasNumber;
};

// Validation error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array().map(err => err.msg)
        });
    }
    next();
};

// Sanitize string to prevent XSS - using validator's escape
const sanitizeString = (str) => {
    if (!str) return str;
    // Remove < > and other potentially dangerous characters
    return str
        .replace(/[<>'"&]/g, (char) => {
            const escapeMap = {
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#x27;',
                '&': '&amp;'
            };
            return escapeMap[char] || char;
        })
        .trim();
};

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

// User Login with validation and rate limiting
app.post('/api/users/login', 
    authLimiter,
    [
        body('username').trim().isLength({ min: 1, max: 50 }).withMessage('Username is required and must be between 1-50 characters'),
        body('password').isLength({ min: 1 }).withMessage('Password is required')
    ],
    handleValidationErrors,
    (req, res) => {
    const { username, password } = req.body;
    const sanitizedUsername = sanitizeString(username);

    db.get(`SELECT id, username, password FROM users WHERE username = ?`, [sanitizedUsername], (err, user) => {
        if (err) {
            console.error('Fehler beim Suchen des Users:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        if (!user) {
             console.warn('User Login-Versuch fehlgeschlagen: Benutzer nicht gefunden');
            return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Fehler beim Vergleichen der Passwörter (User):', err.message);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            if (!isMatch) {
                 console.warn('User Login-Versuch fehlgeschlagen: Falsches Passwort');
                return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
            }

            const token = jwt.sign({ id: user.id, username: user.username, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
            res.json({ token, username: user.username });
        });
    });
});

// Wunsch erstellen (with validation)
app.post('/api/wishes', 
    authenticateUser,
    [
        body('tmdb_id').isInt({ min: 1 }).withMessage('Valid TMDb ID is required'),
        body('tmdb_type').isIn(['movie', 'tv']).withMessage('Type must be movie or tv'),
        body('original_title').trim().isLength({ min: 1, max: 500 }).withMessage('Title is required and must be between 1-500 characters'),
        body('release_year').optional().trim().isLength({ max: 10 }),
        body('poster_path').optional().trim().isLength({ max: 500 }),
        body('season_number').optional().trim().isLength({ max: 50 })
    ],
    handleValidationErrors,
    (req, res) => {
    const { tmdb_id, tmdb_type, original_title, release_year, poster_path, season_number } = req.body;
    const userId = req.user.id;

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(original_title);
    const sanitizedYear = release_year ? sanitizeString(release_year) : null;
    const sanitizedSeason = season_number ? sanitizeString(season_number) : null;

    // Additional business logic validation
    if (tmdb_type === 'tv' && season_number === undefined) {
        console.warn('Staffelnummer fehlt für TV-Wunsch (user_id:', userId, ')');
        return res.status(400).json({ error: 'Staffelnummer ist für Serien erforderlich.' });
    }

    db.run(`INSERT INTO wuensche (user_id, tmdb_id, tmdb_type, original_title, release_year, poster_path, season_number, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
           [userId, tmdb_id, tmdb_type, sanitizedTitle, sanitizedYear, poster_path, sanitizedSeason, 'Offen'],
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


// --- API Endpoint für TMDb Suche with validation ---
app.get('/api/search-tmdb', 
    [query('query').trim().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1-100 characters')],
    handleValidationErrors,
    async (req, res) => {
    const searchQuery = req.query.query;
    const sanitizedQuery = sanitizeString(searchQuery);

    if (!TMDB_API_READ_TOKEN) {
         console.error("TMDB_API_READ_TOKEN ist nicht in der .env Datei gesetzt!");
         return res.status(500).json({ error: 'Serverfehler: API-Schlüssel fehlt.' });
    }

    const url = `${TMDB_API_BASE_URL}/search/multi?query=${encodeURIComponent(sanitizedQuery)}&language=de-DE`;

    try {
        const response = await fetch(url, {
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

// Admin Login with validation and rate limiting
app.post('/api/admin/login',
    authLimiter,
    [
        body('username').trim().isLength({ min: 1, max: 50 }).withMessage('Username is required and must be between 1-50 characters'),
        body('password').isLength({ min: 1 }).withMessage('Password is required')
    ],
    handleValidationErrors,
    (req, res) => {
    const { username, password } = req.body;
    const sanitizedUsername = sanitizeString(username);

    db.get(`SELECT id, username, password FROM admin_users WHERE username = ?`, [sanitizedUsername], (err, admin) => {
        if (err) {
            console.error('Fehler beim Suchen des Admin-Users:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }
        if (!admin) {
            console.warn('Admin Login-Versuch fehlgeschlagen: Administrator nicht gefunden');
            return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
        }

        bcrypt.compare(password, admin.password, (err, isMatch) => {
            if (err) {
                console.error('Fehler beim Vergleichen der Passwörter (Admin):', err.message);
                return res.status(500).json({ error: 'Interner Serverfehler' });
            }
            if (!isMatch) {
                 console.warn('Admin Login-Versuch fehlgeschlagen: Falsches Passwort');
                return res.status(401).json({ error: 'Benutzername oder Passwort falsch' });
            }

            const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
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

// Neuen ADMIN-Benutzer erstellen with validation and password strength
app.post('/api/admin/admins', 
    authenticateAdmin,
    [
        body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3-50 characters'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .custom(value => {
                if (!validatePassword(value)) {
                    throw new Error('Password must contain at least one letter and one number');
                }
                return true;
            })
    ],
    handleValidationErrors,
    (req, res) => {
    const { username, password } = req.body;
    const sanitizedUsername = sanitizeString(username);

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Fehler beim Hashing des neuen Admin-Passworts:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }

        db.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, [sanitizedUsername, hash], function(err) {
            if (err) {
                if (err.errno === 19) {
                     console.warn(`Versuch, existierenden Admin-User '${sanitizedUsername}' zu erstellen.`);
                     return res.status(409).json({ error: 'Benutzername existiert bereits.' });
                }
                console.error('Fehler beim Erstellen des neuen Admin-Users:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, username: sanitizedUsername });
        });
    });
});

// Neuen NORMALEN Benutzer erstellen with validation and password strength
app.post('/api/admin/users', 
    authenticateAdmin,
    [
        body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3-50 characters'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .custom(value => {
                if (!validatePassword(value)) {
                    throw new Error('Password must contain at least one letter and one number');
                }
                return true;
            })
    ],
    handleValidationErrors,
    (req, res) => {
    const { username, password } = req.body;
    const sanitizedUsername = sanitizeString(username);

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hash) => {
        if (err) {
            console.error('Fehler beim Hashing des neuen User-Passworts:', err.message);
            return res.status(500).json({ error: 'Interner Serverfehler' });
        }

        db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [sanitizedUsername, hash], function(err) {
            if (err) {
                 if (err.errno === 19) {
                     console.warn(`Versuch, existierenden User '${sanitizedUsername}' zu erstellen.`);
                     return res.status(409).json({ error: 'Benutzername existiert bereits.' });
                 }
                console.error('Fehler beim Erstellen des neuen User-Users:', err.message);
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, username: sanitizedUsername });
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

// Rate limiter for static files
const staticFileLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per minute for static files
    message: 'Too many requests for static files, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(express.static(frontendBuildPath, { maxAge: '1d' }));

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ error: 'CORS policy: Origin not allowed' });
    }
    
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ error: 'Request entity too large' });
    }
    
    res.status(500).json({ 
        error: isProduction ? 'Internal server error' : err.message 
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Catch-all for frontend routes with rate limiting
app.get('*', staticFileLimiter, (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
});


// --- Server starten ---
app.listen(port, () => {
    console.log(`✅ Backend läuft auf http://localhost:${port}`);
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🔒 Security features enabled: Helmet, Rate Limiting, Input Validation`);
    console.log(`⚠️  Standard-Admin: Benutzername 'admin' (Change password immediately!)`);
    console.log(`📁 Frontend wird von ${frontendBuildPath} serviert`);
    console.log(`   (benötigt \`npm run build\` im frontend-Ordner,`);
    console.log(`   alternativ Frontend separat starten mit \`npm run dev\`)`);
    if (!process.env.DEFAULT_ADMIN_PASSWORD) {
        console.warn("⚠️  DEFAULT_ADMIN_PASSWORD not set, using 'admin' as default");
    }
});