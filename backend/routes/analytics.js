import { pool } from '../database/init.js';

export async function getDuplicateAttempts(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { signageId, days = 30 } = req.query;

    if (!signageId) {
      return res.status(400).json({ error: 'signageId is required' });
    }

    const daysInt = parseInt(days);
    if (isNaN(daysInt) || daysInt < 1) {
      return res.status(400).json({ error: 'days must be a positive integer' });
    }

    // Get duplicate attempt statistics
    const stats = await pool.query(`
      SELECT 
        DATE(gs.timestamp) as date,
        COUNT(*) as total_attempts,
        COUNT(DISTINCT u.email_normalized) as unique_emails,
        COUNT(DISTINCT u.phone_normalized) as unique_phones
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.signage_id = $1
        AND gs.timestamp >= NOW() - INTERVAL '${daysInt} days'
      GROUP BY DATE(gs.timestamp)
      ORDER BY date DESC
    `, [signageId]);

    // Get blocked attempts (users who attempted multiple times)
    const blockedAttempts = await pool.query(`
      SELECT COUNT(*) as blocked_count
      FROM (
        SELECT 
          u.email_normalized,
          u.phone_normalized,
          COUNT(*) as attempt_count
        FROM users u
        JOIN game_sessions gs ON u.id = gs.user_id
        WHERE gs.signage_id = $1
          AND gs.timestamp >= NOW() - INTERVAL '${daysInt} days'
        GROUP BY u.email_normalized, u.phone_normalized
        HAVING COUNT(*) > 1
      ) duplicates
    `, [signageId]);

    res.json({
      daily_stats: stats.rows,
      blocked_duplicates: parseInt(blockedAttempts.rows[0]?.blocked_count || 0),
      period_days: daysInt
    });
  } catch (error) {
    console.error('Get duplicate attempts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getValidationAnalytics(req, res) {
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

    // Get validation config
    const config = await pool.query(
      'SELECT * FROM validation_config WHERE signage_id = $1',
      [signageId]
    );

    // Get total users and sessions
    const totals = await pool.query(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT gs.id) as total_sessions
      FROM signage_instances si
      LEFT JOIN users u ON u.signage_id = si.id
      LEFT JOIN game_sessions gs ON gs.signage_id = si.id
      WHERE si.id = $1
    `, [signageId]);

    // Get users who played multiple times
    const multiplePlays = await pool.query(`
      SELECT 
        COUNT(*) as users_with_multiple_plays
      FROM (
        SELECT u.id
        FROM users u
        JOIN game_sessions gs ON u.id = gs.user_id
        WHERE gs.signage_id = $1
          AND gs.status = 'completed'
        GROUP BY u.id
        HAVING COUNT(*) > 1
      ) multi
    `, [signageId]);

    res.json({
      config: config.rows[0] || null,
      totals: totals.rows[0],
      multiple_plays: parseInt(multiplePlays.rows[0]?.users_with_multiple_plays || 0)
    });
  } catch (error) {
    console.error('Get validation analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
