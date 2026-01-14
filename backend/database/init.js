import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Parse DATABASE_URL or use individual components
let poolConfig;

// Check if DATABASE_URL is set and valid
if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
  const dbUrl = process.env.DATABASE_URL.trim();
  
  // Validate that URL contains password (has @ after ://)
  if (dbUrl.includes('@') && dbUrl.includes('://')) {
    poolConfig = {
      connectionString: dbUrl,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
  } else {
    // URL format is invalid, use individual parameters
    console.warn('⚠️  DATABASE_URL format invalid, using individual parameters');
    poolConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'spinthewheel',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    };
  }
} else {
  // Use individual connection parameters
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'spinthewheel',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
  };
}

// Ensure password is always a string
if (poolConfig.password !== undefined && typeof poolConfig.password !== 'string') {
  poolConfig.password = String(poolConfig.password);
}

const pool = new Pool(poolConfig);

// Handle pool errors gracefully
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export async function initDatabase() {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signage_instances (
        id VARCHAR(50) PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL,
        qr_code_url TEXT,
        is_active BOOLEAN DEFAULT true,
        background_config JSONB DEFAULT '{"type": "gradient", "colors": ["#991b1b", "#000000", "#991b1b"]}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add background_config column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE signage_instances 
        ADD COLUMN IF NOT EXISTS background_config JSONB DEFAULT '{"type": "gradient", "colors": ["#991b1b", "#000000", "#991b1b"]}'
      `);
    } catch (err) {
      // Column might already exist, ignore error
      console.log('Background config column check:', err.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        email_normalized VARCHAR(255),
        phone_normalized VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        signage_id VARCHAR(50) REFERENCES signage_instances(id)
      )
    `);

    // Add normalization columns if they don't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS email_normalized VARCHAR(255)
      `);
    } catch (err) {
      console.log('email_normalized column check:', err.message);
    }

    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS phone_normalized VARCHAR(50)
      `);
    } catch (err) {
      console.log('phone_normalized column check:', err.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_outcomes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        label VARCHAR(255) NOT NULL,
        probability_weight INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        signage_id VARCHAR(50) REFERENCES signage_instances(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Add is_negative column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE game_outcomes 
        ADD COLUMN IF NOT EXISTS is_negative BOOLEAN DEFAULT false
      `);
    } catch (err) {
      // Column might already exist, ignore error
      console.log('is_negative column check:', err.message);
    }


    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        signage_id VARCHAR(50) REFERENCES signage_instances(id),
        outcome_id UUID REFERENCES game_outcomes(id),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'queued'
      )
    `);

    // Create redemptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES game_sessions(id) UNIQUE,
        user_email VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        outcome_id UUID REFERENCES game_outcomes(id),
        outcome_label VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        redeemed_at TIMESTAMP,
        redemption_code VARCHAR(50) UNIQUE,
        is_redeemed BOOLEAN DEFAULT false,
        redeemed_by VARCHAR(255),
        notes TEXT
      )
    `);

    // Add created_at column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE redemptions 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
    } catch (err) {
      console.log('created_at column check for redemptions:', err.message);
    }

    // Create validation_config table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS validation_config (
        signage_id VARCHAR(50) PRIMARY KEY REFERENCES signage_instances(id),
        allow_multiple_plays BOOLEAN DEFAULT false,
        max_plays_per_email INTEGER DEFAULT 1,
        max_plays_per_phone INTEGER DEFAULT 1,
        time_window_hours INTEGER DEFAULT NULL,
        allow_retry_on_negative BOOLEAN DEFAULT false,
        check_across_signages BOOLEAN DEFAULT false,
        check_signage_ids TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add check_signage_ids column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE validation_config 
        ADD COLUMN IF NOT EXISTS check_signage_ids TEXT DEFAULT NULL
      `);
    } catch (err) {
      console.log('check_signage_ids column check:', err.message);
    }

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_signage_id ON users(signage_id);
      CREATE INDEX IF NOT EXISTS idx_users_timestamp ON users(timestamp);
      CREATE INDEX IF NOT EXISTS idx_users_email_normalized ON users(email_normalized, signage_id);
      CREATE INDEX IF NOT EXISTS idx_users_phone_normalized ON users(phone_normalized, signage_id);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_signage_id ON game_sessions(signage_id);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_completed ON game_sessions(status, timestamp) 
        WHERE status = 'completed';
      CREATE INDEX IF NOT EXISTS idx_game_outcomes_signage_id ON game_outcomes(signage_id);
      CREATE INDEX IF NOT EXISTS idx_redemptions_email ON redemptions(user_email);
      CREATE INDEX IF NOT EXISTS idx_redemptions_phone ON redemptions(user_phone);
      CREATE INDEX IF NOT EXISTS idx_redemptions_session ON redemptions(session_id);
    `);

    // Insert default signage instance if none exists
    const signageCheck = await pool.query('SELECT COUNT(*) FROM signage_instances');
    if (parseInt(signageCheck.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO signage_instances (id, location_name, is_active)
        VALUES ('DEFAULT', 'Main Display', true)
      `);
      
      // Insert default outcomes
      const defaultOutcomes = [
        { label: '10% Discount', weight: 30 },
        { label: 'Free Item', weight: 10 },
        { label: 'Try Again', weight: 40 },
        { label: '20% Discount', weight: 15 },
        { label: 'Grand Prize', weight: 5 }
      ];

      for (const outcome of defaultOutcomes) {
        await pool.query(`
          INSERT INTO game_outcomes (label, probability_weight, is_active, signage_id)
          VALUES ($1, $2, true, 'DEFAULT')
        `, [outcome.label, outcome.weight]);
      }
    }

    // Create default validation config for all signage instances that don't have one
    try {
      await pool.query(`
        INSERT INTO validation_config (signage_id, allow_multiple_plays, max_plays_per_email, time_window_hours)
        SELECT id, false, 1, NULL
        FROM signage_instances
        WHERE id NOT IN (SELECT signage_id FROM validation_config)
      `);
    } catch (err) {
      console.log('Validation config initialization:', err.message);
    }

    // Migrate existing data: normalize email and phone for existing users
    try {
      await pool.query(`
        UPDATE users 
        SET 
          email_normalized = LOWER(TRIM(email)),
          phone_normalized = REGEXP_REPLACE(phone, '[^0-9]', '', 'g')
        WHERE (email_normalized IS NULL AND email IS NOT NULL) 
           OR (phone_normalized IS NULL AND phone IS NOT NULL)
      `);
      console.log('✅ Migrated existing user data (normalized email/phone)');
    } catch (err) {
      console.log('User data migration:', err.message);
    }

    console.log('✅ Database initialized successfully');
    return pool;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export { pool };
