import { useState, useEffect } from 'react';
import { getCommonTimezones, formatTimestamp } from '../utils/timezone.js';

function SuperAdmin() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ id: '', location_name: '', timezone: 'UTC' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ location_name: '', is_active: true, timezone: 'UTC' });

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${window.location.origin}/api/signage`);
      if (response.ok) {
        const data = await response.json();
        setInstances(data);
      } else {
        setMessage({ type: 'error', text: 'Failed to load instances' });
      }
    } catch (err) {
      console.error('Failed to load instances:', err);
      setMessage({ type: 'error', text: 'Failed to load instances' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.id || !formData.location_name) {
      setMessage({ type: 'error', text: 'ID and location name are required' });
      return;
    }

    // Validate ID format
    if (!/^[a-zA-Z0-9_]+$/.test(formData.id)) {
      setMessage({ type: 'error', text: 'ID must contain only letters, numbers, and underscores' });
      return;
    }

    try {
      const response = await fetch(`${window.location.origin}/api/signage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          location_name: formData.location_name,
          timezone: formData.timezone,
          is_active: true
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Instance created successfully!' });
        setFormData({ id: '', location_name: '', timezone: 'UTC' });
        setShowCreateForm(false);
        loadInstances();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to create instance' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to create instance' });
    }
  };

  const handleEdit = (instance) => {
    setEditingId(instance.id);
    setEditData({
      location_name: instance.location_name,
      is_active: instance.is_active,
      timezone: instance.timezone || 'UTC'
    });
  };

  const handleUpdate = async (id) => {
    try {
      const response = await fetch(`${window.location.origin}/api/signage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Instance updated successfully!' });
        setEditingId(null);
        loadInstances();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update instance' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update instance' });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Are you sure you want to delete instance "${id}"? This will delete all associated data (users, sessions, outcomes). This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`${window.location.origin}/api/signage/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Instance deleted successfully!' });
        loadInstances();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to delete instance' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete instance' });
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      const response = await fetch(`${window.location.origin}/api/signage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        loadInstances();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to toggle instance status' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to toggle instance status' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-light text-gray-600">Loading instances...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Slim Fixed Top Navigation Bar - Apple Style */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-lg font-light text-gray-900 tracking-tight">Spin the Wheel</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="pt-14 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <h2 className="text-2xl sm:text-3xl font-light text-gray-900 tracking-tight leading-[1.1] mb-2">
            Manage Instances
          </h2>
          <p className="text-sm sm:text-base font-light text-gray-600 tracking-wide max-w-2xl">
            Create, edit, and manage all signage instances
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div></div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-sm sm:text-base font-light text-gray-900 hover:text-gray-600 transition-colors"
          >
            {showCreateForm ? 'Cancel' : <span className="hidden sm:inline">Create New Instance </span>}
            {!showCreateForm && <span className="sm:hidden">Create →</span>}
          </button>
        </div>

        {message.text && (
          <div className={`mb-6 sm:mb-8 p-3 sm:p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 text-green-900 border-green-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}>
            <div className="text-xs sm:text-sm font-light">{message.text}</div>
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white border border-gray-200/50 rounded-2xl p-4 sm:p-8 mb-8 sm:mb-12">
            <h3 className="text-lg sm:text-xl font-light text-gray-900 mb-4 sm:mb-6 tracking-tight">Create New Instance</h3>
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Instance ID <span className="text-gray-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-base font-light"
                  placeholder="e.g., store_1, mall_kiosk"
                  required
                  pattern="[a-zA-Z0-9_]+"
                  title="Only letters, numbers, and underscores allowed"
                />
                <p className="text-xs font-light text-gray-500 mt-2">
                  Use lowercase with underscores (e.g., store_1, mall_kiosk)
                </p>
              </div>
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Location Name <span className="text-gray-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-base font-light"
                  placeholder="e.g., Downtown Store, Mall Kiosk"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Timezone <span className="text-gray-400">*</span>
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 text-base font-light bg-white"
                  required
                >
                  {getCommonTimezones().map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="text-xs font-light text-gray-500 mt-2">
                  Select the timezone for this location. All timestamps will be displayed in this timezone.
                </p>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  className="text-base font-light text-gray-900 hover:text-gray-600 transition-colors"
                >
                  Create Instance →
                </button>
              </div>
            </form>
            <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm font-light text-gray-700">
                <span className="font-normal">Note:</span> Each instance will be created with default outcomes and visual layout.
                You can customize them in the instance dashboard.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200/50 rounded-2xl overflow-hidden">
          {/* Mobile: Scrollable table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-light text-gray-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-light text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-light text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-light text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Timezone
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-light text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Created
                  </th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-light text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/50">
              {                instances.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                    <div className="text-sm sm:text-base font-light text-gray-500">No instances found. Create your first instance above.</div>
                  </td>
                </tr>
              ) : (
                instances.map(instance => (
                  <tr key={instance.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-light text-gray-900 truncate max-w-[80px] sm:max-w-none">{instance.id}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                      {editingId === instance.id ? (
                        <input
                          type="text"
                          value={editData.location_name}
                          onChange={(e) => setEditData({ ...editData, location_name: e.target.value })}
                          className="w-full sm:w-auto px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-light focus:outline-none focus:ring-1 focus:ring-gray-900"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleUpdate(instance.id);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div className="text-xs sm:text-sm font-light text-gray-900 truncate max-w-[120px] sm:max-w-none">{instance.location_name}</div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                      {editingId === instance.id ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editData.is_active}
                            onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                          />
                          <span className="ml-2 text-xs sm:text-sm font-light text-gray-700">
                            {editData.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-light rounded-full ${
                          instance.is_active
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-50 text-gray-500'
                        }`}>
                          {instance.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap hidden md:table-cell">
                      {editingId === instance.id ? (
                        <select
                          value={editData.timezone}
                          onChange={(e) => setEditData({ ...editData, timezone: e.target.value })}
                          className="w-full sm:w-auto px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-light min-w-[200px] focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                        >
                          {getCommonTimezones().map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs sm:text-sm font-light text-gray-600">
                          {instance.timezone || 'UTC'}
                        </div>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap text-xs sm:text-sm font-light text-gray-600 hidden lg:table-cell">
                      {formatTimestamp(instance.created_at, instance.timezone || 'UTC', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="px-3 sm:px-6 py-4 sm:py-5 whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                        {editingId === instance.id ? (
                          <>
                            <button
                              onClick={() => handleUpdate(instance.id)}
                              className="font-light text-gray-900 hover:text-gray-600 transition-colors py-1 px-2 min-h-[44px] sm:min-h-0"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="font-light text-gray-600 hover:text-gray-900 transition-colors py-1 px-2 min-h-[44px] sm:min-h-0"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href={`${window.location.origin}/admin?id=${instance.id}`}
                              className="font-light text-gray-900 hover:text-gray-600 transition-colors py-1 px-2 min-h-[44px] sm:min-h-0 inline-block"
                              title="Manage this instance"
                            >
                              Manage
                            </a>
                            <button
                              onClick={() => handleEdit(instance)}
                              className="font-light text-gray-600 hover:text-gray-900 transition-colors py-1 px-2 min-h-[44px] sm:min-h-0"
                              title="Edit instance"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(instance.id, instance.is_active)}
                              className={`font-light transition-colors py-1 px-2 min-h-[44px] sm:min-h-0 ${
                                instance.is_active
                                  ? 'text-gray-600 hover:text-gray-900'
                                  : 'text-gray-900 hover:text-gray-600'
                              }`}
                              title={instance.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {instance.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(instance.id)}
                              className="font-light text-gray-600 hover:text-gray-900 transition-colors py-1 px-2 min-h-[44px] sm:min-h-0"
                              title="Delete instance"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SuperAdmin;
