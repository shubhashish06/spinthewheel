import { pool } from '../database/init.js';

export async function getUsers(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { signageId, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM users';
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` WHERE signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSessions(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { signageId, status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT gs.*, u.name, u.email, u.phone, go.label as outcome_label
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      LEFT JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` AND gs.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    if (status) {
      query += ` AND gs.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY gs.timestamp DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
