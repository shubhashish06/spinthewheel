import { pool } from '../database/init.js';

export async function getRedemptions(req, res) {
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
      SELECT 
        r.*,
        gs.signage_id,
        (gs.timestamp AT TIME ZONE 'UTC')::timestamptz as session_timestamp,
        (r.created_at AT TIME ZONE 'UTC')::timestamptz as created_at,
        (r.redeemed_at AT TIME ZONE 'UTC')::timestamptz as redeemed_at,
        si.timezone
      FROM redemptions r
      JOIN game_sessions gs ON r.session_id = gs.id
      LEFT JOIN signage_instances si ON gs.signage_id = si.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` AND gs.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    if (status === 'redeemed') {
      query += ` AND r.is_redeemed = true`;
    } else if (status === 'pending') {
      query += ` AND r.is_redeemed = false`;
    }

    query += ` ORDER BY r.redeemed_at DESC, r.created_at DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get redemptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markRedemptionRedeemed(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { id } = req.params;
    const { redeemed_by, notes } = req.body;

    const result = await pool.query(`
      UPDATE redemptions
      SET 
        is_redeemed = true,
        redeemed_at = CURRENT_TIMESTAMP,
        redeemed_by = $1,
        notes = $2
      WHERE id = $3
      RETURNING *
    `, [redeemed_by || 'Admin', notes || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Redemption not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark redemption redeemed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRedemptionStats(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { signageId } = req.params;

    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_redemptions,
        COUNT(CASE WHEN is_redeemed = true THEN 1 END) as redeemed_count,
        COUNT(CASE WHEN is_redeemed = false THEN 1 END) as pending_count
      FROM redemptions r
      JOIN game_sessions gs ON r.session_id = gs.id
      WHERE gs.signage_id = $1
    `, [signageId]);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get redemption stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
