import { useState, useEffect } from 'react';

function AnalyticsManager({ signageId }) {
  const [analytics, setAnalytics] = useState(null);
  const [duplicateStats, setDuplicateStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadAnalytics();
    loadDuplicateStats();
  }, [signageId, days]);

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/analytics/validation/${signageId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDuplicateStats = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/analytics/duplicates?signageId=${signageId}&days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setDuplicateStats(data);
      }
    } catch (err) {
      console.error('Failed to load duplicate stats:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics & Insights</h2>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="text-sm font-medium text-gray-700 mr-4">
          Analysis Period:
        </label>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Validation Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.totals?.total_users || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Sessions</p>
            <p className="text-2xl font-bold text-gray-900">{analytics.totals?.total_sessions || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Users with Multiple Plays</p>
            <p className="text-2xl font-bold text-orange-600">{analytics.multiple_plays || 0}</p>
          </div>
        </div>
      )}

      {/* Duplicate Attempts */}
      {duplicateStats && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Duplicate Attempt Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Blocked Duplicate Attempts</p>
              <p className="text-2xl font-bold text-red-600">{duplicateStats.blocked_duplicates || 0}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Analysis Period</p>
              <p className="text-lg font-semibold text-gray-900">{duplicateStats.period_days} days</p>
            </div>
          </div>
          
          {duplicateStats.daily_stats && duplicateStats.daily_stats.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Breakdown</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Total Attempts</th>
                      <th className="text-right py-2">Unique Emails</th>
                      <th className="text-right py-2">Unique Phones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duplicateStats.daily_stats.slice(0, 10).map((stat, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2">{new Date(stat.date).toLocaleDateString()}</td>
                        <td className="text-right py-2">{stat.total_attempts}</td>
                        <td className="text-right py-2">{stat.unique_emails}</td>
                        <td className="text-right py-2">{stat.unique_phones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Validation Config */}
      {analytics?.config && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Validation Rules</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Multiple Plays:</span>{' '}
              {analytics.config.allow_multiple_plays ? '✅ Enabled' : '❌ Disabled'}
            </div>
            <div>
              <span className="font-medium">Max Plays:</span>{' '}
              {analytics.config.max_plays_per_email === null || analytics.config.max_plays_per_email === undefined
                ? 'Unlimited'
                : analytics.config.max_plays_per_email}
            </div>
            <div>
              <span className="font-medium">Time Window:</span>{' '}
              {analytics.config.time_window_hours 
                ? `${analytics.config.time_window_hours} hour${analytics.config.time_window_hours !== 1 ? 's' : ''}` 
                : 'Lifetime'}
            </div>
            <div>
              <span className="font-medium">Retry on Negative:</span>{' '}
              {analytics.config.allow_retry_on_negative ? '✅ Enabled' : '❌ Disabled'}
            </div>
            <div>
              <span className="font-medium">Check Across Signages:</span>{' '}
              {analytics.config.check_signage_ids 
                ? `✅ ${analytics.config.check_signage_ids.split(',').length} signage(s): ${analytics.config.check_signage_ids}`
                : '❌ Only this signage'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsManager;
