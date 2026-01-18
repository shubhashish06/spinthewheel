import { pool } from '../database/init.js';

/**
 * Default outcomes that will be created for new signage instances
 * These ensure consistent game functionality across all businesses
 */
const DEFAULT_OUTCOMES = [
  { label: '10% Discount', weight: 30 },
  { label: 'Free Item', weight: 10 },
  { label: 'Try Again', weight: 40 },
  { label: '20% Discount', weight: 15 },
  { label: 'Grand Prize', weight: 5 }
];

/**
 * Default background configuration for new signage instances
 * Ensures consistent visual layout across all businesses
 * Apple-inspired minimalist design with white background
 */
const DEFAULT_BACKGROUND_CONFIG = {
  type: 'solid',
  color: '#ffffff'
};

/**
 * Creates default outcomes for a signage instance
 * @param {string} signageId - The signage instance ID
 */
export async function createDefaultOutcomes(signageId) {
  try {
    // Check if outcomes already exist for this signage
    const existingCheck = await pool.query(
      'SELECT COUNT(*) FROM game_outcomes WHERE signage_id = $1',
      [signageId]
    );

    if (parseInt(existingCheck.rows[0].count) > 0) {
      console.log(`ℹ️  Outcomes already exist for signage ${signageId}, skipping creation`);
      return;
    }

    // Create default outcomes for this signage instance
    for (const outcome of DEFAULT_OUTCOMES) {
      await pool.query(
        `INSERT INTO game_outcomes (label, probability_weight, is_active, signage_id)
         VALUES ($1, $2, true, $3)`,
        [outcome.label, outcome.weight, signageId]
      );
    }

    console.log(`✅ Created ${DEFAULT_OUTCOMES.length} default outcomes for signage ${signageId}`);
  } catch (error) {
    console.error(`Error creating default outcomes for signage ${signageId}:`, error);
    throw error;
  }
}

/**
 * Gets the default background configuration
 * @returns {Object} Default background config
 */
export function getDefaultBackgroundConfig() {
  return DEFAULT_BACKGROUND_CONFIG;
}

/**
 * Creates a new signage instance with default settings
 * @param {string} signageId - The signage instance ID
 * @param {string} locationName - The location name (optional, will be auto-generated if not provided)
 * @returns {Promise<Object>} The created signage instance
 */
export async function createSignageInstanceWithDefaults(signageId, locationName = null) {
  // Auto-generate location name if not provided
  if (!locationName) {
    locationName = signageId.charAt(0).toUpperCase() + signageId.slice(1).replace(/_/g, ' ');
  }

  try {
    // Create the signage instance
    const result = await pool.query(
      `INSERT INTO signage_instances (id, location_name, is_active, background_config)
       VALUES ($1, $2, true, $3)
       RETURNING *`,
      [signageId, locationName, JSON.stringify(DEFAULT_BACKGROUND_CONFIG)]
    );

    console.log(`✅ Created signage instance: ${signageId} (${locationName})`);

    // Create default outcomes for this instance
    await createDefaultOutcomes(signageId);

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      // Duplicate key - instance already exists
      const existing = await pool.query(
        'SELECT * FROM signage_instances WHERE id = $1',
        [signageId]
      );
      return existing.rows[0];
    }
    throw error;
  }
}
