# Security Policy

## Supported Versions

This project is actively maintained. Security updates will be provided for the latest version.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Features

### Authentication & Authorization
- **Password Hashing**: bcrypt with 10 salt rounds
- **JWT Tokens**: Secure token-based authentication with configurable expiry
- **Role-Based Access Control**: Separate user and admin roles
- **Password Strength Requirements**: Minimum 8 characters with letters and numbers

### API Security
- **Rate Limiting**: Multi-layer protection
  - General API: 100 requests per 15 minutes per IP
  - Authentication endpoints: 5 login attempts per 15 minutes per IP
  - Static files: 100 requests per minute per IP
- **Input Validation**: All endpoints validated with express-validator
- **Input Sanitization**: XSS prevention through sanitization
- **Request Size Limits**: 10kb limit to prevent payload attacks
- **CORS Configuration**: Environment-based origin restrictions

### Infrastructure Security
- **Helmet.js**: Security headers including:
  - Content Security Policy (CSP)
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security (HTTPS only)
- **SQL Injection Prevention**: Parameterized queries for all database operations
- **Error Handling**: Sanitized error messages in production

### Data Protection
- **Environment Variables**: Sensitive data stored in .env files (not in git)
- **Database**: Local SQLite with proper foreign key constraints
- **Logging**: Request logging with Morgan (sanitized in production)

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **Do NOT** open a public issue
2. Email the maintainer with details:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

3. You should receive a response within 48 hours
4. We will work with you to understand and validate the issue
5. A fix will be developed and deployed as quickly as possible
6. You will be credited in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices for Deployment

### Required Before Production Use

#### 1. Environment Configuration
```bash
# Generate a strong JWT secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set strong admin password
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!

# Configure production CORS origins
CORS_ORIGINS=https://yourdomain.com

# Set production environment
NODE_ENV=production
```

#### 2. HTTPS/TLS
This application MUST be deployed behind HTTPS in production. Use:
- nginx or Apache as reverse proxy with SSL/TLS certificates
- Let's Encrypt for free SSL certificates
- Enforce HTTPS redirects

Example nginx configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. Database Security
- Regular backups of `database.sqlite`
- Restrict file system permissions: `chmod 600 database.sqlite`
- Consider encrypting database at rest for sensitive deployments

#### 4. Firewall Configuration
- Only expose necessary ports (443 for HTTPS)
- Use firewall rules to restrict access
- Consider IP whitelisting for admin access

#### 5. Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update
npm audit fix
```

#### 6. Monitoring & Logging
- Set up log rotation for application logs
- Monitor for suspicious activity
- Set up alerts for failed login attempts
- Consider using tools like fail2ban for additional protection

### Additional Hardening for Internet Deployment

If deploying to the public internet, additionally implement:

1. **Enhanced Password Policies**
   - Require uppercase, lowercase, numbers, and special characters
   - Minimum 12 characters
   - Password expiry and rotation
   - Password history to prevent reuse

2. **Account Security**
   - Account lockout after multiple failed attempts
   - Email verification for new accounts
   - Two-factor authentication (2FA)
   - Password reset functionality with email verification

3. **Session Management**
   - Refresh tokens for long-lived sessions
   - Session invalidation on password change
   - Concurrent session limits

4. **Additional Security Headers**
   - HSTS preload
   - Permissions-Policy
   - Referrer-Policy

5. **CSRF Protection**
   - CSRF tokens for state-changing operations
   - SameSite cookie attributes

6. **Audit Logging**
   - Log all security-relevant events
   - User activity tracking
   - Admin action logging

7. **Database Hardening**
   - Consider PostgreSQL or MySQL instead of SQLite
   - Database user with minimal privileges
   - Connection encryption

8. **Content Security**
   - File upload validation (if implemented)
   - Rate limiting per user (not just per IP)
   - API versioning

## Known Limitations

### Current Scope
This application is designed for **local network deployment**. While it includes robust security features, it has the following limitations:

1. **SQLite Database**: Not recommended for high-concurrency production use
2. **No Email Integration**: Password reset requires manual admin intervention
3. **Basic Session Management**: No refresh tokens or session revocation
4. **No 2FA**: Two-factor authentication not implemented
5. **Limited Audit Logging**: Basic request logging only

### Acceptable Use Cases
✅ **Suitable for:**
- Home/family use on local network
- Small team deployments (< 20 users)
- Development and testing environments
- Internal corporate tools (behind VPN)

❌ **Not recommended for:**
- Public-facing internet deployments without additional hardening
- High-security environments requiring compliance (HIPAA, PCI-DSS, etc.)
- Multi-tenant SaaS applications
- High-traffic production systems

## Security Checklist

Before deploying to any environment, verify:

- [ ] Strong JWT_SECRET configured (32+ characters)
- [ ] Strong DEFAULT_ADMIN_PASSWORD configured
- [ ] CORS_ORIGINS properly configured for your domain
- [ ] NODE_ENV set to 'production'
- [ ] HTTPS/TLS configured (for non-local deployments)
- [ ] Firewall rules configured
- [ ] Database file permissions restricted
- [ ] Regular backup strategy in place
- [ ] npm audit shows no vulnerabilities
- [ ] Default admin password changed after first login
- [ ] Monitoring and logging configured
- [ ] .env file excluded from version control
- [ ] Error messages sanitized (production mode)

## Security Updates

Subscribe to security advisories:
1. Watch this repository on GitHub
2. Enable security alerts
3. Monitor the Issues page for security-related discussions

## Credits

Security improvements implemented following:
- OWASP Top 10 guidelines
- Node.js Security Best Practices
- Express.js Security Best Practices
- MDN Web Security Guidelines

## Contact

For security concerns, please contact the repository maintainer through GitHub.

---

**Last Updated**: 2025-11-06
**Version**: 1.0.0
