# AWS Deployment Guide

Complete guide for deploying the Spin the Wheel application on AWS.

## Architecture Overview

### Recommended AWS Services

1. **EC2 Instance** - Application server (Ubuntu 22.04 LTS recommended)
2. **RDS PostgreSQL** - Managed database service
3. **Application Load Balancer** (optional) - For high availability
4. **Route 53** (optional) - DNS management
5. **ACM (AWS Certificate Manager)** - SSL/TLS certificates
6. **S3 + CloudFront** (optional) - Static asset hosting

### Minimum Requirements

- **EC2 Instance**: t3.small or larger (2 vCPU, 2GB RAM minimum)
- **RDS**: db.t3.micro (for development) or db.t3.small (for production)
- **Storage**: 20GB+ for EC2, 20GB+ for RDS

## Prerequisites

1. AWS Account with appropriate permissions
2. Domain name (optional but recommended)
3. SSH key pair for EC2 access
4. Basic knowledge of AWS services

## Step 1: Set Up RDS PostgreSQL Database

### Create RDS Instance

1. Go to AWS RDS Console
2. Click "Create database"
3. Choose:
   - **Engine**: PostgreSQL
   - **Version**: 14.x or 15.x
   - **Template**: Free tier (dev) or Production
   - **DB Instance Identifier**: `spinthewheel-db`
   - **Master Username**: `postgres` (or your choice)
   - **Master Password**: Set a strong password
   - **DB Instance Class**: db.t3.micro (dev) or db.t3.small (prod)
   - **Storage**: 20GB, General Purpose SSD
   - **VPC**: Default or your VPC
   - **Public Access**: Yes (or configure VPC security groups)
   - **Security Group**: Create new or use existing
   - **Database Name**: `spinthewheel`

4. Note the **Endpoint** URL (e.g., `spinthewheel-db.xxxxx.us-east-1.rds.amazonaws.com`)

### Configure Security Group

1. Go to EC2 → Security Groups
2. Find your RDS security group
3. Add inbound rule:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Your EC2 security group (or 0.0.0.0/0 for testing)

## Step 2: Launch EC2 Instance

### Create EC2 Instance

1. Go to EC2 Console → Launch Instance
2. Configure:
   - **Name**: `spin-the-wheel-server`
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t3.small (or larger)
   - **Key Pair**: Select or create new
   - **Network Settings**: 
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow SSH (port 22)
   - **Storage**: 20GB+ GP3

3. Launch instance and note the **Public IP** or **Public DNS**

### Configure Security Group

Ensure your EC2 security group allows:
- **SSH (22)**: From your IP
- **HTTP (80)**: From anywhere (0.0.0.0/0)
- **HTTPS (443)**: From anywhere (0.0.0.0/0)
- **Custom TCP (3001)**: From anywhere (for API access, or restrict to ALB)

## Step 3: Set Up EC2 Instance

### Connect to EC2

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### Clone and Set Up Application

```bash
# Clone your repository (or upload files)
git clone YOUR_REPO_URL spinthewheel
cd spinthewheel

# Or if uploading manually, create directory and upload files
mkdir -p ~/spinthewheel
# Upload files via SCP or use AWS CodeDeploy
```

### Install Application Dependencies

```bash
cd ~/spinthewheel
npm run install:all
```

## Step 4: Configure Environment Variables

### Create Production .env File

```bash
cd ~/spinthewheel/backend
nano .env
```

Add the following (replace with your actual values):

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration (RDS)
DB_HOST=your-rds-endpoint.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spinthewheel
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Or use DATABASE_URL
# DATABASE_URL=postgresql://postgres:password@your-rds-endpoint:5432/spinthewheel
DATABASE_SSL=true

# Optional: Session secret for future use
SESSION_SECRET=your-random-secret-key-here
```

### Test Database Connection

```bash
cd ~/spinthewheel/backend
node -e "
import('pg').then(({ default: pg }) => {
  const pool = new pg.Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });
  pool.query('SELECT NOW()').then(r => {
    console.log('✅ Database connected:', r.rows[0]);
    process.exit(0);
  }).catch(e => {
    console.error('❌ Database error:', e.message);
    process.exit(1);
  });
});
"
```

## Step 5: Build Frontend Applications

```bash
cd ~/spinthewheel
npm run build
```

This will build:
- `mobile-form/dist/`
- `signage-display/dist/`
- `admin-dashboard/dist/`

## Step 6: Configure PM2

### Create PM2 Ecosystem File

```bash
cd ~/spinthewheel
nano ecosystem.config.js
```

See `ecosystem.config.js` file (will be created below)

### Start Application with PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the command it outputs to enable PM2 on boot
```

## Step 7: Configure Nginx

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/spinthewheel
```

See `nginx.conf` file (will be created below)

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/spinthewheel /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 8: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is set up automatically
```

## Step 9: Verify Deployment

1. **Test API**: `https://yourdomain.com/api/signage/DEFAULT`
2. **Test Superadmin**: `https://yourdomain.com/superadmin`
3. **Test Instance Admin**: `https://yourdomain.com/admin?id=DEFAULT`
4. **Test Mobile Form**: `https://yourdomain.com/play/?signage=DEFAULT`
5. **Test Signage Display**: `https://yourdomain.com/signage?id=DEFAULT`

## Step 10: Create First Instance

After deployment, you need to create your first instance:

1. **Access Superadmin**:
   ```
   https://yourdomain.com/superadmin
   ```

2. **Create Instance**:
   - Click "+ Create New Instance"
   - Enter ID: `DEFAULT` (or your preferred ID)
   - Enter Location Name: "Main Display"
   - Click "Create Instance"

3. **Configure Instance**:
   - Go to: `https://yourdomain.com/admin?id=DEFAULT`
   - Customize outcomes, background, etc.
   - Test the game flow

**Important**: Instances must be created manually via superadmin before they can be used.

## Step 10: Set Up Monitoring (Optional)

### CloudWatch Logs

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure (follow prompts)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## Maintenance

### Update Application

```bash
cd ~/spinthewheel
git pull  # If using git
npm run install:all
npm run build
pm2 restart all
```

### View Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
pm2 logs spinthewheel-backend
```

### Backup Database

```bash
# Create backup script
nano ~/backup-db.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h YOUR_RDS_ENDPOINT -U postgres -d spinthewheel > ~/backups/spinthewheel_$DATE.sql
# Upload to S3 (optional)
aws s3 cp ~/backups/spinthewheel_$DATE.sql s3://your-backup-bucket/
```

## Security Best Practices

1. **Use Security Groups**: Restrict database access to EC2 only
2. **Use IAM Roles**: Don't hardcode AWS credentials
3. **Enable SSL**: Always use HTTPS in production
4. **Regular Updates**: Keep system and dependencies updated
5. **Backup Database**: Set up automated RDS snapshots
6. **Monitor Logs**: Set up CloudWatch alarms
7. **Use Secrets Manager**: Store sensitive data in AWS Secrets Manager

## Cost Estimation (Monthly)

- **EC2 t3.small**: ~$15/month
- **RDS db.t3.micro**: ~$15/month (Free tier available for first year)
- **Data Transfer**: ~$5-10/month (depends on usage)
- **Total**: ~$35-40/month (without free tier)

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 status
pm2 status
pm2 logs

# Check if port is in use
sudo netstat -tulpn | grep 3001

# Check environment variables
cd ~/spinthewheel/backend
cat .env
```

### Database Connection Issues

```bash
# Test connection from EC2
psql -h YOUR_RDS_ENDPOINT -U postgres -d spinthewheel

# Check security group rules
# Ensure EC2 security group can access RDS security group
```

### Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

## Next Steps

1. Set up automated backups
2. Configure CloudWatch alarms
3. Set up CI/CD pipeline (CodePipeline, GitHub Actions)
4. Configure auto-scaling (if needed)
5. Set up CDN for static assets (CloudFront)
