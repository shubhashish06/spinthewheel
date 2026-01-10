import { useState } from 'react';

function InstanceManager({ onInstanceCreated }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    location_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!formData.id || !formData.location_name) {
      setMessage({ type: 'error', text: 'ID and location name are required' });
      setLoading(false);
      return;
    }

    // Validate ID format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.id)) {
      setMessage({ type: 'error', text: 'ID must contain only letters, numbers, and underscores' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${window.location.origin}/api/signage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          location_name: formData.location_name,
          is_active: true
        })
      });

      if (response.ok) {
        const createdId = formData.id;
        setMessage({ type: 'success', text: 'Instance created successfully! Redirecting...' });
        setFormData({ id: '', location_name: '' });
        setShowForm(false);
        if (onInstanceCreated) {
          onInstanceCreated();
        }
        // Redirect to the new instance dashboard
        setTimeout(() => {
          window.location.href = `${window.location.origin}/admin?id=${createdId}`;
        }, 1000);
      } else {
        const errorData = await response.json();
        setMessage({ type: 'error', text: errorData.error || 'Failed to create instance' });
      }
    } catch (err) {
      console.error('Failed to create instance:', err);
      setMessage({ type: 'error', text: 'Failed to create instance. Server error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Manage Instances</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Create New Instance'}
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

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
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
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Instance'}
          </button>
        </form>
      )}

      <div className="mt-6 border-t pt-4">
        <p className="text-sm text-gray-600">
          <strong>Note:</strong> Each instance will be created with default outcomes and visual layout.
          You can customize them after creation.
        </p>
      </div>
    </div>
  );
}

export default InstanceManager;
