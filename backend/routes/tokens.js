import { pool } from '../database/init.js';
import crypto from 'crypto';

// In-memory token store (or use database for persistence)
const activeTokens = new Map();

// Generate a token for a signage instance
export async function generateToken(req, res) {
  try {
    const { signageId } = req.query;
    
    if (!signageId) {
      return res.status(400).json({ error: 'Signage ID is required' });
    }

    // Verify signage exists and is active
    const signageCheck = await pool.query(
      'SELECT id, is_active FROM signage_instances WHERE id = $1',
      [signageId]
    );

    if (signageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Signage not found' });
    }

    if (!signageCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'Signage is not active' });
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes

    // Store token with metadata
    activeTokens.set(token, {
      signageId,
      createdAt: Date.now(),
      expiresAt,
      used: false
    });

    // Clean up expired tokens periodically
    cleanupExpiredTokens();

    res.json({ token, expiresIn: 15 * 60 }); // 15 minutes in seconds
  } catch (error) {
    console.error('Generate token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Validate token
export async function validateToken(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const tokenData = activeTokens.get(token);

    if (!tokenData) {
      return res.status(401).json({ 
        valid: false, 
        error: 'Invalid or expired token. Please scan the QR code again.' 
      });
    }

    // Check if token is expired
    if (Date.now() > tokenData.expiresAt) {
      activeTokens.delete(token);
      return res.status(401).json({ 
        valid: false, 
        error: 'Token has expired. Please scan the QR code again.' 
      });
    }

    res.json({ 
      valid: true, 
      signageId: tokenData.signageId 
    });
  } catch (error) {
    console.error('Validate token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get token data (for internal use)
export function getTokenData(token) {
  return activeTokens.get(token);
}

// Cleanup expired tokens
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of activeTokens.entries()) {
    if (now > data.expiresAt) {
      activeTokens.delete(token);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

// Export activeTokens for use in form.js
export { activeTokens };
