/**
 * Migration script for data validation features
 * 
 * This script:
 * 1. Normalizes existing user email/phone data
 * 2. Creates redemption records for existing completed sessions
 * 3. Creates default validation config for all signage instances
 * 
 * Usage: node backend/database/migrate-validation.js
 */

import { pool, initDatabase } from './init.js';
import { generateRedemptionCode } from '../utils/validation.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateValidationData() {
  try {
    console.log('🔄 Starting validation data migration...');

    // Ensure database is initialized
    await initDatabase();

    // Step 1: Normalize existing user email/phone data
    console.log('📧 Normalizing existing user email/phone data...');
    const normalizeResult = await pool.query(`
      UPDATE users 
      SET 
        email_normalized = LOWER(TRIM(email)),
        phone_normalized = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
      WHERE (email_normalized IS NULL AND email IS NOT NULL) 
         OR (phone_normalized IS NULL AND phone IS NOT NULL)
    `);
    console.log(`✅ Normalized ${normalizeResult.rowCount} user records`);

    // Step 2: Create redemption records for existing completed sessions with non-negative outcomes
    console.log('🎫 Creating redemption records for existing completed sessions...');
    const redemptionResult = await pool.query(`
      INSERT INTO redemptions (session_id, user_email, user_phone, outcome_id, outcome_label, redemption_code)
      SELECT 
        gs.id,
        LOWER(TRIM(u.email)),
        REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g'),
        go.id,
        go.label,
        'MIGRATED-' || UPPER(SUBSTRING(gs.id::text, 1, 8)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 4))
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      JOIN game_outcomes go ON gs.outcome_id = go.id
      WHERE gs.status = 'completed' 
        AND go.is_negative = false
        AND gs.id NOT IN (SELECT session_id FROM redemptions WHERE session_id IS NOT NULL)
      ON CONFLICT (session_id) DO NOTHING
    `);
    console.log(`✅ Created ${redemptionResult.rowCount} redemption records`);

    // Step 3: Create default validation config for all signage instances that don't have one
    console.log('⚙️  Creating default validation config for signage instances...');
    const configResult = await pool.query(`
      INSERT INTO validation_config (signage_id, allow_multiple_plays, max_plays_per_email, time_window_hours)
      SELECT id, false, 1, NULL
      FROM signage_instances
      WHERE id NOT IN (SELECT signage_id FROM validation_config)
    `);
    console.log(`✅ Created ${configResult.rowCount} validation config records`);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run migration
migrateValidationData();
