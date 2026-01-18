import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './websocket/server.js';
import { initDatabase, pool } from './database/init.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend builds (only if they exist)
const mobileFormDist = join(__dirname, '../mobile-form/dist');
const signageDist = join(__dirname, '../signage-display/dist');
const adminDist = join(__dirname, '../admin-dashboard/dist');

if (existsSync(mobileFormDist)) {
  app.use('/play', express.static(mobileFormDist));
}
if (existsSync(signageDist)) {
  app.use('/signage', express.static(signageDist));
}
if (existsSync(adminDist)) {
  app.use('/admin', express.static(adminDist));
} else {
  console.log('⚠️  Admin dashboard not built. Run: cd admin-dashboard && npm install && npm run build');
}

// Routes
setupRoutes(app);

// Serve frontend apps (catch-all for client-side routing)
app.get('/play/*', (req, res) => {
  const mobileIndex = join(__dirname, '../mobile-form/dist/index.html');
  if (existsSync(mobileIndex)) {
    res.sendFile(mobileIndex);
  } else {
    res.status(503).send('Mobile form not built. Run: cd mobile-form && npm install && npm run build');
  }
});

app.get('/signage/*', (req, res) => {
  const signageIndex = join(__dirname, '../signage-display/dist/index.html');
  if (existsSync(signageIndex)) {
    res.sendFile(signageIndex);
  } else {
    res.status(503).send('Signage display not built. Run: cd signage-display && npm install && npm run build');
  }
});

app.get('/admin/*', (req, res) => {
  const adminIndex = join(__dirname, '../admin-dashboard/dist/index.html');
  if (existsSync(adminIndex)) {
    res.sendFile(adminIndex);
  } else {
    res.status(503).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>Admin Dashboard Not Built</h1>
          <p>The admin dashboard needs to be built first.</p>
          <p>Run these commands:</p>
          <pre style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 5px;">
cd admin-dashboard
npm install
npm run build
          </pre>
          <p>Then restart the backend server.</p>
        </body>
      </html>
    `);
  }
});

// Superadmin route
app.get('/superadmin', (req, res) => {
  const adminIndex = join(__dirname, '../admin-dashboard/dist/index.html');
  if (existsSync(adminIndex)) {
    res.sendFile(adminIndex);
  } else {
    res.status(503).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>Admin Dashboard Not Built</h1>
          <p>The admin dashboard needs to be built first.</p>
          <p>Run these commands:</p>
          <pre style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 5px;">
cd admin-dashboard
npm install
npm run build
          </pre>
          <p>Then restart the backend server.</p>
        </body>
      </html>
    `);
  }
});

app.get('/admin/super', (req, res) => {
  const adminIndex = join(__dirname, '../admin-dashboard/dist/index.html');
  if (existsSync(adminIndex)) {
    res.sendFile(adminIndex);
  } else {
    res.status(503).send(`
      <html>
        <body style="font-family: Arial; padding: 40px; text-align: center;">
          <h1>Admin Dashboard Not Built</h1>
          <p>The admin dashboard needs to be built first.</p>
          <p>Run these commands:</p>
          <pre style="background: #f5f5f5; padding: 20px; display: inline-block; border-radius: 5px;">
cd admin-dashboard
npm install
npm run build
          </pre>
          <p>Then restart the backend server.</p>
        </body>
      </html>
    `);
  }
});

// WebSocket Server
const wss = new WebSocketServer({ server });
setupWebSocket(wss);

// Initialize database (non-blocking)
initDatabase().then(() => {
  console.log('✅ Database initialized successfully');
}).catch(err => {
  console.error('⚠️  Database initialization failed:', err.message);
  console.error('⚠️  Server will start but database features will be unavailable');
  console.error('⚠️  To fix: Install PostgreSQL and create database "spinthewheel"');
});

// Automatic cleanup of stuck sessions (runs every 5 minutes)
async function autoCleanupStuckSessions() {
  try {
    const result = await pool.query(`
      UPDATE game_sessions 
      SET status = 'completed'
      WHERE status = 'playing' 
      AND created_at < NOW() - INTERVAL '2 minutes'
      RETURNING id
    `);
    
    if (result.rows.length > 0) {
      console.log(`🧹 Auto-cleaned ${result.rows.length} stuck session(s)`);
    }
  } catch (error) {
    // Silently fail - don't break server if cleanup fails
    if (error.code !== 'ECONNREFUSED') {
      console.error('Error in auto cleanup:', error.message);
    }
  }
}

// Start automatic cleanup job (every 5 minutes)
setInterval(autoCleanupStuckSessions, 5 * 60 * 1000);
console.log('🧹 Automatic stuck session cleanup enabled (every 5 minutes)');

// Start server regardless of database status
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Mobile form: http://localhost:${PORT}/play`);
  console.log(`🖥️  Signage display: http://localhost:${PORT}/signage`);
  console.log(`📊 Admin dashboard: http://localhost:${PORT}/admin`);
});
