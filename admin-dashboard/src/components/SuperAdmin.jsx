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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-gray-600">Loading instances...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎡 Spin the Wheel</h1>
              <p className="text-sm text-gray-500">Super Admin Dashboard</p>
            </div>
            <a
              href={`${window.location.origin}/admin?id=DEFAULT`}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Instance Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Manage Instances</h2>
            <p className="text-sm text-gray-500 mt-1">Create, edit, and manage all signage instances</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : '+ Create New Instance'}
          </button>
        </div>

        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}>
            {message.text}
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Create New Instance</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instance ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., store_1, mall_kiosk"
                  required
                  pattern="[a-zA-Z0-9_]+"
                  title="Only letters, numbers, and underscores allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use lowercase with underscores (e.g., store_1, mall_kiosk)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Downtown Store, Mall Kiosk"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {getCommonTimezones().map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select the timezone for this location. All timestamps will be displayed in this timezone.
                </p>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Instance
              </button>
            </form>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Each instance will be created with default outcomes and visual layout.
                You can customize them in the instance dashboard.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timezone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {                instances.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No instances found. Create your first instance above.
                  </td>
                </tr>
              ) : (
                instances.map(instance => (
                  <tr key={instance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{instance.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === instance.id ? (
                        <input
                          type="text"
                          value={editData.location_name}
                          onChange={(e) => setEditData({ ...editData, location_name: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
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
                        <div className="text-sm text-gray-900">{instance.location_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === instance.id ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={editData.is_active}
                            onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {editData.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          instance.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {instance.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingId === instance.id ? (
                        <select
                          value={editData.timezone}
                          onChange={(e) => setEditData({ ...editData, timezone: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[200px]"
                        >
                          {getCommonTimezones().map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {instance.timezone || 'UTC'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimestamp(instance.created_at, instance.timezone || 'UTC', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {editingId === instance.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(instance.id)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <a
                            href={`${window.location.origin}/admin?id=${instance.id}`}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                            title="Manage this instance"
                          >
                            Manage
                          </a>
                          <button
                            onClick={() => handleEdit(instance)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Edit instance"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleActive(instance.id, instance.is_active)}
                            className={`${
                              instance.is_active
                                ? 'text-orange-600 hover:text-orange-800'
                                : 'text-green-600 hover:text-green-800'
                            }`}
                            title={instance.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {instance.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(instance.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete instance"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default SuperAdmin;
