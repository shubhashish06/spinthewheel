import { pool } from '../database/init.js';

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
