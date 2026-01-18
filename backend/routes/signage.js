import { pool } from '../database/init.js';
import { broadcastToSignage } from '../websocket/server.js';
import { getDefaultBackgroundConfig, createDefaultOutcomes } from '../utils/signage.js';

export async function getSignageConfig(req, res) {
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

    // Get signage instance (no auto-creation)
    const result = await pool.query(
      `SELECT id, location_name, qr_code_url, is_active, background_config, timezone, logo_url, text_config,
              (created_at AT TIME ZONE 'UTC')::timestamptz as created_at 
       FROM signage_instances WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Signage not found. Please create the signage instance first using the admin dashboard or API.' 
      });
    }

    const signage = result.rows[0];

    // Get active outcomes for this signage
    const outcomesResult = await pool.query(
      `SELECT * FROM game_outcomes 
       WHERE signage_id = $1 
       AND is_active = true
       ORDER BY probability_weight DESC`,
      [id]
    );

    // Parse background_config if it exists, otherwise use default
    const backgroundConfig = signage.background_config || {
      type: 'solid',
      color: '#ffffff'
    };

    res.json({
      ...signage,
      background_config: backgroundConfig,
      outcomes: outcomesResult.rows
    });
  } catch (error) {
    console.error('Get signage config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSignageStats(req, res) {
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

    const stats = await pool.query(
      `SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT gs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN gs.status = 'completed' THEN gs.id END) as completed_sessions
       FROM signage_instances si
       LEFT JOIN users u ON u.signage_id = si.id
       LEFT JOIN game_sessions gs ON gs.signage_id = si.id
       WHERE si.id = $1`,
      [id]
    );

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Get signage stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateSignageBackground(req, res) {
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
    const { background_config } = req.body;

    if (!background_config) {
      return res.status(400).json({ error: 'background_config is required' });
    }

    // Validate background config structure
    if (!background_config.type) {
      return res.status(400).json({ error: 'background_config.type is required' });
    }

    const validTypes = ['gradient', 'solid', 'image'];
    if (!validTypes.includes(background_config.type)) {
      return res.status(400).json({ 
        error: `background_config.type must be one of: ${validTypes.join(', ')}` 
      });
    }

    // Validate based on type
    if (background_config.type === 'gradient' && !background_config.colors) {
      return res.status(400).json({ error: 'background_config.colors is required for gradient type' });
    }
    if (background_config.type === 'solid' && !background_config.color) {
      return res.status(400).json({ error: 'background_config.color is required for solid type' });
    }
    if (background_config.type === 'image' && !background_config.url) {
      return res.status(400).json({ error: 'background_config.url is required for image type' });
    }

    const result = await pool.query(
      `UPDATE signage_instances 
       SET background_config = $1
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify(background_config), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signage not found' });
    }

    // Broadcast background update to connected signage displays
    broadcastToSignage(id, {
      type: 'background_update',
      background_config: background_config
    });

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update signage background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSignageBackground(req, res) {
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

    const result = await pool.query(
      'SELECT background_config FROM signage_instances WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signage not found' });
    }

    // Parse JSONB or return default
    let backgroundConfig = result.rows[0].background_config;
    
    // If it's a string, parse it
    if (typeof backgroundConfig === 'string') {
      try {
        backgroundConfig = JSON.parse(backgroundConfig);
      } catch (e) {
        console.error('Failed to parse background_config:', e);
        backgroundConfig = null;
      }
    }
    
    // Return default if null or invalid
    if (!backgroundConfig || typeof backgroundConfig !== 'object') {
      backgroundConfig = {
        type: 'gradient',
        colors: ['#991b1b', '#000000', '#991b1b']
      };
    }

    res.json(backgroundConfig);
  } catch (error) {
    console.error('Get signage background error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// List all signage instances
export async function listSignageInstances(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const result = await pool.query(
      'SELECT id, location_name, is_active, timezone, logo_url, (created_at AT TIME ZONE \'UTC\')::timestamptz as created_at FROM signage_instances ORDER BY created_at DESC'
    );

    // Ensure timestamps are properly formatted as ISO strings for JavaScript
    const rows = result.rows.map(row => ({
      ...row,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null
    }));

    res.json(rows);
  } catch (error) {
    console.error('List signage instances error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Create a new signage instance
export async function createSignageInstance(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { id, location_name, timezone = 'UTC', is_active = true, background_config } = req.body;

    if (!id || !location_name) {
      return res.status(400).json({ error: 'id and location_name are required' });
    }

    // Validate timezone
    try {
      // Test if timezone is valid using Intl API
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch (tzError) {
      return res.status(400).json({ error: `Invalid timezone: ${timezone}` });
    }

    // Validate id format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(id)) {
      return res.status(400).json({ error: 'id must contain only letters, numbers, and underscores' });
    }

    // Use default background config if not provided (ensures consistent visual layout)
    const defaultBackgroundConfig = getDefaultBackgroundConfig();
    const bgConfig = background_config || defaultBackgroundConfig;

    const result = await pool.query(
      `INSERT INTO signage_instances (id, location_name, timezone, is_active, background_config, created_at)
       VALUES ($1, $2, $3, $4, $5, (NOW() AT TIME ZONE 'UTC')::timestamp)
       RETURNING id, location_name, timezone, is_active, background_config, (created_at AT TIME ZONE 'UTC')::timestamptz as created_at`,
      [id, location_name, timezone, is_active, JSON.stringify(bgConfig)]
    );

    // Create default outcomes for this instance (ensures consistent game functionality)
    await createDefaultOutcomes(id);

    // Ensure timestamp is properly formatted as ISO string for JavaScript
    const createdInstance = {
      ...result.rows[0],
      created_at: result.rows[0].created_at ? new Date(result.rows[0].created_at).toISOString() : null
    };

    res.status(201).json(createdInstance);
  } catch (error) {
    if (error.code === '23505') {
      // Unique constraint violation
      return res.status(409).json({ error: 'Signage instance with this id already exists' });
    }
    console.error('Create signage instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update signage instance
export async function updateSignageInstance(req, res) {
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
    const { location_name, is_active, timezone, logo_url, text_config } = req.body;

    // Build update query dynamically based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (location_name !== undefined) {
      updates.push(`location_name = $${paramCount++}`);
      values.push(location_name);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${paramCount++}`);
      values.push(timezone);
    }

    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramCount++}`);
      values.push(logo_url);
    }

    if (text_config !== undefined) {
      updates.push(`text_config = $${paramCount++}`);
      values.push(JSON.stringify(text_config));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const query = `
      UPDATE signage_instances 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Signage not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update signage instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Delete signage instance
export async function deleteSignageInstance(req, res) {
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

    // Check if instance exists
    const check = await pool.query('SELECT id FROM signage_instances WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Signage not found' });
    }

    // Delete related data first (cascade delete)
    await pool.query('DELETE FROM game_sessions WHERE signage_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE signage_id = $1', [id]);
    await pool.query('DELETE FROM game_outcomes WHERE signage_id = $1', [id]);
    await pool.query('DELETE FROM signage_instances WHERE id = $1', [id]);

    res.json({ success: true, message: 'Instance deleted successfully' });
  } catch (error) {
    console.error('Delete signage instance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
