# Quick Start Guide

Get the Spin the Wheel signage game running in minutes!

## Step 1: Install Dependencies

```bash
npm run install:all
```

## Step 2: Set Up Database

Make sure PostgreSQL is running and create a database:

```bash
createdb spinthewheel
```

Or using psql:
```sql
CREATE DATABASE spinthewheel;
```

## Step 3: Configure Environment

Create `backend/.env` file:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spinthewheel
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_SSL=false
```

## Step 4: Start Development Servers

```bash
npm run dev
```

This starts:
- Backend: http://localhost:3001
- Mobile Form: http://localhost:3002  
- Signage Display: http://localhost:3003
- Admin Dashboard: http://localhost:3004

## Step 5: Create First Instance

1. **Build admin dashboard** (if not already built):
   ```bash
   cd admin-dashboard
   npm install
   npm run build
   cd ..
   ```

2. **Start backend** (if not running):
   ```bash
   cd backend
   npm start
   ```

3. **Access Superadmin**:
   ```
   http://localhost:3001/superadmin
   ```

4. **Create Instance**:
   - Click "+ Create New Instance"
   - ID: `DEFAULT`
   - Location Name: "Main Display"
   - Click "Create Instance"

## Step 6: Test the System

1. **Open Signage Display:**
   - Go to http://localhost:3003?id=DEFAULT
   - You should see a QR code

2. **Test Mobile Form:**
   - Go to http://localhost:3002?id=DEFAULT
   - Fill in your name and submit
   - Watch the signage display - the wheel should spin!

## Production Build

1. Build frontend apps:
```bash
npm run build
```

2. Start backend:
```bash
cd backend
npm start
```

3. Access:
   - Superadmin: http://localhost:3001/superadmin
   - Instance Admin: http://localhost:3001/admin?id=DEFAULT
   - Mobile form: http://localhost:3001/play/?id=DEFAULT
   - Signage: http://localhost:3001/signage?id=DEFAULT

## Quick Access URLs

### Development Mode
- Superadmin: `http://localhost:3004/superadmin` (after build)
- Instance Admin: `http://localhost:3004?id=DEFAULT` (after build)
- Mobile Form: `http://localhost:3002?id=DEFAULT`
- Signage: `http://localhost:3003?id=DEFAULT`

### Production Mode
- Superadmin: `http://localhost:3001/superadmin`
- Instance Admin: `http://localhost:3001/admin?id=DEFAULT`
- Mobile Form: `http://localhost:3001/play/?id=DEFAULT`
- Signage: `http://localhost:3001/signage?id=DEFAULT`

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in `.env` matches your setup
- Ensure database exists: `psql -l | grep spinthewheel`

### WebSocket Connection Failed
- Check backend server is running on port 3001
- Verify firewall isn't blocking WebSocket connections
- In production, ensure reverse proxy supports WebSocket upgrade

### QR Code Not Showing
- Check browser console for errors
- Verify the form URL is correct
- Try regenerating QR code by refreshing signage page

### Instance Not Found
- Create instance in superadmin first
- Verify instance ID spelling (case-sensitive)
- Check instance is active

## Next Steps

1. Create more instances in superadmin
2. Customize outcomes and backgrounds per instance
3. Set up signage displays in fullscreen/kiosk mode
4. Deploy to production (see AWS_DEPLOYMENT.md)
