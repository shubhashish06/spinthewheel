import { pool } from '../database/init.js';
import { generateRedemptionCode } from '../utils/validation.js';

// Map of signage ID to Set of WebSocket connections
const signageConnections = new Map();

export function setupWebSocket(wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const signageId = url.pathname.split('/').pop();

    if (!signageId) {
      ws.close(1008, 'Signage ID required');
      return;
    }

    // Add connection to signage room
    if (!signageConnections.has(signageId)) {
      signageConnections.set(signageId, new Set());
    }
    signageConnections.get(signageId).add(ws);

    console.log(`📡 WebSocket connected for signage: ${signageId}`);

    // Send initial state
    ws.send(JSON.stringify({
      type: 'connected',
      signageId
    }));

    // Handle messages from signage
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'game_complete') {
          // ✅ Validate sessionId before processing
          if (!data.sessionId) {
            console.error('❌ game_complete message missing sessionId');
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'sessionId required for game_complete' 
            }));
            return;
          }
          
          // ✅ Validate UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(data.sessionId)) {
            console.error('❌ Invalid sessionId format:', data.sessionId);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Invalid sessionId format' 
            }));
            return;
          }
          
          // Update session status to completed (only after results are shown on screen)
          try {
            const updateResult = await pool.query(
              'UPDATE game_sessions SET status = $1 WHERE id = $2',
              ['completed', data.sessionId]
            );
            
            if (updateResult.rowCount === 0) {
              console.warn(`⚠️  Session ${data.sessionId} not found for completion`);
            } else {
              console.log(`✅ Session ${data.sessionId} marked as completed`);

              // Create redemption record for non-negative outcomes
              await createRedemptionRecord(data.sessionId);
            }
          } catch (error) {
            console.error('Error updating session status:', error);
            // ✅ Try HTTP fallback or log for manual cleanup
            console.error(`❌ Failed to complete session ${data.sessionId} via WebSocket`);
          }
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      const connections = signageConnections.get(signageId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          signageConnections.delete(signageId);
        }
      }
      console.log(`📡 WebSocket disconnected for signage: ${signageId}`);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

/**
 * Create redemption record for completed game sessions with non-negative outcomes
 * Uses normalized email/phone from users table to ensure data consistency
 */
async function createRedemptionRecord(sessionId) {
  try {
    // Use same query structure as completeSession to ensure data alignment
    // JOIN ensures user and outcome exist (no NULL values)
    const session = await pool.query(`
      SELECT 
        gs.id,
        gs.status,
        gs.signage_id,
        u.email_normalized,
        u.phone_normalized,
        u.email,
        u.phone,
        go.id as outcome_id,
        go.label as outcome_label,
        go.is_negative
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE gs.id = $1 AND gs.status = 'completed'
    `, [sessionId]);

    if (session.rows.length === 0) {
      console.warn(`⚠️  Session ${sessionId} not found or not completed - skipping redemption creation`);
      return;
    }

    const sessionData = session.rows[0];
    
    // Validate required fields
    if (!sessionData.outcome_id || !sessionData.outcome_label) {
      console.error(`❌ Invalid session data for ${sessionId}: missing outcome`);
      return;
    }
    
    // Only create redemption for non-negative outcomes
    if (sessionData.is_negative) {
      console.log(`⏭️  Skipping redemption code generation for negative outcome: ${sessionData.outcome_label} (session ${sessionId})`);
      return; // Exit early for negative outcomes - no redemption code needed
    }
    
    // Use normalized email/phone from users table for consistency
    // Fallback to normalized raw email/phone if normalized columns are NULL (for older records)
    const userEmail = sessionData.email_normalized || (sessionData.email ? sessionData.email.toLowerCase().trim() : '');
    const userPhone = sessionData.phone_normalized || (sessionData.phone ? sessionData.phone.replace(/\D/g, '') : '');
    
    if (!userEmail || !userPhone) {
      console.error(`❌ Invalid user data for session ${sessionId}: missing email or phone`);
      return;
    }
    
    // Generate redemption code only for non-negative outcomes
    const redemptionCode = generateRedemptionCode();
    
    await pool.query(`
      INSERT INTO redemptions (session_id, user_email, user_phone, outcome_id, outcome_label, redemption_code)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id) DO UPDATE SET
        user_email = EXCLUDED.user_email,
        user_phone = EXCLUDED.user_phone,
        outcome_id = EXCLUDED.outcome_id,
        outcome_label = EXCLUDED.outcome_label
    `, [
      sessionId,
      userEmail,
      userPhone,
      sessionData.outcome_id,
      sessionData.outcome_label,
      redemptionCode
    ]);

    console.log(`🎫 Redemption record created for session ${sessionId} - Code: ${redemptionCode}`);
  } catch (error) {
    console.error('Error creating redemption record:', error);
    // Don't throw - redemption creation failure shouldn't break game completion
  }
}

export function broadcastToSignage(signageId, message) {
  const connections = signageConnections.get(signageId);
  if (connections) {
    const messageStr = JSON.stringify(message);
    connections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(messageStr);
      }
    });
    console.log(`📢 Broadcasted to signage ${signageId}:`, message.type);
  } else {
    console.log(`⚠️  No connections for signage ${signageId}`);
  }
}
