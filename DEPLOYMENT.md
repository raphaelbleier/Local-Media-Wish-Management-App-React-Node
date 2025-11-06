# Deployment Guide

This guide provides instructions for deploying the Local Media Wish Management App in different environments.

## Table of Contents

- [Development Deployment](#development-deployment)
- [Local Network Deployment](#local-network-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment-optional)
- [Troubleshooting](#troubleshooting)

## Development Deployment

For local development and testing.

### Prerequisites
- Node.js 20.x or higher
- npm or yarn
- Git

### Steps

1. **Clone and Setup**
   ```bash
   git clone https://github.com/raphaelbleier/Local-Media-Wish-Management-App-React-Node.git
   cd Local-Media-Wish-Management-App-React-Node
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

3. **Configure Environment**
   Edit `backend/.env`:
   ```env
   JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   TMDB_API_READ_TOKEN=your_tmdb_token
   DEFAULT_ADMIN_PASSWORD=DevPassword123
   NODE_ENV=development
   ```

4. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

5. **Start Development Servers**
   
   Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```
   
   Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Admin: http://localhost:3000/admin

## Local Network Deployment

For deployment on a home/office local network.

### Prerequisites
- All development prerequisites
- Static IP or hostname for the server
- Router/firewall access

### Steps

1. **Complete Development Setup** (Steps 1-4 above)

2. **Find Your Local IP**
   
   Windows:
   ```cmd
   ipconfig
   ```
   
   Linux/Mac:
   ```bash
   hostname -I
   # or
   ip addr show
   ```
   
   Example output: `192.168.1.100`

3. **Update Environment Configuration**
   Edit `backend/.env`:
   ```env
   NODE_ENV=production
   CORS_ORIGINS=http://192.168.1.100:3001,http://localhost:3000
   PORT=3001
   ```

4. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

5. **Configure Firewall**
   
   Windows:
   ```cmd
   netsh advfirewall firewall add rule name="Media Wish App" dir=in action=allow protocol=TCP localport=3001
   ```
   
   Linux (ufw):
   ```bash
   sudo ufw allow 3001/tcp
   ```
   
   Linux (firewalld):
   ```bash
   sudo firewall-cmd --permanent --add-port=3001/tcp
   sudo firewall-cmd --reload
   ```

6. **Start Production Server**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

7. **Access from Network**
   - From any device on the network: `http://192.168.1.100:3001`
   - Admin interface: `http://192.168.1.100:3001/admin`

### Optional: Run as System Service

#### Linux (systemd)

Create `/etc/systemd/system/media-wish-app.service`:
```ini
[Unit]
Description=Media Wish Management App
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/Local-Media-Wish-Management-App-React-Node/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable media-wish-app
sudo systemctl start media-wish-app
sudo systemctl status media-wish-app
```

#### Windows (nssm)

1. Download NSSM: https://nssm.cc/download
2. Install as service:
   ```cmd
   nssm install MediaWishApp "C:\Program Files\nodejs\node.exe" "C:\path\to\backend\server.js"
   nssm set MediaWishApp AppDirectory "C:\path\to\backend"
   nssm set MediaWishApp AppEnvironmentExtra NODE_ENV=production
   nssm start MediaWishApp
   ```

## Production Deployment

For public internet deployment. **⚠️ Requires additional security hardening!**

### Prerequisites
- Linux server (Ubuntu 20.04+ recommended)
- Domain name with DNS configured
- Root or sudo access
- All development prerequisites

### Architecture
```
Internet → Nginx (443) → Node.js App (3001) → SQLite
         HTTPS/TLS
```

### Steps

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### 2. Application Setup

```bash
# Create app user
sudo useradd -r -s /bin/bash -d /opt/media-wish-app media-wish-app

# Clone repository
sudo git clone https://github.com/raphaelbleier/Local-Media-Wish-Management-App-React-Node.git /opt/media-wish-app
sudo chown -R media-wish-app:media-wish-app /opt/media-wish-app

# Install dependencies
cd /opt/media-wish-app/backend
sudo -u media-wish-app npm install --production

cd /opt/media-wish-app/frontend
sudo -u media-wish-app npm install
sudo -u media-wish-app npm run build
```

#### 3. Environment Configuration

```bash
# Generate secure secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ADMIN_PASSWORD=$(openssl rand -base64 32)

# Create .env
sudo -u media-wish-app tee /opt/media-wish-app/backend/.env << EOF
JWT_SECRET=$JWT_SECRET
TMDB_API_READ_TOKEN=your_tmdb_token
DEFAULT_ADMIN_PASSWORD=$ADMIN_PASSWORD
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_MAX=50
JWT_EXPIRY=12h
EOF

# Secure permissions
sudo chmod 600 /opt/media-wish-app/backend/.env
```

**⚠️ Save the ADMIN_PASSWORD securely!**

#### 4. SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com

# Certificate will auto-renew
sudo certbot renew --dry-run
```

#### 5. Nginx Configuration

Create `/etc/nginx/sites-available/media-wish-app`:
```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=app_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/m;

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Configuration (managed by certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/media-wish-app-access.log;
    error_log /var/log/nginx/media-wish-app-error.log;

    # Rate limiting
    limit_req zone=app_limit burst=20 nodelay;

    # Login endpoint - stricter rate limiting
    location /api/users/login {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/admin/login {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy to Node.js
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/media-wish-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Systemd Service

Create `/etc/systemd/system/media-wish-app.service`:
```ini
[Unit]
Description=Media Wish Management App
After=network.target

[Service]
Type=simple
User=media-wish-app
WorkingDirectory=/opt/media-wish-app/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=media-wish-app

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/media-wish-app/backend

# Environment
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable media-wish-app
sudo systemctl start media-wish-app
sudo systemctl status media-wish-app
```

#### 7. Monitoring and Maintenance

**View Logs:**
```bash
# Application logs
sudo journalctl -u media-wish-app -f

# Nginx logs
sudo tail -f /var/log/nginx/media-wish-app-access.log
sudo tail -f /var/log/nginx/media-wish-app-error.log
```

**Backup Script:**
Create `/opt/media-wish-app/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/opt/media-wish-app/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /opt/media-wish-app/backend/database.sqlite "$BACKUP_DIR/database_$DATE.sqlite"

# Keep only last 30 days
find $BACKUP_DIR -name "database_*.sqlite" -mtime +30 -delete
```

Make executable and add to cron:
```bash
sudo chmod +x /opt/media-wish-app/backup.sh
sudo crontab -e
# Add: 0 2 * * * /opt/media-wish-app/backup.sh
```

## Docker Deployment (Optional)

Coming soon. For now, use the standard deployment methods above.

## Troubleshooting

### Backend won't start

**Check logs:**
```bash
sudo journalctl -u media-wish-app -n 50
```

**Common issues:**
- Missing environment variables → Check `.env` file
- Port already in use → Change PORT in `.env`
- Database errors → Delete `database.sqlite` and restart

### Cannot access from network

**Check firewall:**
```bash
sudo ufw status
sudo firewall-cmd --list-all
```

**Check if app is listening:**
```bash
sudo netstat -tulpn | grep :3001
```

**Check CORS configuration:**
- Ensure client URL is in `CORS_ORIGINS`

### SSL/HTTPS issues

**Check certificate:**
```bash
sudo certbot certificates
```

**Renew certificate:**
```bash
sudo certbot renew
```

### High CPU/Memory usage

**Check processes:**
```bash
top
htop
```

**Restart service:**
```bash
sudo systemctl restart media-wish-app
```

### Database locked errors

SQLite is single-write. For high concurrency, consider:
- Upgrading to PostgreSQL or MySQL
- Implementing connection pooling
- Adding read replicas

## Performance Optimization

### 1. Enable Compression

In nginx config:
```nginx
gzip on;
gzip_vary on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

### 2. Cache Static Files

Already configured with 1-day max-age in the app.

### 3. PM2 Process Manager

For better process management:
```bash
npm install -g pm2
pm2 start server.js --name media-wish-app
pm2 save
pm2 startup
```

### 4. Database Optimization

Add indexes (already included in schema):
```sql
CREATE INDEX IF NOT EXISTS idx_wuensche_user_id ON wuensche(user_id);
CREATE INDEX IF NOT EXISTS idx_wuensche_status ON wuensche(status);
```

## Security Hardening

See [SECURITY.md](SECURITY.md) for comprehensive security guidelines.

Key points:
- [ ] Use HTTPS (Let's Encrypt)
- [ ] Strong passwords (32+ characters)
- [ ] Regular updates (`npm audit`)
- [ ] Firewall configuration
- [ ] Regular backups
- [ ] Log monitoring
- [ ] Rate limiting (configured in nginx + app)

## Support

For deployment issues:
1. Check [README.md](README.md) troubleshooting section
2. Review application logs
3. Check [GitHub Issues](https://github.com/raphaelbleier/Local-Media-Wish-Management-App-React-Node/issues)
4. Open a new issue with deployment details

---

**Last Updated**: 2025-11-06
