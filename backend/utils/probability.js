import { pool } from '../database/init.js';

// Configurable limits (env), with sane defaults
const MAX_GAMES_PER_INSTANCE = parseInt(process.env.MAX_GAMES_PER_INSTANCE || '0', 10); // 0 = no limit
const MAX_OUTCOME_OCCURRENCES = parseInt(process.env.MAX_OUTCOME_OCCURRENCES || '0', 10); // 0 = no limit

export async function selectOutcome(signageId) {
  try {
    // Enforce optional total-games limit per instance
    if (MAX_GAMES_PER_INSTANCE > 0) {
      const totalGames = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM game_sessions WHERE signage_id = $1',
        [signageId]
      );
      if (totalGames.rows[0].cnt >= MAX_GAMES_PER_INSTANCE) {
        throw new Error('Maximum number of games reached for this instance');
      }
    }

    // Get all active outcomes for this specific instance (ordered by weight)
    const result = await pool.query(
      `SELECT * FROM game_outcomes 
       WHERE signage_id = $1 
       AND is_active = true
       ORDER BY probability_weight DESC`,
      [signageId]
    );

    if (result.rows.length === 0) {
      throw new Error('No active outcomes found');
    }

    const outcomes = result.rows;

    // Build occurrence map per outcome for this instance
    let occurrenceMap = {};
    if (MAX_OUTCOME_OCCURRENCES > 0) {
      const occ = await pool.query(
        `SELECT outcome_id, COUNT(*)::int AS cnt
         FROM game_sessions
         WHERE signage_id = $1
         GROUP BY outcome_id`,
        [signageId]
      );
      occurrenceMap = occ.rows.reduce((acc, row) => {
        acc[row.outcome_id] = row.cnt;
        return acc;
      }, {});
    }

    // Filter outcomes that have not exceeded MAX_OUTCOME_OCCURRENCES (if set)
    let eligible = (MAX_OUTCOME_OCCURRENCES > 0)
      ? outcomes.filter(o => (occurrenceMap[o.id] || 0) < MAX_OUTCOME_OCCURRENCES)
      : outcomes;

    // Further filter to exclude outcomes with 0 weight (they should never be selected)
    eligible = eligible.filter(o => o.probability_weight > 0);

    if (eligible.length === 0) {
      throw new Error('No eligible outcomes available (all weights are 0 or limits reached)');
    }

    // Calculate total weight from eligible outcomes only
    const totalWeight = eligible.reduce((sum, outcome) => sum + outcome.probability_weight, 0);

    if (totalWeight === 0) {
      throw new Error('Total weight is zero');
    }

    // Generate random number between 0 and totalWeight
    const random = Math.random() * totalWeight;

    // Select outcome based on weighted probability (only from eligible outcomes)
    let currentWeight = 0;
    for (const outcome of eligible) {
      currentWeight += outcome.probability_weight;
      if (random <= currentWeight) {
        return outcome;
      }
    }

    // Fallback to last eligible outcome (shouldn't happen, but safety)
    return eligible[eligible.length - 1];
  } catch (error) {
    console.error('Probability selection error:', error);
    throw error;
  }
}
