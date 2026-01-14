import { pool } from '../database/init.js';

export async function getValidationConfig(req, res) {
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
    const result = await pool.query(
      'SELECT * FROM validation_config WHERE signage_id = $1',
      [signageId]
    );
    
    if (result.rows.length === 0) {
      // Return default config
      return res.json({
        signage_id: signageId,
        allow_multiple_plays: false,
        max_plays_per_email: 1,
        max_plays_per_phone: 1,
        time_window_hours: null,
        allow_retry_on_negative: false,
        check_across_signages: false,
        check_signage_ids: null
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get validation config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateValidationConfig(req, res) {
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
    const {
      allow_multiple_plays,
      max_plays_per_email,
      max_plays_per_phone,
      time_window_hours,
      allow_retry_on_negative,
      check_across_signages,
      check_signage_ids
    } = req.body;

    // Validate inputs (null means unlimited)
    if (max_plays_per_email !== undefined && max_plays_per_email !== null) {
      if (max_plays_per_email < 1 || !Number.isInteger(max_plays_per_email)) {
        return res.status(400).json({ error: 'Max plays per email must be a positive integer or null (unlimited)' });
      }
    }

    if (max_plays_per_phone !== undefined && max_plays_per_phone !== null) {
      if (max_plays_per_phone < 1 || !Number.isInteger(max_plays_per_phone)) {
        return res.status(400).json({ error: 'Max plays per phone must be a positive integer or null (unlimited)' });
      }
    }

    // Validate time window hours
    let time_window_hours_value = null;
    if (time_window_hours !== null && time_window_hours !== undefined && time_window_hours !== '') {
      const hours = parseInt(time_window_hours);
      if (isNaN(hours) || hours < 1 || !Number.isInteger(hours)) {
        return res.status(400).json({ error: 'Time window must be a positive integer (hours) or null' });
      }
      time_window_hours_value = hours;
    }

    // Validate check_signage_ids format (comma-separated list)
    let validatedSignageIds = null;
    if (check_signage_ids !== null && check_signage_ids !== undefined && check_signage_ids !== '') {
      const ids = check_signage_ids.split(',').map(id => id.trim()).filter(id => id.length > 0);
      if (ids.length > 0) {
        // Validate that all signage IDs exist
        const existingSignages = await pool.query(
          'SELECT id FROM signage_instances WHERE id = ANY($1::text[])',
          [ids]
        );
        const existingIds = existingSignages.rows.map(row => row.id);
        const invalidIds = ids.filter(id => !existingIds.includes(id));
        if (invalidIds.length > 0) {
          return res.status(400).json({ 
            error: `Invalid signage IDs: ${invalidIds.join(', ')}` 
          });
        }
        validatedSignageIds = ids.join(',');
      }
    }

    // Upsert validation config
    const result = await pool.query(`
      INSERT INTO validation_config (
        signage_id, allow_multiple_plays, max_plays_per_email, max_plays_per_phone,
        time_window_hours, allow_retry_on_negative, check_across_signages, check_signage_ids, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      ON CONFLICT (signage_id) 
      DO UPDATE SET
        allow_multiple_plays = $2,
        max_plays_per_email = $3,
        max_plays_per_phone = $4,
        time_window_hours = $5,
        allow_retry_on_negative = $6,
        check_across_signages = $7,
        check_signage_ids = $8,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      signageId,
      allow_multiple_plays !== undefined ? allow_multiple_plays : false,
      max_plays_per_email !== undefined ? (max_plays_per_email === null || max_plays_per_email === '' ? null : max_plays_per_email) : 1,
      max_plays_per_phone !== undefined ? (max_plays_per_phone === null || max_plays_per_phone === '' ? null : max_plays_per_phone) : 1,
      time_window_hours_value,
      allow_retry_on_negative !== undefined ? allow_retry_on_negative : false,
      check_across_signages !== undefined ? check_across_signages : false,
      validatedSignageIds
    ]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update validation config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
