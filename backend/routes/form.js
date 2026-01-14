import { pool } from '../database/init.js';
import { selectOutcome } from '../utils/probability.js';
import { broadcastToSignage } from '../websocket/server.js';
import { normalizeEmail, normalizePhone } from '../utils/validation.js';

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

    // Normalize email and phone for duplicate checking
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    if (!normalizedPhone) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Get validation configuration for this signage
    const configResult = await pool.query(
      `SELECT 
        allow_multiple_plays,
        max_plays_per_email,
        max_plays_per_phone,
        time_window_hours,
        allow_retry_on_negative,
        check_across_signages,
        check_signage_ids
      FROM validation_config
      WHERE signage_id = $1`,
      [signageId]
    );

    // Use default config if none exists
    const config = configResult.rows.length > 0 ? configResult.rows[0] : {
      allow_multiple_plays: false,
      max_plays_per_email: 1,
      max_plays_per_phone: 1,
      time_window_hours: null,
      allow_retry_on_negative: false,
      check_across_signages: false,
      check_signage_ids: null
    };

    // Check for existing plays
    const checkSignageFilter = config.check_across_signages ? '' : `AND gs.signage_id = $3`;
    const existingPlayCheck = await pool.query(`
      SELECT 
        gs.id,
        gs.status,
        gs.timestamp,
        go.label as outcome_label,
        go.is_negative
      FROM users u
      JOIN game_sessions gs ON u.id = gs.user_id
      JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE 
        (u.email_normalized = $1 OR u.phone_normalized = $2)
        ${checkSignageFilter}
        AND gs.status IN ('pending', 'playing', 'completed')
      ORDER BY gs.timestamp DESC
      LIMIT 1
    `, config.check_across_signages 
      ? [normalizedEmail, normalizedPhone]
      : [normalizedEmail, normalizedPhone, signageId]
    );

    // Apply validation rules if existing play found
    if (existingPlayCheck.rows.length > 0) {
      const existingPlay = existingPlayCheck.rows[0];

      // Rule 1: If multiple plays not allowed
      if (!config.allow_multiple_plays) {
        return res.status(403).json({ 
          error: 'You have already played this game. Each person can only play once.' 
        });
      }

      // Rule 2: Check time window
      if (config.time_window_hours) {
        const timeDiff = Date.now() - new Date(existingPlay.timestamp).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff < config.time_window_hours) {
          return res.status(403).json({ 
            error: `You can only play once every ${config.time_window_hours} hour${config.time_window_hours !== 1 ? 's' : ''}. Please try again later.` 
          });
        }
      }

      // Rule 3: Check max plays limit
      let playCount;
      if (signageIdsToCheck.length === 1) {
        playCount = await pool.query(`
          SELECT COUNT(*) as count
          FROM users u
          JOIN game_sessions gs ON u.id = gs.user_id
          WHERE 
            (u.email_normalized = $1 OR u.phone_normalized = $2)
            AND gs.signage_id = $3
            AND gs.status = 'completed'
        `, [normalizedEmail, normalizedPhone, signageIdsToCheck[0]]);
      } else {
        playCount = await pool.query(`
          SELECT COUNT(*) as count
          FROM users u
          JOIN game_sessions gs ON u.id = gs.user_id
          WHERE 
            (u.email_normalized = $1 OR u.phone_normalized = $2)
            AND gs.signage_id = ANY($3::text[])
            AND gs.status = 'completed'
        `, [normalizedEmail, normalizedPhone, signageIdsToCheck]);
      }

      // Check max plays limit (null means unlimited)
      const maxPlaysEmail = config.max_plays_per_email || null;
      const maxPlaysPhone = config.max_plays_per_phone || null;
      
      // If both are unlimited (null), skip the check
      if (maxPlaysEmail !== null || maxPlaysPhone !== null) {
        const maxPlays = Math.max(
          maxPlaysEmail !== null ? maxPlaysEmail : 0,
          maxPlaysPhone !== null ? maxPlaysPhone : 0
        );
        if (maxPlays > 0 && parseInt(playCount.rows[0].count) >= maxPlays) {
          return res.status(403).json({ 
            error: `You have reached the maximum number of plays (${maxPlays}).` 
          });
        }
      }

      // Rule 4: Allow retry if last outcome was negative (if enabled)
      if (!config.allow_retry_on_negative) {
        // Check if last completed play had a non-negative outcome
        let lastCompletedPlay;
        if (signageIdsToCheck.length === 1) {
          lastCompletedPlay = await pool.query(`
            SELECT go.is_negative, go.label
            FROM users u
            JOIN game_sessions gs ON u.id = gs.user_id
            JOIN game_outcomes go ON gs.outcome_id = go.id
            WHERE 
              (u.email_normalized = $1 OR u.phone_normalized = $2)
              AND gs.signage_id = $3
              AND gs.status = 'completed'
            ORDER BY gs.timestamp DESC
            LIMIT 1
          `, [normalizedEmail, normalizedPhone, signageIdsToCheck[0]]);
        } else {
          lastCompletedPlay = await pool.query(`
            SELECT go.is_negative, go.label
            FROM users u
            JOIN game_sessions gs ON u.id = gs.user_id
            JOIN game_outcomes go ON gs.outcome_id = go.id
            WHERE 
              (u.email_normalized = $1 OR u.phone_normalized = $2)
              AND gs.signage_id = ANY($3::text[])
              AND gs.status = 'completed'
            ORDER BY gs.timestamp DESC
            LIMIT 1
          `, [normalizedEmail, normalizedPhone, signageIdsToCheck]);
        }

        if (lastCompletedPlay.rows.length > 0) {
          const lastOutcome = lastCompletedPlay.rows[0];
          // If last outcome was not negative and not "Try Again", block replay
          if (!lastOutcome.is_negative && lastOutcome.label !== 'Try Again') {
            return res.status(403).json({ 
              error: 'You have already played and received an outcome. Each person can only play once.' 
            });
          }
        }
      }
    }

    // Create user record with normalized data
    const userResult = await pool.query(
      `INSERT INTO users (name, email, phone, email_normalized, phone_normalized, signage_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, timestamp`,
      [name, email || null, phone || null, normalizedEmail, normalizedPhone, signageId]
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

/**
 * Check if a user is eligible to play (before form submission)
 * GET /api/check-eligibility?email=...&phone=...&signageId=...
 */
export async function checkEligibility(req, res) {
  try {
    const { email, phone, signageId } = req.query;

    if (!email || !phone || !signageId) {
      return res.status(400).json({ 
        error: 'Email, phone, and signageId are required' 
      });
    }

    // Normalize input
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail || !normalizedPhone) {
      return res.status(400).json({ 
        error: 'Invalid email or phone format' 
      });
    }

    // Get validation configuration
    const configResult = await pool.query(
      `SELECT 
        allow_multiple_plays,
        max_plays_per_email,
        max_plays_per_phone,
        time_window_hours,
        allow_retry_on_negative,
        check_across_signages
      FROM validation_config
      WHERE signage_id = $1`,
      [signageId]
    );

    const config = configResult.rows.length > 0 ? configResult.rows[0] : {
      allow_multiple_plays: false,
      max_plays_per_email: 1,
      max_plays_per_phone: 1,
      time_window_hours: null,
      allow_retry_on_negative: false,
      check_across_signages: false
    };

    // Check for existing plays
    const checkSignageFilter = config.check_across_signages ? '' : `AND gs.signage_id = $3`;
    const existingPlayCheck = await pool.query(`
      SELECT 
        gs.id,
        gs.status,
        gs.timestamp,
        go.label as outcome_label,
        go.is_negative
      FROM users u
      JOIN game_sessions gs ON u.id = gs.user_id
      JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE 
        (u.email_normalized = $1 OR u.phone_normalized = $2)
        ${checkSignageFilter}
        AND gs.status IN ('pending', 'playing', 'completed')
      ORDER BY gs.timestamp DESC
      LIMIT 1
    `, config.check_across_signages 
      ? [normalizedEmail, normalizedPhone]
      : [normalizedEmail, normalizedPhone, signageId]
    );

    let eligible = true;
    let reason = null;

    if (existingPlayCheck.rows.length > 0) {
      const existingPlay = existingPlayCheck.rows[0];

      if (!config.allow_multiple_plays) {
        eligible = false;
        reason = 'You have already played this game. Each person can only play once.';
      } else if (config.time_window_hours) {
        const timeDiff = Date.now() - new Date(existingPlay.timestamp).getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff < config.time_window_hours) {
          eligible = false;
          reason = `You can only play once every ${config.time_window_hours} hour${config.time_window_hours !== 1 ? 's' : ''}. Please try again later.`;
        }
      } else {
        // Check max plays
        let playCount;
        if (signageIdsToCheck.length === 1) {
          playCount = await pool.query(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN game_sessions gs ON u.id = gs.user_id
            WHERE 
              (u.email_normalized = $1 OR u.phone_normalized = $2)
              AND gs.signage_id = $3
              AND gs.status = 'completed'
          `, [normalizedEmail, normalizedPhone, signageIdsToCheck[0]]);
        } else {
          playCount = await pool.query(`
            SELECT COUNT(*) as count
            FROM users u
            JOIN game_sessions gs ON u.id = gs.user_id
            WHERE 
              (u.email_normalized = $1 OR u.phone_normalized = $2)
              AND gs.signage_id = ANY($3::text[])
              AND gs.status = 'completed'
          `, [normalizedEmail, normalizedPhone, signageIdsToCheck]);
        }

        // Check max plays limit (null means unlimited)
        const maxPlaysEmail = config.max_plays_per_email || null;
        const maxPlaysPhone = config.max_plays_per_phone || null;
        
        // If both are unlimited (null), skip the check
        if (maxPlaysEmail !== null || maxPlaysPhone !== null) {
          const maxPlays = Math.max(
            maxPlaysEmail !== null ? maxPlaysEmail : 0,
            maxPlaysPhone !== null ? maxPlaysPhone : 0
          );
          if (maxPlays > 0 && parseInt(playCount.rows[0].count) >= maxPlays) {
            eligible = false;
            reason = `You have reached the maximum number of plays (${maxPlays}).`;
          }
        }
      }
    }

    res.json({
      eligible,
      reason: reason || null
    });
  } catch (error) {
    console.error('Check eligibility error:', error);
    const message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (error.message || 'Internal server error');
    res.status(500).json({ error: message });
  }
}

/**
 * Verify redemption code
 * POST /api/verify-redemption
 * Body: { email, phone, redemptionCode }
 */
export async function verifyRedemption(req, res) {
  try {
    const { email, phone, redemptionCode } = req.body;

    if (!email || !phone || !redemptionCode) {
      return res.status(400).json({ 
        error: 'Email, phone, and redemption code are required' 
      });
    }

    // Normalize input
    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedEmail || !normalizedPhone) {
      return res.status(400).json({ 
        error: 'Invalid email or phone format' 
      });
    }

    // Check redemption
    const redemption = await pool.query(`
      SELECT 
        id,
        session_id,
        user_email,
        user_phone,
        outcome_label,
        redemption_code,
        is_redeemed,
        redeemed_at,
        redeemed_by
      FROM redemptions
      WHERE redemption_code = $1
    `, [redemptionCode.toUpperCase()]);

    if (redemption.rows.length === 0) {
      return res.status(404).json({ 
        valid: false,
        error: 'Invalid redemption code' 
      });
    }

    const redemptionRecord = redemption.rows[0];

    // Verify email/phone matches
    const emailMatch = redemptionRecord.user_email.toLowerCase() === normalizedEmail;
    const phoneMatch = redemptionRecord.user_phone === normalizedPhone;

    if (!emailMatch || !phoneMatch) {
      return res.status(403).json({ 
        valid: false,
        error: 'Redemption code does not match the provided email or phone number' 
      });
    }

    // Check if already redeemed
    if (redemptionRecord.is_redeemed) {
      return res.json({
        valid: true,
        redeemed: true,
        redeemedAt: redemptionRecord.redeemed_at,
        redeemedBy: redemptionRecord.redeemed_by,
        outcome: redemptionRecord.outcome_label,
        message: 'This redemption code has already been used.'
      });
    }

    res.json({
      valid: true,
      redeemed: false,
      outcome: redemptionRecord.outcome_label,
      sessionId: redemptionRecord.session_id,
      message: 'Redemption code is valid and ready to use.'
    });
  } catch (error) {
    console.error('Verify redemption error:', error);
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