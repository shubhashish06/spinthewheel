# Quick AWS Deployment Guide

Fast 5-step guide for deploying Spin the Wheel on AWS.

## Prerequisites Checklist

- [ ] AWS Account
- [ ] EC2 Instance launched (Ubuntu 22.04)
- [ ] RDS PostgreSQL instance created
- [ ] Security groups configured
- [ ] Domain name (optional but recommended)

## Quick Start (5 Steps)

### 1. Connect to EC2

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### 2. Run Initial Setup

```bash
# Upload aws-setup.sh to EC2, then:
chmod +x aws-setup.sh
./aws-setup.sh
```

This installs:
- Node.js 20.x
- PM2 (process manager)
- Nginx (reverse proxy)
- Git
- Certbot (SSL)
- PostgreSQL client

### 3. Upload Application

**Option A: Using Git**
```bash
cd ~
git clone YOUR_REPO_URL spinthewheel
cd spinthewheel
```

**Option B: Using SCP (from your local machine)**
```bash
scp -i your-key.pem -r . ubuntu@YOUR_EC2_IP:~/spinthewheel/
```

### 4. Configure Environment

```bash
cd ~/spinthewheel/backend
cp .env.example .env
nano .env
```

Update with your RDS credentials:
```env
PORT=3001
NODE_ENV=production
DB_HOST=your-rds-endpoint.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spinthewheel
DB_USER=postgres
DB_PASSWORD=your-secure-password
DATABASE_SSL=true
SESSION_SECRET=$(openssl rand -hex 32)
```

### 5. Deploy

```bash
cd ~/spinthewheel
chmod +x deploy-aws.sh
./deploy-aws.sh
```

This will:
- Install all dependencies
- Build all frontend applications
- Start application with PM2
- Set up PM2 startup script

## Configure Domain & SSL

1. **Point DNS to EC2 IP**
   - Add A record: `yourdomain.com` → `YOUR_EC2_IP`
   - Add A record: `www.yourdomain.com` → `YOUR_EC2_IP`

2. **Update Nginx Config**
   ```bash
   sudo nano /etc/nginx/sites-available/spinthewheel
   # Replace 'yourdomain.com' with your actual domain
   sudo ln -s /etc/nginx/sites-available/spinthewheel /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. **Get SSL Certificate**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

## Verify Deployment

After deployment, verify all URLs work:

- ✅ **Superadmin**: `https://yourdomain.com/superadmin`
- ✅ **Instance Admin**: `https://yourdomain.com/admin?id=DEFAULT`
- ✅ **Mobile Form**: `https://yourdomain.com/play/?id=DEFAULT`
- ✅ **Signage Display**: `https://yourdomain.com/signage?id=DEFAULT`
- ✅ **API**: `https://yourdomain.com/api/signage/DEFAULT`

## Post-Deployment Setup

### 1. Create First Instance

1. Go to: `https://yourdomain.com/superadmin`
2. Click "+ Create New Instance"
3. Enter:
   - ID: `DEFAULT` (or your preferred ID)
   - Location Name: "Main Display"
4. Click "Create Instance"

### 2. Configure Instance

1. Go to: `https://yourdomain.com/admin?id=DEFAULT`
2. Customize outcomes, background, etc.
3. Test the game flow

### 3. Set Up Signage Display

1. Open: `https://yourdomain.com/signage?id=DEFAULT`
2. Set to fullscreen
3. Configure kiosk mode if needed

## Common Issues

### Database Connection Failed
- Check RDS security group allows EC2 security group
- Verify credentials in `.env`
- Test: `psql -h RDS_ENDPOINT -U postgres -d spinthewheel`

### 502 Bad Gateway
- Check PM2: `pm2 status`
- Check logs: `pm2 logs`
- Verify backend is running: `curl http://localhost:3001/api/signage/DEFAULT`

### SSL Certificate Issues
- Ensure DNS is pointing to EC2
- Check port 80 is open for Let's Encrypt validation
- Verify domain in Nginx config matches certificate

### Instance Not Found
- Create instances in superadmin first
- Verify instance ID spelling (case-sensitive)
- Check instance is active in superadmin

## Useful Commands

```bash
# View application logs
pm2 logs

# Restart application
pm2 restart all

# Check application status
pm2 status

# View Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Next Steps

1. Create additional instances in superadmin
2. Customize each instance (outcomes, background)
3. Set up monitoring (CloudWatch)
4. Configure automated backups
5. Set up CI/CD pipeline (optional)

## Production Checklist

- [ ] All instances created in superadmin
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Firewall rules configured
- [ ] PM2 startup configured
- [ ] Nginx configured correctly
- [ ] All URLs tested and working
