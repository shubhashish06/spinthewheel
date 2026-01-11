import { pool } from '../database/init.js';

export async function getOutcomes(req, res) {
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

    let query = 'SELECT * FROM game_outcomes WHERE is_active = true';
    const params = [];

    if (signageId) {
      query += ' AND (signage_id = $1 OR signage_id IS NULL)';
      params.push(signageId);
    }

    query += ' ORDER BY probability_weight DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get outcomes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createOutcome(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { label, probability_weight, signage_id } = req.body;

    if (!label || probability_weight === undefined) {
      return res.status(400).json({ error: 'Label and probability_weight are required' });
    }

    // Validate weight is a non-negative integer (0 or more)
    const weight = parseInt(probability_weight);
    if (isNaN(weight) || weight < 0) {
      return res.status(400).json({ 
        error: 'probability_weight must be a non-negative integer (0 or more)' 
      });
    }

    // Validate label is a non-empty string
    if (typeof label !== 'string' || label.trim().length === 0) {
      return res.status(400).json({ error: 'Label must be a non-empty string' });
    }

    const { is_negative } = req.body;
    const result = await pool.query(
      `INSERT INTO game_outcomes (label, probability_weight, signage_id, is_active, is_negative)
       VALUES ($1, $2, $3, true, $4)
       RETURNING *`,
      [label.trim(), weight, signage_id || null, is_negative || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create outcome error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateOutcome(req, res) {
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
    const { label, probability_weight, is_active,is_negative } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (label !== undefined) {
      if (typeof label !== 'string' || label.trim().length === 0) {
        return res.status(400).json({ error: 'Label must be a non-empty string' });
      }
      updates.push(`label = $${paramCount++}`);
      values.push(label.trim());
    }
    if (is_negative !== undefined) {
      if (typeof is_negative !== 'boolean') {
        return res.status(400).json({ error: 'is_negative must be a boolean' });
      }
      updates.push(`is_negative = $${paramCount++}`);
      values.push(is_negative);
    }
    
    if (probability_weight !== undefined) {
      // Validate weight is a positive integer
      const weight = parseInt(probability_weight);
      if (isNaN(weight) || weight < 0) {
        return res.status(400).json({ 
          error: 'probability_weight must be non-negative integer(0 or more)' 
        });
      }
      updates.push(`probability_weight = $${paramCount++}`);
      values.push(weight);
    }
    
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return res.status(400).json({ error: 'is_active must be a boolean' });
      }
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE game_outcomes 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update outcome error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update weight for a specific outcome
export async function updateOutcomeWeight(req, res) {
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
    const { probability_weight } = req.body;

    if (probability_weight === undefined) {
      return res.status(400).json({ error: 'probability_weight is required' });
    }

    // Validate weight is a non-negative integer (0 or more)
    const weight = parseInt(probability_weight);
    if (isNaN(weight) || weight < 0) {
      return res.status(400).json({ 
        error: 'probability_weight must be a non-negative integer (0 or more)' 
      });
    }

    const result = await pool.query(
      `UPDATE game_outcomes 
       SET probability_weight = $1
       WHERE id = $2
       RETURNING *`,
      [weight, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update outcome weight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Bulk update weights for multiple outcomes
export async function bulkUpdateWeights(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { outcomes } = req.body;

    if (!Array.isArray(outcomes) || outcomes.length === 0) {
      return res.status(400).json({ 
        error: 'outcomes must be a non-empty array' 
      });
    }

    // Validate all weights
    for (const outcome of outcomes) {
      if (!outcome.id) {
        return res.status(400).json({ 
          error: 'Each outcome must have an id' 
        });
      }
      if (outcome.probability_weight === undefined) {
        return res.status(400).json({ 
          error: 'Each outcome must have a probability_weight' 
        });
      }
      const weight = parseInt(outcome.probability_weight);
      if (isNaN(weight) || weight < 0) {
        return res.status(400).json({ 
          error: `probability_weight for outcome ${outcome.id} must be a non-negative integer (0 or more)` 
        });
      }
    }

    // Update all outcomes in a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatedOutcomes = [];
      for (const outcome of outcomes) {
        const weight = parseInt(outcome.probability_weight);
        const result = await client.query(
          `UPDATE game_outcomes 
           SET probability_weight = $1
           WHERE id = $2
           RETURNING *`,
          [weight, outcome.id]
        );

        if (result.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ 
            error: `Outcome with id ${outcome.id} not found` 
          });
        }

        updatedOutcomes.push(result.rows[0]);
      }

      await client.query('COMMIT');
      res.json({ 
        success: true, 
        message: `Updated ${updatedOutcomes.length} outcome(s)`,
        outcomes: updatedOutcomes
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Bulk update weights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get weight statistics for a signage
export async function getWeightStats(req, res) {
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

    let query = `
      SELECT 
        id,
        label,
        probability_weight,
        ROUND(
          (probability_weight::FLOAT / 
           (SELECT SUM(probability_weight) 
            FROM game_outcomes 
            WHERE (signage_id = $1 OR signage_id IS NULL) 
            AND is_active = true)::FLOAT * 100)::NUMERIC, 
          2
        ) as percentage
      FROM game_outcomes
      WHERE (signage_id = $1 OR signage_id IS NULL)
      AND is_active = true
      ORDER BY probability_weight DESC
    `;

    const result = await pool.query(query, [signageId || null]);

    const totalWeight = result.rows.reduce(
      (sum, row) => sum + parseInt(row.probability_weight), 
      0
    );

    res.json({
      outcomes: result.rows,
      totalWeight,
      signageId: signageId || 'global'
    });
  } catch (error) {
    console.error('Get weight stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteOutcome(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'UPDATE game_outcomes SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Outcome not found' });
    }

    res.json({ success: true, message: 'Outcome deactivated' });
  } catch (error) {
    console.error('Delete outcome error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
