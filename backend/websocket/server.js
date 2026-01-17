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
          // Update session status to completed (only after results are shown on screen)
          try {
            await pool.query(
              'UPDATE game_sessions SET status = $1 WHERE id = $2',
              ['completed', data.sessionId]
            );
            console.log(`✅ Session ${data.sessionId} marked as completed`);

            // Create redemption record for non-negative outcomes
            await createRedemptionRecord(data.sessionId);
          } catch (error) {
            console.error('Error updating session status:', error);
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
 */
async function createRedemptionRecord(sessionId) {
  try {
    const session = await pool.query(`
      SELECT 
        gs.id,
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

    if (session.rows.length > 0) {
      const outcome = session.rows[0];
      
      // Only create redemption for non-negative outcomes
      if (outcome.is_negative) {
        console.log(`⏭️  Skipping redemption code generation for negative outcome: ${outcome.outcome_label} (session ${sessionId})`);
        return; // Exit early for negative outcomes - no redemption code needed
      }
      
      // Generate redemption code only for non-negative outcomes
      const redemptionCode = generateRedemptionCode();
      
      await pool.query(`
        INSERT INTO redemptions (session_id, user_email, user_phone, outcome_id, outcome_label, redemption_code)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (session_id) DO NOTHING
      `, [
        sessionId,
        outcome.email?.toLowerCase().trim() || '',
        outcome.phone?.replace(/\D/g, '') || '',
        outcome.outcome_id,
        outcome.outcome_label,
        redemptionCode
      ]);

      console.log(`🎫 Redemption record created for session ${sessionId} - Code: ${redemptionCode}`);
    }
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
