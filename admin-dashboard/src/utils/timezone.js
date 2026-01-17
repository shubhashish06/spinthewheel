/**
 * Format a timestamp to a specific timezone
 * @param {Date|string} timestamp - The timestamp to format
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York', 'Asia/Kolkata', 'UTC')
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export function formatTimestamp(timestamp, timezone = 'UTC', options = {}) {
  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    // Validate and normalize timezone
    let validTimezone = timezone || 'UTC';
    try {
      // Test if timezone is valid
      Intl.DateTimeFormat(undefined, { timeZone: validTimezone });
    } catch (tzError) {
      // Invalid timezone, fallback to UTC
      console.warn(`Invalid timezone "${validTimezone}", using UTC instead`);
      validTimezone = 'UTC';
    }

    const defaultOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: validTimezone,
      ...options
    };

    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Timezone formatting error:', error, { timestamp, timezone });
    // Fallback: try to format without timezone
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (fallbackError) {
      return 'Invalid Date';
    }
  }
}

/**
 * Get list of common timezones
 * @returns {Array} Array of {value, label} objects
 */
export function getCommonTimezones() {
  return [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Toronto', label: 'Toronto' },
    { value: 'America/Mexico_City', label: 'Mexico City' },
    { value: 'America/Sao_Paulo', label: 'São Paulo' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Europe/Madrid', label: 'Madrid' },
    { value: 'Europe/Rome', label: 'Rome' },
    { value: 'Europe/Moscow', label: 'Moscow' },
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'Australia/Melbourne', label: 'Melbourne' },
    { value: 'Pacific/Auckland', label: 'Auckland' }
  ];
}
