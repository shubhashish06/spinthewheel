#!/bin/bash
# Build all frontend applications

echo "🏗️  Building all frontend applications..."
echo ""

# Build mobile form
echo "📱 Building mobile form..."
cd mobile-form
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --cache /tmp/npm-cache-$(whoami) 2>&1 | tail -3
fi
npm run build 2>&1 | tail -5
cd ..

# Build signage display
echo ""
echo "🖥️  Building signage display..."
cd signage-display
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --cache /tmp/npm-cache-$(whoami) 2>&1 | tail -3
fi
npm run build 2>&1 | tail -5
cd ..

# Build admin dashboard
echo ""
echo "📊 Building admin dashboard..."
cd admin-dashboard
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --cache /tmp/npm-cache-$(whoami) 2>&1 | tail -3
fi
npm run build 2>&1 | tail -5
cd ..

echo ""
echo "✅ All frontend applications built!"
echo ""
echo "You can now restart the backend server and access:"
echo "  - Admin Dashboard: http://localhost:3001/admin"
echo "  - Mobile Form: http://localhost:3001/play"
echo "  - Signage Display: http://localhost:3001/signage"
