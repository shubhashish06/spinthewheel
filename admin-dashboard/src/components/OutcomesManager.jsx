import { useState, useEffect } from 'react';

function OutcomesManager({ signageId }) {
  const [outcomes, setOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ 
    label: '', 
    probability_weight: 10,
    is_negative: false,
    text_color: '',
    background_color: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkWeights, setBulkWeights] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadOutcomes();
  }, [signageId]);

  const loadOutcomes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/outcomes/${signageId}`);
      const data = await res.json();
      setOutcomes(data);
      
      // Load weight stats for percentages
      const statsRes = await fetch(`${window.location.origin}/api/outcomes/${signageId}/weights/stats`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        // Merge percentage data
        const outcomesWithStats = data.map(outcome => {
          const stat = stats.outcomes.find(s => s.id === outcome.id);
          return { ...outcome, percentage: stat?.percentage || 0 };
        });
        setOutcomes(outcomesWithStats);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load outcomes:', err);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${window.location.origin}/api/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          signage_id: signageId // ✅ Always use actual signage_id, never null
        })
      });
      if (response.ok) {
        loadOutcomes();
        setShowForm(false);
        setFormData({ 
          label: '', 
          probability_weight: 10,
          is_negative: false,
          text_color: '',
          background_color: ''
        });
      }
    } catch (err) {
      console.error('Failed to create outcome:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this outcome?')) return;
    try {
      const response = await fetch(`${window.location.origin}/api/outcomes/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadOutcomes();
        showMessage('success', 'Outcome deleted successfully');
      }
    } catch (err) {
      console.error('Failed to delete outcome:', err);
      showMessage('error', 'Failed to delete outcome');
    }
  };

  const handleEditWeight = (id, currentWeight) => {
    setEditingId(id);
    setEditValue(currentWeight.toString());
  };

  const handleSaveWeight = async (id) => {
    const weight = parseInt(editValue);
    if (isNaN(weight) || weight < 0) {
      showMessage('error', 'Weight must be a non-negative integer(0 or more)');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${window.location.origin}/api/outcomes/${id}/weight`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ probability_weight: weight })
      });

      if (response.ok) {
        setEditingId(null);
        loadOutcomes();
        showMessage('success', 'Weight updated successfully');
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to update weight');
      }
    } catch (err) {
      console.error('Failed to update weight:', err);
      showMessage('error', 'Failed to update weight');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };
  const handleToggleNegative = async (id, currentIsNegative) => {
    setSaving(true);
    try {
      const response = await fetch(`${window.location.origin}/api/outcomes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_negative: !currentIsNegative })
      });

      if (response.ok) {
        loadOutcomes();
        showMessage('success', `Outcome marked as ${!currentIsNegative ? 'negative' : 'normal'}`);
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to update outcome');
      }
    } catch (err) {
      console.error('Failed to toggle negative status:', err);
      showMessage('error', 'Failed to update outcome');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateColors = async (id, textColor, backgroundColor) => {
    try {
      const response = await fetch(`${window.location.origin}/api/outcomes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text_color: textColor || null,
          background_color: backgroundColor || null
        })
      });

      if (response.ok) {
        loadOutcomes();
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to update colors');
      }
    } catch (err) {
      console.error('Failed to update colors:', err);
      showMessage('error', 'Failed to update colors');
    }
  };

  const handleBulkEdit = () => {
    setBulkEditMode(true);
    const weights = {};
    outcomes.forEach(outcome => {
      weights[outcome.id] = outcome.probability_weight;
    });
    setBulkWeights(weights);
  };

  const handleBulkSave = async () => {
    const outcomesToUpdate = Object.entries(bulkWeights).map(([id, weight]) => ({
      id,
      probability_weight: parseInt(weight)
    }));

    // Validate all weights
    for (const outcome of outcomesToUpdate) {
      if (isNaN(outcome.probability_weight) || outcome.probability_weight < 0) {
        showMessage('error', `Weight for ${outcomes.find(o => o.id === outcome.id)?.label} must be a non-negative integer 0 or more`);
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(`${window.location.origin}/api/outcomes/weights/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcomes: outcomesToUpdate })
      });

      if (response.ok) {
        setBulkEditMode(false);
        setBulkWeights({});
        loadOutcomes();
        showMessage('success', 'Weights updated successfully');
      } else {
        const error = await response.json();
        showMessage('error', error.error || 'Failed to update weights');
      }
    } catch (err) {
      console.error('Failed to update weights:', err);
      showMessage('error', 'Failed to update weights');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkCancel = () => {
    setBulkEditMode(false);
    setBulkWeights({});
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const totalWeight = outcomes.reduce((sum, o) => sum + (o.probability_weight || 0), 0);

  if (loading) {
    return <div className="text-center py-12">Loading outcomes...</div>;
  }

  return (
    <div>
      {/* Message Banner */}
      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Game Outcomes</h2>
          <p className="text-sm text-gray-500 mt-1">
            Total Weight: <span className="font-semibold">{totalWeight}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {!bulkEditMode && (
            <>
              <button
                onClick={handleBulkEdit}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                ✏️ Bulk Edit Weights
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {showForm ? 'Cancel' : '+ Add Outcome'}
              </button>
            </>
          )}
          {bulkEditMode && (
            <>
              <button
                onClick={handleBulkCancel}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSave}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save All Weights'}
              </button>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Outcome</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability Weight
              </label>
              <input
                type="number"
                value={formData.probability_weight}
                onChange={(e) => setFormData({ ...formData, probability_weight: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher weight = higher probability. Total weight: {totalWeight}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.background_color || '#DC2626'}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.background_color || ''}
                    onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                    placeholder="#DC2626"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.text_color || '#FFFFFF'}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.text_color || ''}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    placeholder="#FFFFFF"
                    pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default
                </p>
              </div>
            </div>
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_negative || false}
                  onChange={(e) => setFormData({ ...formData, is_negative: e.target.checked })}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Mark as negative outcome (no congratulations message)
                </span>
              </label>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create Outcome
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Negative
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Label
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Colors
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Probability
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {outcomes.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  No outcomes found
                </td>
              </tr>
            ) : (
              outcomes.map(outcome => {
                const currentWeight = bulkEditMode 
                  ? (bulkWeights[outcome.id] !== undefined ? bulkWeights[outcome.id] : outcome.probability_weight)
                  : outcome.probability_weight;
                
                const totalWeightForCalc = bulkEditMode
                  ? Object.values(bulkWeights).reduce((sum, w) => sum + (parseInt(w) || 0), 0)
                  : totalWeight;
                
                const probability = totalWeightForCalc > 0 
                  ? ((currentWeight / totalWeightForCalc) * 100).toFixed(1)
                  : 0;
                
                const isEditing = editingId === outcome.id;
                
                return (
                  <tr key={outcome.id} className={bulkEditMode ? 'bg-yellow-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleToggleNegative(outcome.id, outcome.is_negative)}
                        disabled={saving}
                        className={`px-3 py-1 rounded text-xs font-semibold ${
                          outcome.is_negative
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        } disabled:opacity-50`}
                        title={outcome.is_negative ? 'Click to mark as normal' : 'Click to mark as negative'}
                      >
                        {outcome.is_negative ? 'Negative' : 'Normal'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {outcome.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500">BG:</label>
                          <input
                            type="color"
                            value={outcome.background_color || '#DC2626'}
                            onChange={(e) => handleUpdateColors(outcome.id, outcome.text_color, e.target.value)}
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            title="Background color"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-xs text-gray-500">Text:</label>
                          <input
                            type="color"
                            value={outcome.text_color || '#FFFFFF'}
                            onChange={(e) => handleUpdateColors(outcome.id, e.target.value, outcome.background_color)}
                            className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                            title="Text color"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {bulkEditMode ? (
                        <input
                          type="number"
                          min="0"
                          value={bulkWeights[outcome.id] !== undefined ? bulkWeights[outcome.id] : outcome.probability_weight}
                          onChange={(e) => {
                            const newWeights = { ...bulkWeights };
                            newWeights[outcome.id] = parseInt(e.target.value) || 0;
                            setBulkWeights(newWeights);
                          }}
                          className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      ) : isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveWeight(outcome.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="w-20 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveWeight(outcome.id)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-800"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditWeight(outcome.id, outcome.probability_weight)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          title="Click to edit"
                        >
                          {outcome.probability_weight}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!bulkEditMode && (
                        <button
                          onClick={() => handleToggleNegative(outcome.id, outcome.is_negative || false)}
                          disabled={saving}
                          className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            outcome.is_negative 
                              ? 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer' 
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 cursor-pointer'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title="Click to toggle negative/normal"
                        >
                          {outcome.is_negative ? 'Negative' : 'Normal'}
                        </button>
                      )}
                      {bulkEditMode && (
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          outcome.is_negative 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {outcome.is_negative ? 'Negative' : 'Normal'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={bulkEditMode ? 'font-semibold text-purple-600' : ''}>
                        {probability}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        outcome.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {outcome.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {!bulkEditMode && (
                        <button
                          onClick={() => handleDelete(outcome.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default OutcomesManager;
