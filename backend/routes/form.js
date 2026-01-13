import { pool } from '../database/init.js';
import { selectOutcome } from '../utils/probability.js';
import { broadcastToSignage } from '../websocket/server.js';

export async function submitForm(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { name, email, phone, signageId } = req.body;

    if (!name || !signageId) {
      return res.status(400).json({ error: 'Name and signageId are required' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate phone format (10 digits, allowing spaces, dashes, and parentheses)
    const phoneDigits = phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneDigits)) {
      return res.status(400).json({ error: 'Please provide a valid 10-digit phone number' });
    }

    // Validate signage exists (no auto-creation)
    const signageCheck = await pool.query(
      'SELECT id, is_active FROM signage_instances WHERE id = $1',
      [signageId]
    );

    if (signageCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Signage not found. Please create the signage instance first using the admin dashboard or API.' 
      });
    }

    if (!signageCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'Signage is not active' });
    }

    // Create user record
    const userResult = await pool.query(
      `INSERT INTO users (name, email, phone, signage_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, timestamp`,
      [name, email || null, phone || null, signageId]
    );

    const userId = userResult.rows[0].id;

    // Select outcome using probability engine
    const outcome = await selectOutcome(signageId);

    // Create game session - starts as 'pending', will be updated to 'playing' when buzzer is clicked,
    // and 'completed' only after results are displayed on screen
    const sessionResult = await pool.query(
      `INSERT INTO game_sessions (user_id, signage_id, outcome_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [userId, signageId, outcome.id]
    );

    const sessionId = sessionResult.rows[0].id;

    console.log(`📝 Session ${sessionId} created for user ${name} - status: pending (waiting for buzzer)`);

    res.json({
      success: true,
      sessionId,
      message: 'Details submitted! Click the buzzer to start the game!'
    });
  } catch (error) {
    console.error('Form submission error:', error);
    console.error('Error stack:', error.stack);
    // Don't expose internal errors to client in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (error.message || 'Internal server error');
    res.status(500).json({ error: message });
  }
}



export async function startGame(req, res) {
  try {
    const { sessionId } = req.params;
    console.log(`🔔 Buzzer clicked for session: ${sessionId}`);

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Validate UUID format (PostgreSQL UUID format)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    // Get session details
    const sessionResult = await pool.query(
      `SELECT 
        gs.id,
        gs.status,
        gs.signage_id,
        u.name,
        go.id as outcome_id,
        go.label as outcome_label,
        go.is_negative
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      LEFT JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE gs.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      console.error(`❌ Session not found: ${sessionId}`);
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];
    console.log(`📋 Session status: ${session.status}, User: ${session.name}`);

    // Check if session is in pending state
    if (session.status !== 'pending') {
      console.warn(`⚠️ Cannot start game - session status is: ${session.status}`);
      return res.status(400).json({ 
        error: `Game cannot be started. Current status: ${session.status}` 
      });
    }

    // Broadcast to signage via WebSocket to start the game
    console.log(`📡 Broadcasting game_start to signage: ${session.signage_id}`);
    broadcastToSignage(session.signage_id, {
      type: 'game_start',
      sessionId: session.id,
      userName: session.name,
      outcome: {
        id: session.outcome_id,
        label: session.outcome_label,
        is_negative: session.is_negative || false
      }
    });

    // Update session status to playing when game starts on signage
    await pool.query(
      'UPDATE game_sessions SET status = $1 WHERE id = $2',
      ['playing', sessionId]
    );

    console.log(`🎮 Session ${sessionId} started for user ${session.name} - status: playing`);

    res.json({
      success: true,
      sessionId: session.id,
      message: 'Game started! Watch the screen!'
    });
  } catch (error) {
    console.error('❌ Start game error:', error);
    console.error('Error stack:', error.stack);
    // Don't expose internal errors to client in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (error.message || 'Internal server error');
    res.status(500).json({ error: message });
  }
}

export async function getSession(req, res) {
  try {
    const { sessionId } = req.params;

    const result = await pool.query(
      `SELECT 
        gs.id,
        gs.status,
        gs.timestamp,
        u.name,
        u.email,
        u.phone,
        go.id as outcome_id,
        go.label as outcome_label,
        go.is_negative
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      LEFT JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE gs.id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = result.rows[0];
    res.json({
      id: session.id,
      status: session.status,
      timestamp: session.timestamp,
      userName: session.name,
      outcome: session.outcome_label ? {
        id: session.outcome_id,
        label: session.outcome_label,
        is_negative: session.is_negative || false
      } : null
    });
  } catch (error) {
    console.error('Get session error:', error);
    console.error('Error stack:', error.stack);
    // Don't expose internal errors to client in production
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (error.message || 'Internal server error');
    res.status(500).json({ error: message });
  }
}