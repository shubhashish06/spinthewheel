#!/bin/bash

# Initial AWS EC2 Setup Script
# Run this once when first setting up your EC2 instance

set -e

echo "🔧 Setting up AWS EC2 instance for Spin the Wheel..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo -e "${YELLOW}📦 Installing Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    echo -e "${GREEN}✅ Node.js $(node --version) installed${NC}"
else
    echo -e "${GREEN}✅ Node.js already installed: $(node --version)${NC}"
fi

# Install PM2
echo -e "${YELLOW}📦 Installing PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${GREEN}✅ PM2 already installed${NC}"
fi

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl enable nginx
    echo -e "${GREEN}✅ Nginx installed and enabled${NC}"
else
    echo -e "${GREEN}✅ Nginx already installed${NC}"
fi

# Install Git
echo -e "${YELLOW}📦 Installing Git...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt install -y git
    echo -e "${GREEN}✅ Git installed${NC}"
else
    echo -e "${GREEN}✅ Git already installed${NC}"
fi

# Install Certbot for SSL
echo -e "${YELLOW}📦 Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✅ Certbot installed${NC}"
else
    echo -e "${GREEN}✅ Certbot already installed${NC}"
fi

# Install PostgreSQL client (for database management)
echo -e "${YELLOW}📦 Installing PostgreSQL client...${NC}"
if ! command -v psql &> /dev/null; then
    sudo apt install -y postgresql-client
    echo -e "${GREEN}✅ PostgreSQL client installed${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL client already installed${NC}"
fi

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
mkdir -p ~/spinthewheel
mkdir -p ~/spinthewheel/logs
mkdir -p ~/backups

# Set up firewall (UFW)
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw --force enable
echo -e "${GREEN}✅ Firewall configured${NC}"

# Get public IP
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Your EC2 Public IP: $PUBLIC_IP"
echo ""
echo "Next steps:"
echo "1. Clone or upload your project to ~/spinthewheel"
echo "2. Configure .env file in ~/spinthewheel/backend/.env"
echo "3. Run: cd ~/spinthewheel && bash deploy-aws.sh"
echo ""
echo "To test locally:"
echo "  curl http://localhost:3001/api/signage/DEFAULT"
