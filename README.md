# Spin the Wheel - Digital Signage Game

An interactive marketing/engagement application that allows users to play a spin-the-wheel game via QR code scanning on digital signage displays.

## System Architecture

The system consists of five main components:

1. **Mobile Web Form** - Captures user information via QR code scan
2. **Signage Display** - Shows game interface and results on fullscreen displays
3. **Backend Server** - Coordinates game logic and manages data
4. **Superadmin Dashboard** - Central dashboard for creating and managing all signage instances
5. **Instance Admin Dashboard** - Instance-specific dashboard for managing outcomes, weights, and backgrounds

## Features

### Core Features
- ✅ Responsive mobile form (no app installation needed)
- ✅ Real-time WebSocket communication
- ✅ Animated spinning wheel with probability-based outcomes
- ✅ QR code generation for easy access
- ✅ Multiple signage instance support
- ✅ PostgreSQL database for data persistence
- ✅ Complete session lifecycle tracking (queued → playing → completed)

### Superadmin Dashboard Features
- ✅ **Instance Management** - Create, edit, and delete signage instances
- ✅ **Instance Listing** - View all instances in a centralized table
- ✅ **Activate/Deactivate** - Toggle instance status
- ✅ **Direct Access** - Quick links to manage each instance

### Instance Admin Dashboard Features
- ✅ **Outcomes Management** - Create, edit, and delete game outcomes
- ✅ **Weight Management** - Inline editing and bulk update of probability weights
- ✅ **Weight Statistics** - View probability percentages in real-time
- ✅ **Background Customization** - Configure wheel game backgrounds (gradient, solid color, or image)
- ✅ **User Analytics** - View user submissions and game sessions
- ✅ **Session Tracking** - Monitor game sessions with status tracking
- ✅ **Instance-Specific** - Each instance has its own dedicated dashboard

### Wheel Features
- ✅ **Responsive Design** - Adapts to all screen sizes and orientations
- ✅ **Smooth Animations** - 10-second spin duration with ease-out deceleration
- ✅ **Precise Stopping** - Always stops exactly in the center of winning segments
- ✅ **Modern UI** - Red/gray alternating segments with black rim and white dots
- ✅ **Pointer Design** - Silver triangular pointer positioned inside black border
- ✅ **Real-time Resize** - Automatically adjusts when window is resized

## Tech Stack

### Backend
- Node.js + Express.js
- WebSocket (ws library)
- PostgreSQL
- UUID for session management

### Frontend
- React 18
- Vite
- Tailwind CSS
- Canvas API for wheel animation
- QRCode.js for QR generation

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn

## Installation

1. **Clone and install dependencies:**

```bash
npm run install:all
```

2. **Set up PostgreSQL database:**

Create a database named `spinthewheel` (or configure your own):

```bash
createdb spinthewheel
```

3. **Configure environment variables:**

Create a `.env` file in the `backend` directory:

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spinthewheel
DB_USER=postgres
DB_PASSWORD=postgres
# OR use DATABASE_URL:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/spinthewheel
DATABASE_SSL=false
```

4. **Initialize the database:**

The database will be automatically initialized when you start the backend server. It will create all necessary tables and insert default data.

## Running the Application

### Development Mode

Run all components concurrently:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Mobile form on `http://localhost:3002`
- Signage display on `http://localhost:3003`
- Admin dashboard on `http://localhost:3004`

### Production Build

Build all frontend applications:

```bash
npm run build
```

Then start the backend server:

```bash
cd backend
npm start
```

The backend serves the built frontend applications at:
- Mobile form: `http://localhost:3001/play`
- Signage display: `http://localhost:3001/signage`
- Admin dashboard: `http://localhost:3001/admin`

## URL Structure

**All application URLs use the `?id=` parameter for instance identification:**

| Component | URL Format | Example |
|-----------|------------|---------|
| **Superadmin** | `/superadmin` | `http://localhost:3001/superadmin` |
| **Instance Admin** | `/admin?id=INSTANCE_ID` | `http://localhost:3001/admin?id=store_1` |
| **Signage Display** | `/signage?id=INSTANCE_ID` | `http://localhost:3001/signage?id=DEFAULT` |
| **Mobile Form** | `/play?id=INSTANCE_ID` | `http://localhost:3001/play?id=DEFAULT` |

> **Note:** The QR code on the signage display automatically generates the correct mobile form URL with the instance ID.

## Usage

### Setting Up a Signage Display

1. Open the signage display in a browser (or kiosk mode):
   ```
   http://localhost:3001/signage?id=DEFAULT
   ```

2. The display will show:
   - QR code for users to scan
   - Instructions to play
   - Game interface when active
   - Results display after spin completes

### User Flow

1. User scans QR code on signage
2. Mobile browser opens form with signage ID parameter
3. User fills form (name required, email/phone optional)
4. User submits form
5. **Session created** with status `queued`
6. Game starts on signage display with user's name
7. **Session updated** to status `playing`
8. Wheel spins for 10 seconds and lands on outcome
9. Results displayed for 5 seconds
10. **Session completed** - status updated to `completed` after results are shown
11. Display returns to idle state

### Superadmin Dashboard

Access the superadmin dashboard at:
```
http://localhost:3001/superadmin
```

**Purpose**: Central management for all signage instances

**Features**:
- Create new instances
- List all instances
- Edit instance details (location name, active status)
- Activate/deactivate instances
- Delete instances
- Direct links to manage each instance

### Instance Admin Dashboard

Access instance-specific admin dashboards at:
```
http://localhost:3001/admin?id=INSTANCE_ID
```

**Examples**:
```
http://localhost:3001/admin?id=DEFAULT
http://localhost:3001/admin?id=store_1
http://localhost:3001/admin?id=store_2
```

**Features**:

1. **Overview Tab** - Statistics and analytics for this instance
2. **Users Tab** - View all user submissions for this instance
3. **Sessions Tab** - Track game sessions and their status for this instance
4. **Outcomes Tab** - Manage game outcomes and weights for this instance
   - Inline weight editing (click any weight to edit)
   - Bulk weight update mode
   - Real-time probability percentage calculations
   - Create, edit, and delete outcomes
5. **Background Tab** - Customize wheel game background for this instance
   - Gradient backgrounds (multiple colors)
   - Solid color backgrounds
   - Image backgrounds (from URL)
   - Live preview
   - Preset backgrounds

**Note**: Each instance has its own separate dashboard. No instance switching within dashboards.

## API Endpoints

### Form Submission
```
POST /api/submit
Body: { name, email?, phone?, signageId }
Response: { success, sessionId, message }
```

### Signage Endpoints
```
GET    /api/signage              # List all instances
POST   /api/signage              # Create new instance
GET    /api/signage/:id          # Get instance config
PATCH  /api/signage/:id          # Update instance
DELETE /api/signage/:id          # Delete instance
GET    /api/signage/:id/stats    # Get instance statistics
GET    /api/signage/:id/background  # Get background config
PUT    /api/signage/:id/background  # Update background
```

### Outcomes Management
```
GET /api/outcomes/:signageId?
POST /api/outcomes
PUT /api/outcomes/:id
PATCH /api/outcomes/:id/weight
PUT /api/outcomes/weights/bulk
GET /api/outcomes/:signageId?/weights/stats
DELETE /api/outcomes/:id
```

### Admin Endpoints
```
GET /api/admin/users?signageId=&limit=&offset=
GET /api/admin/sessions?signageId=&status=&limit=&offset=
```

### WebSocket Connection

Signage displays connect via WebSocket:

```
ws://localhost:3001/ws/signage/:id
```

Messages:
- `game_start` - Sent from server when form is submitted
- `game_complete` - Sent from signage when results are displayed (after 5 seconds)
- `background_update` - Sent when background is changed in admin dashboard
- `ping/pong` - Keep-alive messages

## Database Schema

### Tables

- **signage_instances** - Signage display configurations
  - `id` (VARCHAR) - Unique signage identifier
  - `location_name` (VARCHAR) - Display location name
  - `is_active` (BOOLEAN) - Active status
  - `background_config` (JSONB) - Background configuration (gradient/solid/image)
  - `created_at` (TIMESTAMP)

- **users** - User information from form submissions
  - `id` (UUID) - Primary key
  - `name` (VARCHAR) - User name
  - `email` (VARCHAR) - Optional email
  - `phone` (VARCHAR) - Optional phone
  - `signage_id` (VARCHAR) - Reference to signage instance
  - `timestamp` (TIMESTAMP)

- **game_outcomes** - Prize/outcome definitions with probability weights
  - `id` (UUID) - Primary key
  - `label` (VARCHAR) - Outcome label (e.g., "10% Discount")
  - `probability_weight` (INTEGER) - Weight for probability calculation
  - `is_active` (BOOLEAN) - Active status
  - `signage_id` (VARCHAR) - Signage-specific or NULL for global
  - `created_at` (TIMESTAMP)

- **game_sessions** - Game session records linking users to outcomes
  - `id` (UUID) - Primary key
  - `user_id` (UUID) - Reference to users table
  - `signage_id` (VARCHAR) - Reference to signage instance
  - `outcome_id` (UUID) - Reference to game_outcomes table
  - `status` (VARCHAR) - Session status: 'queued', 'playing', 'completed'
  - `timestamp` (TIMESTAMP)

## Probability System

The probability engine uses weighted random selection:

1. Fetches all active outcomes for a signage instance
2. Calculates total weight (sum of all probability_weight values)
3. Generates random number between 0 and total weight
4. Iterates through outcomes, subtracting weights until <= 0
5. Returns selected outcome

### Weight Management

Weights determine the probability of each outcome:
- **Higher weight = Higher probability**
- Weights are relative (not percentages)
- Percentage = (outcome_weight / total_weight) × 100

### Example Configuration

```javascript
// Total weight: 100
{ label: "Grand Prize", probability_weight: 5 }   // 5% chance
{ label: "10% Discount", probability_weight: 30 }  // 30% chance
{ label: "Try Again", probability_weight: 40 }    // 40% chance
{ label: "20% Discount", probability_weight: 15 } // 15% chance
{ label: "Free Item", probability_weight: 10 }     // 10% chance
```

### Managing Weights

**Via Admin Dashboard:**
1. Go to Outcomes tab
2. Click any weight value to edit inline
3. Or use "Bulk Edit Weights" to update multiple at once
4. View real-time probability percentages

**Via API:**
- See `backend/API_WEIGHTS.md` for detailed API documentation

## Background Customization

The wheel game background can be customized per signage instance:

### Background Types

1. **Gradient** - Multiple colors with smooth transitions
   - Add/remove color stops
   - Custom color picker
   - Linear gradient from top-left to bottom-right

2. **Solid Color** - Single color background
   - Color picker interface
   - Hex color input

3. **Image** - Custom image from URL
   - Public image URL required
   - Supports JPG, PNG, GIF, WebP
   - Full-screen coverage

### Setting Background

**Via Admin Dashboard:**
1. Go to Background tab
2. Select background type
3. Configure colors/image URL
4. Preview in real-time
5. Click "Save Background"

**Via API:**
```
PUT /api/signage/:id/background
Body: {
  background_config: {
    type: "gradient",
    colors: ["#991b1b", "#000000", "#991b1b"]
  }
}
```

Background updates are broadcast in real-time to connected signage displays via WebSocket.

## Wheel Design

### Visual Elements

- **Segments**: Alternating red (#DC2626) and light gray (#E5E5E5) colors
- **Black Rim**: 45-60px wide border with 48 glowing white dots
- **Center Button**: Red circular button with "SPIN" text and white dots
- **Pointer**: Silver triangular pointer positioned inside black border, pointing to wheel center
- **Text**: Bold, readable text with shadows for contrast

### Animation

- **Duration**: 10 seconds
- **Rotations**: 4-5 full spins
- **Easing**: Exponential ease-out for natural deceleration
- **Stopping**: Always stops exactly in the center of winning segment
- **Transition**: Smooth 300ms fade to results screen

### Responsive Design

- Automatically adjusts to window size
- Handles orientation changes
- Responsive text sizing (16-32px for labels, 20-36px for center)
- Responsive element sizing (rim, dots, pointer scale with wheel size)
- Maintains aspect ratio on all devices

## Session Lifecycle

Sessions track the complete user journey:

1. **Queued** - Session created when form is submitted
2. **Playing** - Session updated when game starts on signage
3. **Completed** - Session marked complete after results are displayed (5 seconds)

Sessions only complete after the user sees the results on screen, ensuring complete tracking of the user experience.

## Deployment

### For Production

1. Set up PostgreSQL database on your server
2. Configure environment variables
3. Build frontend applications: `npm run build`
4. Set up reverse proxy (nginx) for HTTPS
5. Use PM2 or similar for process management
6. Configure SSL certificates (Let's Encrypt)

### Digital Signage Setup

1. Use a device (Raspberry Pi, mini PC, etc.) connected to display
2. Install Chrome or Chromium
3. Configure kiosk mode:
   ```bash
   chromium-browser --kiosk --app=http://yourdomain.com/signage?id=YOUR_ID
   ```
4. Set up auto-start on boot

## Customization

### Adding New Signage Instances

**Via Superadmin Dashboard (Recommended)**:
1. Go to `http://localhost:3001/superadmin`
2. Click "+ Create New Instance"
3. Enter Instance ID and Location Name
4. Instance is created with default outcomes and background

**Via API**:
```bash
POST /api/signage
{
  "id": "store_1",
  "location_name": "Store 1",
  "is_active": true
}
```

**Note**: Instances must be created manually. No auto-creation from URLs.

### Customizing Outcomes

**Via Admin Dashboard:**
1. Go to Outcomes tab
2. Click "+ Add Outcome"
3. Enter label and weight
4. Save

**Via API:**
```bash
POST /api/outcomes
{
  "label": "50% Off",
  "probability_weight": 10,
  "signage_id": "LOCATION_1"
}
```

### Customizing Backgrounds

**Via Admin Dashboard:**
1. Go to Background tab
2. Select type (gradient/solid/image)
3. Configure settings
4. Use presets or create custom
5. Save

**Via API:**
```bash
PUT /api/signage/LOCATION_1/background
{
  "background_config": {
    "type": "image",
    "url": "https://example.com/background.jpg"
  }
}
```

## Project Structure

```
spinthewheel/
├── backend/              # Backend server
│   ├── routes/          # API routes
│   ├── database/       # Database initialization
│   ├── websocket/      # WebSocket server
│   └── utils/           # Utility functions
├── mobile-form/         # Mobile web form
├── signage-display/     # Signage display application
├── admin-dashboard/     # Admin dashboard
└── package.json         # Root package configuration
```

## Development

### Running Individual Components

```bash
# Backend only
npm run dev:backend

# Mobile form only
npm run dev:mobile

# Signage display only
npm run dev:signage

# Admin dashboard only
npm run dev:admin
```

### Building for Production

```bash
# Build all frontends
npm run build

# Or build individually
cd mobile-form && npm run build
cd signage-display && npm run build
cd admin-dashboard && npm run build
```

## Deployment

### AWS Deployment

The application is ready for production deployment on AWS. See the comprehensive deployment guides:

- **[AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)** - Complete step-by-step AWS deployment guide
- **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** - Quick 5-step deployment guide

#### Quick Deployment Steps

1. **Set up AWS Infrastructure**
   - Launch EC2 instance (Ubuntu 22.04, t3.small or larger)
   - Create RDS PostgreSQL instance
   - Configure security groups

2. **Run Setup Scripts**
   ```bash
   # On EC2 instance
   ./aws-setup.sh      # Initial system setup
   ./deploy-aws.sh     # Deploy application
   ```

3. **Configure Domain & SSL**
   - Point DNS to EC2 IP
   - Update Nginx config with domain name
   - Run Certbot for SSL certificate

#### Deployment Files

- `ecosystem.config.js` - PM2 process management configuration
- `nginx.conf` - Nginx reverse proxy configuration
- `deploy-aws.sh` - Automated deployment script
- `aws-setup.sh` - Initial EC2 setup script
- `Dockerfile` - Docker container configuration (optional)
- `docker-compose.yml` - Docker Compose for local testing

#### Production Environment Variables

Create `backend/.env` with:

```env
PORT=3001
NODE_ENV=production
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spinthewheel
DB_USER=postgres
DB_PASSWORD=your-secure-password
DATABASE_SSL=true
SESSION_SECRET=your-random-secret-key
```

See `backend/.env.example` for a complete template.

### Docker Deployment (Alternative)

For containerized deployment:

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build Docker image
docker build -t spinthewheel .
docker run -p 3001:3001 --env-file backend/.env spinthewheel
```

## Troubleshooting

### Database Connection Issues

If you see database connection errors:
1. Ensure PostgreSQL is running
2. Check `.env` file configuration
3. Verify database exists: `psql -l | grep spinthewheel`
4. Test connection: `psql -U postgres -d spinthewheel`

### Frontend Build Issues

If frontend apps aren't loading:
1. Build all frontends: `npm run build`
2. Check that `dist` folders exist in each frontend directory
3. Restart backend server after building

### WebSocket Connection Issues

If signage displays don't receive updates:
1. Check WebSocket URL in browser console
2. Verify signage ID matches
3. Check backend logs for connection messages
4. Ensure firewall allows WebSocket connections

## API Documentation

- **Weight Management API**: See `backend/API_WEIGHTS.md`
- **Background API**: See signage endpoints in this README

## License

MIT
