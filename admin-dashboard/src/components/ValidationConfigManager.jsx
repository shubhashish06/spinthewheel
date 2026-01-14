import { useState, useEffect } from 'react';

function ValidationConfigManager({ signageId }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadConfig();
  }, [signageId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/validation/${signageId}`);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load config:', err);
      setMessage({ type: 'error', text: 'Failed to load validation config' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const configToSend = { ...config };

      const res = await fetch(`${window.location.origin}/api/validation/${signageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSend)
      });

      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        setMessage({ type: 'success', text: 'Validation rules updated successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await res.json();
        setMessage({ type: 'error', text: error.error || 'Failed to update config' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update validation config' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading validation config...</div>;
  }

  if (!config) {
    return <div className="text-center py-12 text-red-600">Failed to load config</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Validation Rules</h2>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-300'
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="space-y-6">
          {/* Allow Multiple Plays */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Allow Multiple Plays
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Allow customers to play the game multiple times
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.allow_multiple_plays || false}
                onChange={(e) => setConfig({ ...config, allow_multiple_plays: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Max Plays */}
          {config.allow_multiple_plays && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Plays Per Email
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={config.max_plays_per_email === null || config.max_plays_per_email === undefined ? '' : config.max_plays_per_email}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfig({ 
                        ...config, 
                        max_plays_per_email: value === '' ? null : (parseInt(value) || null)
                      });
                    }}
                    onBlur={(e) => {
                      // If user leaves it empty, set to null (unlimited)
                      if (e.target.value === '') {
                        setConfig({ ...config, max_plays_per_email: null });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md pr-20"
                  />
                  {config.max_plays_per_email === null || config.max_plays_per_email === undefined ? (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 italic">
                      Unlimited
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter a number or leave empty for unlimited plays
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Plays Per Phone
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    value={config.max_plays_per_phone === null || config.max_plays_per_phone === undefined ? '' : config.max_plays_per_phone}
                    onChange={(e) => {
                      const value = e.target.value;
                      setConfig({ 
                        ...config, 
                        max_plays_per_phone: value === '' ? null : (parseInt(value) || null)
                      });
                    }}
                    onBlur={(e) => {
                      // If user leaves it empty, set to null (unlimited)
                      if (e.target.value === '') {
                        setConfig({ ...config, max_plays_per_phone: null });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md pr-20"
                  />
                  {config.max_plays_per_phone === null || config.max_plays_per_phone === undefined ? (
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 italic">
                      Unlimited
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter a number or leave empty for unlimited plays
                </p>
              </div>
            </>
          )}

          {/* Time Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Window (hours)
            </label>
            <select
              value={config.time_window_hours === null || config.time_window_hours === undefined ? '' : String(config.time_window_hours)}
              onChange={(e) => {
                const value = e.target.value;
                setConfig({ 
                  ...config, 
                  time_window_hours: value === '' ? null : parseInt(value)
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Lifetime (no restriction)</option>
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4 hours</option>
              <option value="6">6 hours</option>
              <option value="8">8 hours</option>
              <option value="12">12 hours</option>
              <option value="24">24 hours (1 day)</option>
              <option value="48">48 hours (2 days)</option>
              <option value="72">72 hours (3 days)</option>
              <option value="168">168 hours (1 week)</option>
              <option value="336">336 hours (2 weeks)</option>
              <option value="720">720 hours (1 month)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How many hours between plays (e.g., 24 = once per day, null = lifetime)
            </p>
          </div>

          {/* Allow Retry on Negative */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Allow Retry on Negative Outcomes
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Allow customers to play again if they got a negative outcome
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.allow_retry_on_negative || false}
                onChange={(e) => setConfig({ ...config, allow_retry_on_negative: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Check Across Specific Signages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check Duplicates Across Specific Signages
            </label>
            <input
              type="text"
              placeholder="e.g., DEFAULT, store_1, store_2 (comma-separated)"
              value={config.check_signage_ids || ''}
              onChange={(e) => setConfig({ ...config, check_signage_ids: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter signage instance IDs separated by commas. If empty, only checks within this signage. Example: DEFAULT, store_1, store_2
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ValidationConfigManager;
