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

    // Create game session - starts as 'queued', will be updated to 'playing' when game starts,
    // and 'completed' only after results are displayed on screen
    const sessionResult = await pool.query(
      `INSERT INTO game_sessions (user_id, signage_id, outcome_id, status)
       VALUES ($1, $2, $3, 'queued')
       RETURNING id`,
      [userId, signageId, outcome.id]
    );

    const sessionId = sessionResult.rows[0].id;

    // Broadcast to signage via WebSocket to start the game
    broadcastToSignage(signageId, {
      type: 'game_start',
      sessionId,
      userName: name,
      outcome: {
        id: outcome.id,
        label: outcome.label,
        is_negative: outcome.is_negative || false
      }
    });

    // Update session status to playing when game starts on signage
    await pool.query(
      'UPDATE game_sessions SET status = $1 WHERE id = $2',
      ['playing', sessionId]
    );

    console.log(`🎮 Session ${sessionId} started for user ${name} - status: playing`);

    res.json({
      success: true,
      sessionId,
      message: 'Game started! Watch the screen!'
    });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
}