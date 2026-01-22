import { useState, useEffect } from 'react';
import { formatTimestamp } from '../utils/timezone.js';

function SessionsList({ signageId, timezone = 'UTC' }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadSessions();
  }, [signageId, statusFilter]);

  const loadSessions = () => {
    setLoading(true);
    let url = `${window.location.origin}/api/admin/sessions?signageId=${signageId}&limit=100`;
    if (statusFilter) {
      url += `&status=${statusFilter}`;
    }
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setSessions(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load sessions:', err);
        setLoading(false);
      });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'playing': return 'bg-blue-100 text-blue-800';
      case 'queued': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      {loading && (
        <div className="text-center py-8 text-sm text-gray-500">Loading sessions...</div>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Game Sessions</h2>
        <div className="flex flex-wrap gap-2 sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="playing">Playing</option>
            <option value="completed">Completed</option>
          </select>
          <button
            onClick={loadSessions}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outcome
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 sm:px-6 py-4 text-center text-gray-500 text-sm">
                    No sessions found
                  </td>
                </tr>
              ) : (
                sessions.map(session => (
                  <tr key={session.id}>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {session.name || 'Unknown'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {session.outcome_label || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(session.timestamp, timezone)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SessionsList;
