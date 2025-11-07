# Local Media Wish Management App

A secure, production-ready web application for managing movie and TV show wish lists with user authentication and TMDb integration. Designed for local network deployment with enterprise-grade security features.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)

## ✨ Features

### Core Functionality
- **User Authentication**: Secure login system with JWT tokens and bcrypt password hashing
- **Admin Dashboard**: Full administrative control with user management and statistics
- **TMDb Integration**: Search movies and TV shows with autocomplete, displaying covers, release years, and media types
- **Season Selection**: For TV shows, specify individual seasons or "all seasons"
- **Status Management**: Track wishes as "Open" or "Completed"
- **Statistics Dashboard**: View counts of open/completed/total wishes for administrators
- **Theme Toggle**: Light and dark mode support
- **Local Data Storage**: All data stored in a local SQLite database

### Security Features (NEW! 🔒)
- **Helmet.js**: Security headers (CSP, XSS protection, etc.)
- **Rate Limiting**: Protection against brute force attacks
  - General API: 100 requests per 15 minutes
  - Auth endpoints: 5 login attempts per 15 minutes
- **Input Validation**: Comprehensive validation using express-validator
- **Input Sanitization**: XSS prevention through input sanitization
- **Password Strength**: Enforced minimum 8 characters with letters and numbers
- **CORS Configuration**: Environment-based origin restrictions
- **Request Size Limits**: 10kb limit to prevent payload attacks
- **Parameterized Queries**: SQL injection prevention
- **Request Logging**: Morgan for production monitoring
- **Environment Validation**: Startup checks for required configuration

## 🛠 Technology Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | React 18 with Vite |
| **Backend** | Node.js with Express.js |
| **Database** | SQLite |
| **API** | The Movie Database (TMDb) API |
| **Security** | Helmet, Rate Limiting, JWT, bcrypt |

## 📋 Prerequisites

- **Node.js** (v20.x or higher) with npm - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **TMDb API Key** - Free registration at [themoviedb.org](https://www.themoviedb.org/)

## 🚀 Installation and Setup

### 1. Clone the Repository

```bash
git clone "https://github.com/raphaelbleier/Local-Media-Wish-Management-App-React-Node"
cd Local-Media-Wish-Management-App-React-Node
```

### 2. Obtain TMDb API Key

1. Register at [themoviedb.org](https://www.themoviedb.org/account/signup)
2. Navigate to Account Settings → API
3. Register a new Developer API
4. Copy your **API Read Access Token (v4 Auth)** (starts with `eyJhbGciOiJIUzI1NiI...`)

### 3. Backend Setup

```bash
cd backend
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

Create a `.env` file based on the example:

```bash
cp .env.example .env
```

Edit `.env` and configure the following **required** variables:

```env
# Generate a secure JWT secret (32+ characters recommended)
JWT_SECRET=your_secure_random_jwt_secret_here

# Your TMDb API Read Access Token
TMDB_API_READ_TOKEN=your_tmdb_api_token_here

# IMPORTANT: Set a secure admin password (not 'admin'!)
DEFAULT_ADMIN_PASSWORD=your_secure_admin_password
```

**Security Best Practices:**
- Generate a strong JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Use a password manager to generate DEFAULT_ADMIN_PASSWORD
- Never commit the `.env` file to version control

#### Optional Configuration

```env
# Server port (default: 3001)
PORT=3001

# Environment (development/production)
NODE_ENV=production

# CORS origins (comma-separated)
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=15

# JWT expiry
JWT_EXPIRY=24h
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

The frontend is pre-configured to proxy to `http://localhost:3001` during development (see `vite.config.js`).

## 🎯 Running the Application

### Development Mode

#### Start Backend (Terminal 1)

```bash
cd backend
npm start
# or for auto-reload: npm run dev
```

Expected output:
```
✅ Backend läuft auf http://localhost:3001
📝 Environment: development
🔒 Security features enabled: Helmet, Rate Limiting, Input Validation
```

#### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Vite will start on `http://localhost:3000` (or the next available port).

### Production Mode

#### Build Frontend

```bash
cd frontend
npm run build
```

#### Start Backend

```bash
cd backend
NODE_ENV=production npm start
```

The backend will serve the built frontend from `backend/../frontend/dist`.

### Access the Application

- **User Interface**: `http://localhost:3000` (dev) or `http://localhost:3001` (production)
- **Admin Interface**: `http://localhost:3000/admin`

## 👤 First Steps

### 1. Admin Login

Navigate to `/admin` and login with:
- **Username**: `admin`
- **Password**: Your `DEFAULT_ADMIN_PASSWORD` from `.env`

**⚠️ IMPORTANT**: Change the default admin password immediately by creating a new admin account!

### 2. Create Users

In the Admin Dashboard:
1. Navigate to "User erstellen" (Create User)
2. Create user accounts with secure passwords
3. Users must have passwords with:
   - Minimum 8 characters
   - At least one letter
   - At least one number

### 3. User Operations

1. Logout from admin
2. Login as a regular user at `/`
3. Search for movies/TV shows
4. Add wishes to your list

### 4. Admin Management

As admin, you can:
- View all user wishes
- Mark wishes as "Completed"
- View statistics (open/completed/total wishes)
- Create new users and admins

## 🌐 Local Network Access

To access from other devices on your network:

### 1. Find Your Local IP

**Windows:**
```bash
ipconfig
```

**macOS/Linux:**
```bash
ifconfig
# or
ip addr show
```

Look for your local IP (e.g., `192.168.1.100`)

### 2. Update CORS Configuration

Add your local IP to `backend/.env`:

```env
CORS_ORIGINS=http://localhost:3000,http://192.168.1.100:3001
```

### 3. Configure Firewall

Allow incoming connections on port 3001:

**Windows:**
```bash
netsh advfirewall firewall add rule name="Media Wish App" dir=in action=allow protocol=TCP localport=3001
```

**Linux (ufw):**
```bash
sudo ufw allow 3001/tcp
```

### 4. Access from Network Devices

Navigate to `http://192.168.1.100:3001` from other devices on your network.

## 🔒 Security Considerations

### For Local Network Use

This application includes enterprise-grade security features suitable for local network deployment:

✅ **Implemented Security**:
- Password hashing with bcrypt
- JWT authentication
- Rate limiting (brute force protection)
- Input validation and sanitization
- SQL injection prevention
- XSS protection via Helmet
- CORS configuration
- Request size limits
- Security headers

### For Production/Internet Deployment

**Additional requirements before internet exposure:**

❗ **Required**:
- [ ] HTTPS/TLS encryption (use nginx or similar reverse proxy)
- [ ] Environment-specific configuration
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitoring and alerting
- [ ] Enhanced password policies (uppercase, special characters)
- [ ] Session management improvements
- [ ] CSRF protection
- [ ] Account lockout after failed attempts
- [ ] Email verification for new users
- [ ] Audit logging
- [ ] Content Security Policy fine-tuning

### Dependency Security

Check for vulnerabilities regularly:

```bash
cd backend && npm audit
cd frontend && npm audit
```

Update dependencies:

```bash
npm audit fix
```

## 📁 Project Structure

```
Local-Media-Wish-Management-App-React-Node/
├── backend/
│   ├── server.js              # Main server file with security features
│   ├── package.json           # Backend dependencies
│   ├── .env.example           # Environment template
│   ├── .env                   # Your configuration (not in git)
│   └── database.sqlite        # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.jsx           # Main app component
│   │   └── main.jsx          # Entry point
│   ├── package.json          # Frontend dependencies
│   └── vite.config.js        # Vite configuration
└── README.md                 # This file
```

## 🐛 Troubleshooting

### Backend won't start

**Error: Missing environment variables**
```
❌ ERROR: Missing required environment variables: JWT_SECRET, TMDB_API_READ_TOKEN
```
**Solution**: Create `.env` file with required variables (see step 3)

### Database errors

**Error: Old schema detected**
```
ACHTUNG: Wenn die Tabelle bereits mit einem älteren Schema existiert...
```
**Solution**: Delete `database.sqlite` and restart the backend

### CORS errors in browser

**Error: Not allowed by CORS**
**Solution**: Add your frontend URL to `CORS_ORIGINS` in `.env`

### Rate limit errors

**Error: Too many requests**
**Solution**: Wait 15 minutes or adjust `RATE_LIMIT_MAX` in `.env`

### Admin login fails

**Check**: Using the password from `DEFAULT_ADMIN_PASSWORD` in `.env`?

## 📝 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/users/login` | User login | No |
| POST | `/api/admin/login` | Admin login | No |

### User Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/wishes/me` | Get current user's wishes | User |
| POST | `/api/wishes` | Create new wish | User |

### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/wishes` | Get all wishes | Admin |
| PUT | `/api/admin/wishes/:id` | Update wish status | Admin |
| POST | `/api/admin/users` | Create new user | Admin |
| POST | `/api/admin/admins` | Create new admin | Admin |
| GET | `/api/admin/stats` | Get statistics | Admin |

### Search Endpoint

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/search-tmdb?query=...` | Search TMDb | No |

## 🤝 Contributing

Contributions are welcome! Please ensure:
- Code follows existing style
- Security best practices are maintained
- All tests pass
- Documentation is updated

## 📄 License

ISC License - See package.json for details

## 👨‍💻 Author

Raphael Bleier

## 🙏 Acknowledgments

- [The Movie Database (TMDb)](https://www.themoviedb.org/) for the API
- [Express.js](https://expressjs.com/) for the backend framework
- [React](https://reactjs.org/) for the frontend framework
- [Helmet.js](https://helmetjs.github.io/) for security headers

## 📞 Support

For issues and questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review [GitHub Issues](https://github.com/raphaelbleier/Local-Media-Wish-Management-App-React-Node/issues)
3. Create a new issue with details about your problem

---

**⚠️ Security Notice**: This application is designed for local network use. While it includes robust security features, additional hardening is required before internet deployment. See [Security Considerations](#-security-considerations) for details.
