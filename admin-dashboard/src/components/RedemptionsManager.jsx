import { useState, useEffect } from 'react';
import { formatTimestamp } from '../utils/timezone.js';

function RedemptionsManager({ signageId, timezone = 'UTC' }) {
  const [redemptions, setRedemptions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, redeemed, pending
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadRedemptions();
    loadStats();
  }, [signageId, filter]);

  const loadRedemptions = async () => {
    setLoading(true);
    try {
      const status = filter === 'all' ? null : filter;
      const res = await fetch(
        `${window.location.origin}/api/redemptions?signageId=${signageId}&status=${status || ''}`
      );
      const data = await res.json();
      setRedemptions(data);
    } catch (err) {
      console.error('Failed to load redemptions:', err);
      setMessage({ type: 'error', text: 'Failed to load redemptions' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/redemptions/${signageId}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleMarkRedeemed = async (id) => {
    if (!confirm('Mark this redemption as redeemed?')) return;

    try {
      const res = await fetch(`${window.location.origin}/api/redemptions/${id}/redeem`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redeemed_by: 'Admin' })
      });

      if (res.ok) {
        setMessage({ type: 'success', text: 'Redemption marked as redeemed' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        loadRedemptions();
        loadStats();
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update redemption' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update redemption' });
    }
  };

  if (loading && !redemptions.length) {
    return <div className="text-center py-12">Loading redemptions...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Redemptions Management</h2>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Total Redemptions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_redemptions || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Redeemed</p>
            <p className="text-2xl font-bold text-green-600">{stats.redeemed_count || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending_count || 0}</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('redeemed')}
            className={`px-4 py-2 rounded ${filter === 'redeemed' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Redeemed
          </button>
        </div>
      </div>

      {/* Redemptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {redemptions.map((redemption) => (
              <tr key={redemption.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    {redemption.redemption_code}
                  </code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {redemption.outcome_label}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {redemption.user_email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {redemption.user_phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatTimestamp(redemption.created_at || redemption.redeemed_at || redemption.session_timestamp, timezone)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    redemption.is_redeemed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {redemption.is_redeemed ? 'Redeemed' : 'Pending'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {!redemption.is_redeemed && (
                    <button
                      onClick={() => handleMarkRedeemed(redemption.id)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Mark Redeemed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {redemptions.length === 0 && (
          <div className="text-center py-12 text-gray-500">No redemptions found</div>
        )}
      </div>
    </div>
  );
}

export default RedemptionsManager;
