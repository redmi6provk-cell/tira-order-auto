# Deployment Guide

Production deployment instructions for the Tira Order Automation System.

---

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Ubuntu 20.04 LTS | Ubuntu 22.04 LTS |
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Storage** | 20 GB | 50+ GB SSD |
| **Network** | 10 Mbps | 100+ Mbps |

### Software Requirements

- **Python:** 3.11 or higher
- **Node.js:** 20.x LTS or higher
- **PostgreSQL:** 14 or higher
- **Nginx:** 1.18 or higher (for reverse proxy)
- **PM2:** Latest (for process management)

---

## Installation Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3.11 python3.11-venv python3-pip
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y nginx
sudo apt install -y git curl

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

---

### 2. PostgreSQL Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE tira_automation;
CREATE USER tira_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tira_automation TO tira_admin;
\q

# Configure PostgreSQL for remote access (if needed)
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

### 3. Clone Repository

```bash
# Create application directory
sudo mkdir -p /var/www/tira-automation
sudo chown $USER:$USER /var/www/tira-automation

# Clone repository
cd /var/www/tira-automation
git clone <repository-url> .
```

---

### 4. Backend Deployment

```bash
cd /var/www/tira-automation/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
playwright install-deps

# Create .env file
nano .env
```

**Production .env:**
```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000

# Database
DATABASE_URL=postgresql+asyncpg://tira_admin:your_secure_password@localhost:5432/tira_automation

# Automation Settings
MAX_CONCURRENT_BROWSERS=5
DEFAULT_DELAY_MIN=2.0
DEFAULT_DELAY_MAX=5.0
HEADLESS_MODE=true
BROWSER_TIMEOUT=60000

# Logging
LOG_LEVEL=INFO

# Tira Website
TIRA_BASE_URL=https://www.tirabeauty.com

# Security
SECRET_KEY=your_super_secret_jwt_key_here
```

```bash
# Initialize database
python scripts/init_db.py

# Test backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# Press Ctrl+C to stop
```

---

### 5. Frontend Deployment

```bash
cd /var/www/tira-automation/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Test production build
npm start
# Press Ctrl+C to stop
```

---

### 6. Process Management with PM2

#### Backend PM2 Configuration

Create `backend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'tira-backend',
    script: 'venv/bin/uvicorn',
    args: 'app.main:app --host 0.0.0.0 --port 8000 --workers 4',
    cwd: '/var/www/tira-automation/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/var/www/tira-automation/backend/logs/pm2-error.log',
    out_file: '/var/www/tira-automation/backend/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

#### Frontend PM2 Configuration

Create `frontend/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'tira-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/tira-automation/frontend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/tira-automation/frontend/logs/pm2-error.log',
    out_file: '/var/www/tira-automation/frontend/logs/pm2-out.log'
  }]
};
```

#### Start Services

```bash
# Start backend
cd /var/www/tira-automation/backend
pm2 start ecosystem.config.js

# Start frontend
cd /var/www/tira-automation/frontend
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed
```

---

### 7. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/tira-automation`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tira-automation /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

### 8. SSL/TLS with Let's Encrypt (Optional but Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

---

## Monitoring & Maintenance

### PM2 Monitoring

```bash
# View all processes
pm2 list

# View logs
pm2 logs tira-backend
pm2 logs tira-frontend

# Monitor resources
pm2 monit

# Restart services
pm2 restart tira-backend
pm2 restart tira-frontend

# Stop services
pm2 stop tira-backend
pm2 stop tira-frontend
```

### Database Backup

Create `/var/www/tira-automation/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/tira-automation"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U tira_admin -d tira_automation > $BACKUP_DIR/db_backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_backup_$DATE.sql

# Delete backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql.gz"
```

```bash
# Make executable
chmod +x /var/www/tira-automation/scripts/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /var/www/tira-automation/scripts/backup.sh
```

### Log Rotation

Create `/etc/logrotate.d/tira-automation`:

```
/var/www/tira-automation/backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}

/var/www/tira-automation/frontend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Security Hardening

### Firewall (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow PostgreSQL (only from localhost)
sudo ufw allow from 127.0.0.1 to any port 5432

# Check status
sudo ufw status
```

### Fail2Ban (Optional)

```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## Environment Variables

**Never commit .env files to git!**

Production environment variables should be:
- Stored securely (e.g., AWS Secrets Manager, HashiCorp Vault)
- Rotated regularly
- Access-controlled

---

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer:** Nginx or HAProxy
2. **Multiple Backend Instances:** Run on different ports
3. **Database:** PostgreSQL primary + read replicas
4. **Shared Storage:** For logs and data files

### Vertical Scaling

- Increase server resources (CPU, RAM)
- Optimize database queries
- Add database indexes
- Enable caching (Redis)

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
pm2 logs tira-backend

# Check if port is in use
sudo lsof -i :8000

# Check database connection
psql -U tira_admin -d tira_automation -h localhost
```

### Frontend Won't Start

```bash
# Check logs
pm2 logs tira-frontend

# Rebuild
cd /var/www/tira-automation/frontend
npm run build

# Check if port is in use
sudo lsof -i :3000
```

### Database Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Rollback Procedure

```bash
# Stop services
pm2 stop all

# Restore database backup
gunzip /var/backups/tira-automation/db_backup_YYYYMMDD_HHMMSS.sql.gz
psql -U tira_admin -d tira_automation < /var/backups/tira-automation/db_backup_YYYYMMDD_HHMMSS.sql

# Checkout previous version
cd /var/www/tira-automation
git checkout <previous-commit-hash>

# Reinstall dependencies
cd backend && pip install -r requirements.txt
cd ../frontend && npm install && npm run build

# Restart services
pm2 restart all
```

---

## Updates & Upgrades

```bash
# Pull latest code
cd /var/www/tira-automation
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
pm2 restart tira-backend

# Update frontend
cd ../frontend
npm install
npm run build
pm2 restart tira-frontend
```

---

**Last Updated:** February 2026
