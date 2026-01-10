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
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        signage_id VARCHAR(50) REFERENCES signage_instances(id)
      )
    `);

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

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_signage_id ON users(signage_id);
      CREATE INDEX IF NOT EXISTS idx_users_timestamp ON users(timestamp);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_signage_id ON game_sessions(signage_id);
      CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_game_outcomes_signage_id ON game_outcomes(signage_id);
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

    console.log('✅ Database initialized successfully');
    return pool;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export { pool };
