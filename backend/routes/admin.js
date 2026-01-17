import { pool } from '../database/init.js';
import XLSX from 'xlsx';
import { formatTimestamp } from '../utils/timezone.js';

export async function getUsers(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { signageId, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        u.email_normalized,
        u.phone_normalized,
        u.signage_id,
        (u.timestamp AT TIME ZONE 'UTC')::timestamptz as timestamp,
        si.timezone
      FROM users u
      LEFT JOIN signage_instances si ON u.signage_id = si.id
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` WHERE u.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    query += ` ORDER BY u.timestamp DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getSessions(req, res) {
  try {
    // Check database connection
    try {
      await pool.query('SELECT 1');
    } catch (dbError) {
      return res.status(503).json({ 
        error: 'Database connection unavailable. Please ensure PostgreSQL is running.' 
      });
    }

    const { signageId, status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT 
        gs.id,
        gs.user_id,
        gs.signage_id,
        gs.outcome_id,
        gs.status,
        (gs.timestamp AT TIME ZONE 'UTC')::timestamptz as timestamp,
        u.name, 
        u.email, 
        u.phone, 
        go.label as outcome_label,
        si.timezone
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      LEFT JOIN game_outcomes go ON gs.outcome_id = go.id
      LEFT JOIN signage_instances si ON gs.signage_id = si.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` AND gs.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    if (status) {
      query += ` AND gs.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY gs.timestamp DESC LIMIT $${paramCount++} OFFSET $${paramCount}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export users data to CSV/XLS
 * GET /api/admin/export/users?signageId=...&format=csv
 */
export async function exportUsers(req, res) {
  try {
    const { signageId, format = 'csv' } = req.query;

    // Get all users (no limit for export)
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.phone,
        (u.timestamp AT TIME ZONE 'UTC')::timestamptz as registered_at,
        u.signage_id,
        si.location_name,
        si.timezone,
        COUNT(DISTINCT gs.id) as total_sessions,
        COUNT(DISTINCT CASE WHEN gs.status = 'completed' THEN gs.id END) as completed_sessions
      FROM users u
      LEFT JOIN signage_instances si ON u.signage_id = si.id
      LEFT JOIN game_sessions gs ON u.id = gs.user_id
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` WHERE u.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    query += ` GROUP BY u.id, u.name, u.email, u.phone, u.timestamp, u.signage_id, si.location_name, si.timezone
               ORDER BY u.timestamp DESC`;

    const result = await pool.query(query, params);
    const users = result.rows;

    if (format === 'xlsx' || format === 'xls') {
      // Export to Excel
      const worksheet = XLSX.utils.json_to_sheet(users.map(user => ({
        'User ID': user.id,
        'Name': user.name,
        'Email': user.email,
        'Phone': user.phone,
        'Registered At': formatTimestamp(user.registered_at, user.timezone || 'UTC'),
        'Signage ID': user.signage_id,
        'Location Name': user.location_name || '-',
        'Total Sessions': user.total_sessions,
        'Completed Sessions': user.completed_sessions
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=users_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } else {
      // Export to CSV
      const headers = ['User ID', 'Name', 'Email', 'Phone', 'Registered At', 'Signage ID', 'Location Name', 'Total Sessions', 'Completed Sessions'];
      const csvRows = [
        headers.join(','),
        ...users.map(user => [
          user.id,
          `"${(user.name || '').replace(/"/g, '""')}"`,
          `"${(user.email || '').replace(/"/g, '""')}"`,
          `"${(user.phone || '').replace(/"/g, '""')}"`,
          `"${formatTimestamp(user.registered_at, user.timezone || 'UTC')}"`,
          user.signage_id,
          `"${(user.location_name || '-').replace(/"/g, '""')}"`,
          user.total_sessions,
          user.completed_sessions
        ].join(','))
      ];

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export sessions data to CSV/XLS
 * GET /api/admin/export/sessions?signageId=...&format=csv
 */
export async function exportSessions(req, res) {
  try {
    const { signageId, status, format = 'csv' } = req.query;

    let query = `
      SELECT 
        gs.id as session_id,
        gs.status,
        (gs.timestamp AT TIME ZONE 'UTC')::timestamptz as session_date,
        u.id as user_id,
        u.name,
        u.email,
        u.phone,
        go.label as outcome_label,
        go.is_negative,
        gs.signage_id,
        si.location_name,
        si.timezone,
        r.redemption_code,
        r.is_redeemed as redemption_status
      FROM game_sessions gs
      LEFT JOIN users u ON gs.user_id = u.id
      LEFT JOIN game_outcomes go ON gs.outcome_id = go.id
      LEFT JOIN signage_instances si ON gs.signage_id = si.id
      LEFT JOIN redemptions r ON gs.id = r.session_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` AND gs.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    if (status) {
      query += ` AND gs.status = $${paramCount++}`;
      params.push(status);
    }

    query += ` ORDER BY gs.timestamp DESC`;

    const result = await pool.query(query, params);
    const sessions = result.rows;

    if (format === 'xlsx' || format === 'xls') {
      // Export to Excel
      const worksheet = XLSX.utils.json_to_sheet(sessions.map(session => ({
        'Session ID': session.session_id,
        'Status': session.status,
        'Session Date': formatTimestamp(session.session_date, session.timezone || 'UTC'),
        'User ID': session.user_id,
        'Name': session.name,
        'Email': session.email,
        'Phone': session.phone,
        'Outcome': session.outcome_label,
        'Is Negative': session.is_negative ? 'Yes' : 'No',
        'Signage ID': session.signage_id,
        'Location Name': session.location_name || '-',
        'Redemption Code': session.redemption_code || '-',
        'Redemption Status': session.redemption_status ? 'Redeemed' : 'Pending'
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sessions');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sessions_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } else {
      // Export to CSV
      const headers = ['Session ID', 'Status', 'Session Date', 'User ID', 'Name', 'Email', 'Phone', 'Outcome', 'Is Negative', 'Signage ID', 'Location Name', 'Redemption Code', 'Redemption Status'];
      const csvRows = [
        headers.join(','),
        ...sessions.map(session => [
          session.session_id,
          session.status,
          `"${formatTimestamp(session.session_date, session.timezone || 'UTC')}"`,
          session.user_id,
          `"${(session.name || '').replace(/"/g, '""')}"`,
          `"${(session.email || '').replace(/"/g, '""')}"`,
          `"${(session.phone || '').replace(/"/g, '""')}"`,
          `"${(session.outcome_label || '').replace(/"/g, '""')}"`,
          session.is_negative ? 'Yes' : 'No',
          session.signage_id,
          `"${(session.location_name || '-').replace(/"/g, '""')}"`,
          session.redemption_code || '-',
          session.redemption_status ? 'Redeemed' : 'Pending'
        ].join(','))
      ];

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sessions_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Export sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Export redemptions data to CSV/XLS
 * GET /api/admin/export/redemptions?signageId=...&format=csv
 */
export async function exportRedemptions(req, res) {
  try {
    const { signageId, status, format = 'csv' } = req.query;

    let query = `
      SELECT 
        r.id as redemption_id,
        r.redemption_code,
        r.outcome_label,
        r.user_email,
        r.user_phone,
        r.is_redeemed,
        r.redeemed_at,
        r.redeemed_by,
        r.created_at,
        gs.signage_id,
        si.location_name,
        gs.timestamp as session_date
      FROM redemptions r
      JOIN game_sessions gs ON r.session_id = gs.id
      LEFT JOIN signage_instances si ON gs.signage_id = si.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (signageId) {
      query += ` AND gs.signage_id = $${paramCount++}`;
      params.push(signageId);
    }

    if (status === 'redeemed') {
      query += ` AND r.is_redeemed = true`;
    } else if (status === 'pending') {
      query += ` AND r.is_redeemed = false`;
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    const redemptions = result.rows;

    if (format === 'xlsx' || format === 'xls') {
      // Export to Excel
      const worksheet = XLSX.utils.json_to_sheet(redemptions.map(redemption => ({
        'Redemption ID': redemption.redemption_id,
        'Redemption Code': redemption.redemption_code,
        'Outcome': redemption.outcome_label,
        'User Email': redemption.user_email,
        'User Phone': redemption.user_phone,
        'Status': redemption.is_redeemed ? 'Redeemed' : 'Pending',
        'Redeemed At': redemption.redeemed_at ? new Date(redemption.redeemed_at).toLocaleString() : '-',
        'Redeemed By': redemption.redeemed_by || '-',
        'Created At': new Date(redemption.created_at).toLocaleString(),
        'Signage ID': redemption.signage_id,
        'Location Name': redemption.location_name || '-',
        'Session Date': new Date(redemption.session_date).toLocaleString()
      })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Redemptions');

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=redemptions_export_${new Date().toISOString().split('T')[0]}.xlsx`);
      res.send(buffer);
    } else {
      // Export to CSV
      const headers = ['Redemption ID', 'Redemption Code', 'Outcome', 'User Email', 'User Phone', 'Status', 'Redeemed At', 'Redeemed By', 'Created At', 'Signage ID', 'Location Name', 'Session Date'];
      const csvRows = [
        headers.join(','),
        ...redemptions.map(redemption => [
          redemption.redemption_id,
          redemption.redemption_code,
          `"${(redemption.outcome_label || '').replace(/"/g, '""')}"`,
          `"${(redemption.user_email || '').replace(/"/g, '""')}"`,
          `"${(redemption.user_phone || '').replace(/"/g, '""')}"`,
          redemption.is_redeemed ? 'Redeemed' : 'Pending',
          redemption.redeemed_at ? `"${new Date(redemption.redeemed_at).toLocaleString()}"` : '-',
          `"${(redemption.redeemed_by || '-').replace(/"/g, '""')}"`,
          `"${new Date(redemption.created_at).toLocaleString()}"`,
          redemption.signage_id,
          `"${(redemption.location_name || '-').replace(/"/g, '""')}"`,
          `"${new Date(redemption.session_date).toLocaleString()}"`
        ].join(','))
      ];

      const csv = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=redemptions_export_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    }
  } catch (error) {
    console.error('Export redemptions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
