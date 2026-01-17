/**
 * Data normalization and validation utilities
 */

/**
 * Normalize email address for duplicate checking
 * - Converts to lowercase
 * - Trims whitespace
 * @param {string} email - Email address to normalize
 * @returns {string|null} - Normalized email or null if invalid
 */
export function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Normalize phone number for duplicate checking
 * - Removes all non-digit characters
 * - Handles country codes (removes leading 1 for US numbers)
 * - Returns 10-digit number or null if invalid
 * @param {string} phone - Phone number to normalize
 * @returns {string|null} - Normalized phone (10 digits) or null if invalid
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle country codes (assumes 10-digit US numbers)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1); // Remove leading 1
  }
  
  // Return 10-digit number or null
  return digits.length === 10 ? digits : null;
}

/**
 * Generate a unique redemption code
 * Format: SPIN-XXXX-XXXX (8 random alphanumeric characters)
 * @returns {string} - Redemption code
 */
export function generateRedemptionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars (0, O, I, 1)
  const segments = [];
  
  for (let i = 0; i < 2; i++) {
    let segment = '';
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  
  return `SPIN-${segments.join('-')}`;
}
