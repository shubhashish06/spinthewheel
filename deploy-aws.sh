#!/bin/bash

# AWS Deployment Script for Spin the Wheel Application
# Run this script on your EC2 instance after initial setup

set -e  # Exit on error

echo "🚀 Starting AWS deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    echo -e "${RED}❌ Please do not run as root. Use a regular user with sudo privileges.${NC}"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 not found. Installing...${NC}"
    sudo npm install -g pm2
fi

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nginx not found. Installing...${NC}"
    sudo apt update
    sudo apt install -y nginx
fi

# Navigate to project directory
PROJECT_DIR="$HOME/spinthewheel"
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ Project directory not found at $PROJECT_DIR${NC}"
    echo "Please clone or upload your project first."
    exit 1
fi

cd "$PROJECT_DIR"

echo -e "${GREEN}✅ Found project directory${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm run install:all

# Check for .env file
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating template...${NC}"
    cat > "$PROJECT_DIR/backend/.env" << EOF
# Server Configuration
PORT=3001
NODE_ENV=production

# Database Configuration (RDS)
DB_HOST=your-rds-endpoint.xxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spinthewheel
DB_USER=postgres
DB_PASSWORD=your-secure-password
DATABASE_SSL=true

# Session Secret
SESSION_SECRET=$(openssl rand -hex 32)
EOF
    echo -e "${YELLOW}⚠️  Please edit $PROJECT_DIR/backend/.env with your actual values${NC}"
    echo "Press Enter to continue after editing..."
    read
fi

# Build frontend applications
echo -e "${YELLOW}🔨 Building frontend applications...${NC}"
npm run build

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Stop existing PM2 processes
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Start application with PM2
echo -e "${YELLOW}▶️  Starting application with PM2...${NC}"
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 startup
echo -e "${YELLOW}⚙️  Setting up PM2 startup...${NC}"
STARTUP_CMD=$(pm2 startup | grep -v "PM2" | tail -1)
if [ ! -z "$STARTUP_CMD" ]; then
    echo "Run this command to enable PM2 on boot:"
    echo -e "${GREEN}$STARTUP_CMD${NC}"
fi

# Setup Nginx
echo -e "${YELLOW}⚙️  Setting up Nginx...${NC}"
if [ -f "$PROJECT_DIR/nginx.conf" ]; then
    echo -e "${YELLOW}⚠️  Please update nginx.conf with your domain name${NC}"
    echo "Then run:"
    echo "  sudo cp $PROJECT_DIR/nginx.conf /etc/nginx/sites-available/spinthewheel"
    echo "  sudo ln -s /etc/nginx/sites-available/spinthewheel /etc/nginx/sites-enabled/"
    echo "  sudo nginx -t"
    echo "  sudo systemctl restart nginx"
fi

# Setup SSL (if domain is configured)
echo -e "${YELLOW}🔒 SSL Certificate Setup${NC}"
echo "To set up SSL with Let's Encrypt:"
echo "  sudo apt install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com"

# Check application status
echo -e "${YELLOW}📊 Checking application status...${NC}"
sleep 3
pm2 status

# Test endpoints
echo -e "${YELLOW}🧪 Testing endpoints...${NC}"
if curl -f http://localhost:3001/api/signage/DEFAULT > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend API is responding${NC}"
else
    echo -e "${RED}❌ Backend API is not responding. Check logs: pm2 logs${NC}"
fi

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure Nginx with your domain"
echo "2. Set up SSL certificate with Let's Encrypt"
echo "3. Update DNS records to point to this server's IP"
echo "4. Test the application: https://yourdomain.com/signage?id=DEFAULT"
echo ""
echo "Useful commands:"
echo "  pm2 logs              # View application logs"
echo "  pm2 restart all       # Restart application"
echo "  pm2 status            # Check application status"
echo "  sudo nginx -t         # Test Nginx configuration"
echo "  sudo systemctl status nginx  # Check Nginx status"
