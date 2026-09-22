import { useState, useEffect } from 'react';

function BackgroundManager({ signageId }) {
  const [backgroundConfig, setBackgroundConfig] = useState({
    type: 'gradient',
    colors: ['#991b1b', '#000000', '#991b1b']
  });
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState('xl');
  const [logoPosition, setLogoPosition] = useState('top-left');
  const [wheelCenterColor, setWheelCenterColor] = useState('#DC2626');
  const [wheelCenterSize, setWheelCenterSize] = useState('md');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [savingWheel, setSavingWheel] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [preview, setPreview] = useState(true);

  useEffect(() => {
    loadBackground();
  }, [signageId]);

  const loadBackground = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/signage/${signageId}/background`);
      if (res.ok) {
        const data = await res.json();
        setBackgroundConfig(data);
      }
      
      // Load logo settings
      const signageRes = await fetch(`${window.location.origin}/api/signage/${signageId}`);
      if (signageRes.ok) {
        const signageData = await signageRes.json();
        setLogoUrl(signageData.logo_url || '');
        setLogoSize(signageData.logo_size || 'xl');
        setLogoPosition(signageData.logo_position || 'top-left');
        setWheelCenterColor(signageData.wheel_center_color || '#DC2626');
        setWheelCenterSize(signageData.wheel_center_size || 'md');
      }
    } catch (err) {
      console.error('Failed to load background:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${window.location.origin}/api/signage/${signageId}/background`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ background_config: backgroundConfig })
      });

      if (res.ok) {
        showMessage('success', 'Background updated successfully!');
      } else {
        const error = await res.json();
        showMessage('error', error.error || 'Failed to update background');
      }
    } catch (err) {
      console.error('Failed to save background:', err);
      showMessage('error', 'Failed to save background');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLogo = async () => {
    setSavingLogo(true);
    try {
      const res = await fetch(`${window.location.origin}/api/signage/${signageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logo_url: logoUrl || null,
          logo_size: logoSize || 'xl',
          logo_position: logoPosition || 'top-left'
        })
      });

      if (res.ok) {
        showMessage('success', 'Logo settings updated successfully!');
      } else {
        const error = await res.json();
        showMessage('error', error.error || 'Failed to update logo');
      }
    } catch (err) {
      console.error('Failed to save logo:', err);
      showMessage('error', 'Failed to save logo');
    } finally {
      setSavingLogo(false);
    }
  };

  const handleSaveWheel = async () => {
    setSavingWheel(true);
    try {
      const res = await fetch(`${window.location.origin}/api/signage/${signageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wheel_center_color: wheelCenterColor || '#DC2626',
          wheel_center_size: wheelCenterSize || 'md'
        })
      });

      if (res.ok) {
        showMessage('success', 'Wheel center settings updated successfully!');
      } else {
        const error = await res.json();
        showMessage('error', error.error || 'Failed to update wheel center settings');
      }
    } catch (err) {
      console.error('Failed to save wheel center settings:', err);
      showMessage('error', 'Failed to save wheel center settings');
    } finally {
      setSavingWheel(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleTypeChange = (type) => {
    if (type === 'gradient') {
      setBackgroundConfig({
        type: 'gradient',
        colors: backgroundConfig.colors || ['#991b1b', '#000000', '#991b1b']
      });
    } else if (type === 'solid') {
      setBackgroundConfig({
        type: 'solid',
        color: backgroundConfig.color || '#991b1b'
      });
    } else if (type === 'image') {
      setBackgroundConfig({
        type: 'image',
        url: backgroundConfig.url || ''
      });
    }
  };

  const handleGradientColorChange = (index, color) => {
    const newColors = [...backgroundConfig.colors];
    newColors[index] = color;
    setBackgroundConfig({ ...backgroundConfig, colors: newColors });
  };

  const addGradientColor = () => {
    setBackgroundConfig({
      ...backgroundConfig,
      colors: [...backgroundConfig.colors, '#000000']
    });
  };

  const removeGradientColor = (index) => {
    if (backgroundConfig.colors.length > 2) {
      const newColors = backgroundConfig.colors.filter((_, i) => i !== index);
      setBackgroundConfig({ ...backgroundConfig, colors: newColors });
    }
  };

  const getPreviewStyle = () => {
    if (!backgroundConfig || !backgroundConfig.type) {
      return {
        background: 'linear-gradient(to bottom right, #991b1b, #000000, #991b1b)'
      };
    }

    if (backgroundConfig.type === 'gradient') {
      const colors = backgroundConfig.colors || ['#991b1b', '#000000', '#991b1b'];
      return {
        background: `linear-gradient(to bottom right, ${colors.join(', ')})`
      };
    } else if (backgroundConfig.type === 'solid') {
      return {
        background: backgroundConfig.color || '#991b1b'
      };
    } else if (backgroundConfig.type === 'image') {
      const imageUrl = backgroundConfig.url || '';
      if (!imageUrl || imageUrl.trim() === '') {
        return {
          background: 'linear-gradient(to bottom right, #991b1b, #000000, #991b1b)'
        };
      }
      return {
        backgroundImage: `url("${imageUrl.trim()}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000000' // Fallback color while image loads
      };
    }
    return {};
  };

  if (loading) {
    return <div className="text-center py-12">Loading background settings...</div>;
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
          <h2 className="text-2xl font-bold text-gray-900">Background Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Customize the wheel game background</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : '💾 Save Background'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Background Type</h3>
          
          <div className="space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypeChange('gradient')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    backgroundConfig.type === 'gradient'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Gradient
                </button>
                <button
                  onClick={() => handleTypeChange('solid')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    backgroundConfig.type === 'solid'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Solid Color
                </button>
                <button
                  onClick={() => handleTypeChange('image')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 ${
                    backgroundConfig.type === 'image'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Image
                </button>
              </div>
            </div>

            {/* Gradient Configuration */}
            {backgroundConfig.type === 'gradient' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Gradient Colors
                </label>
                {(backgroundConfig.colors || []).map((color, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => handleGradientColorChange(index, e.target.value)}
                      className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => handleGradientColorChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="#000000"
                    />
                    {backgroundConfig.colors.length > 2 && (
                      <button
                        onClick={() => removeGradientColor(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addGradientColor}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
                >
                  + Add Color
                </button>
              </div>
            )}

            {/* Solid Color Configuration */}
            {backgroundConfig.type === 'solid' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundConfig.color || '#991b1b'}
                    onChange={(e) => setBackgroundConfig({ ...backgroundConfig, color: e.target.value })}
                    className="w-16 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundConfig.color || '#991b1b'}
                    onChange={(e) => setBackgroundConfig({ ...backgroundConfig, color: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="#991b1b"
                  />
                </div>
              </div>
            )}

            {/* Image Configuration */}
            {backgroundConfig.type === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={backgroundConfig.url || ''}
                  onChange={(e) => {
                    const newUrl = e.target.value.trim();
                    setBackgroundConfig({ ...backgroundConfig, url: newUrl });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter a publicly accessible image URL (JPG, PNG, GIF, WebP)
                </p>
                {backgroundConfig.url && backgroundConfig.url.trim() !== '' && (
                  <div className="mt-2">
                    <img
                      src={backgroundConfig.url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded border border-gray-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const errorDiv = e.target.parentElement.querySelector('.image-error');
                        if (errorDiv) {
                          errorDiv.style.display = 'block';
                        }
                      }}
                      onLoad={(e) => {
                        const errorDiv = e.target.parentElement.querySelector('.image-error');
                        if (errorDiv) {
                          errorDiv.style.display = 'none';
                        }
                      }}
                    />
                    <div className="hidden image-error text-xs text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200">
                      ⚠️ Image failed to load. Please check the URL is correct and publicly accessible.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Preview</h3>
            <button
              onClick={() => setPreview(!preview)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              {preview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
          
          {preview && (
            <div className="relative">
              <div
                className="w-full h-64 rounded-lg border-2 border-gray-300 relative overflow-hidden"
                style={{
                  ...getPreviewStyle(),
                  minHeight: '256px'
                }}
              >
                {/* Simulated wheel area */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white text-2xl font-bold drop-shadow-lg">🎡</span>
                  </div>
                </div>
                {/* Loading indicator for images */}
                {backgroundConfig.type === 'image' && backgroundConfig.url && (
                  <div className="absolute top-2 right-2 text-xs bg-black/50 text-white px-2 py-1 rounded">
                    {backgroundConfig.url ? 'Image' : 'No URL'}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This is how the background will appear during gameplay
              </p>
              {backgroundConfig.type === 'image' && backgroundConfig.url && (
                <div className="mt-2 text-xs text-center">
                  <p className="text-gray-600">Image URL:</p>
                  <p className="text-gray-400 break-all">{backgroundConfig.url}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Logo Settings */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Logo Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Configure logo URL, size, and position on the signage display</p>
          </div>
          <button
            onClick={handleSaveLogo}
            disabled={savingLogo}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {savingLogo ? 'Saving...' : 'Save Logo'}
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter a publicly accessible image URL (JPG, PNG, GIF, WebP, SVG).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Size
              </label>
              <select
                value={logoSize}
                onChange={(e) => setLogoSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
                <option value="2xl">2X Large</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Position
              </label>
              <select
                value={logoPosition}
                onChange={(e) => setLogoPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="top-left">Top Left</option>
                <option value="top-center">Top Center</option>
                <option value="top-right">Top Right</option>
                <option value="bottom-left">Bottom Left</option>
                <option value="bottom-right">Bottom Right</option>
              </select>
            </div>
          </div>
          
          {logoUrl && logoUrl.trim() !== '' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Preview
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className={`flex ${
                  logoPosition.includes('right') ? 'justify-end' :
                  logoPosition.includes('center') ? 'justify-center' : 'justify-start'
                }`}>
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className={`object-contain ${
                      logoSize === 'sm' ? 'max-h-16 max-w-32' :
                      logoSize === 'md' ? 'max-h-24 max-w-40' :
                      logoSize === 'lg' ? 'max-h-32 max-w-56' :
                      logoSize === '2xl' ? 'max-h-48 max-w-96' :
                      'max-h-40 max-w-72'
                    }`}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const errorDiv = e.target.parentElement.querySelector('.logo-error');
                      if (errorDiv) {
                        errorDiv.style.display = 'block';
                      }
                    }}
                    onLoad={(e) => {
                      const errorDiv = e.target.parentElement.querySelector('.logo-error');
                      if (errorDiv) {
                        errorDiv.style.display = 'none';
                      }
                    }}
                  />
                  <div className="hidden logo-error text-xs text-red-600 p-2 bg-red-50 rounded border border-red-200">
                    Logo failed to load. Please check the URL is correct and publicly accessible.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <button
            onClick={async () => {
              setLogoUrl('');
              setLogoSize('xl');
              setLogoPosition('top-left');
              setSavingLogo(true);
              try {
                const res = await fetch(`${window.location.origin}/api/signage/${signageId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ logo_url: null, logo_size: 'xl', logo_position: 'top-left' })
                });
                if (res.ok) {
                  showMessage('success', 'Logo removed successfully!');
                } else {
                  const error = await res.json();
                  showMessage('error', error.error || 'Failed to remove logo');
                }
              } catch (err) {
                console.error('Failed to remove logo:', err);
                showMessage('error', 'Failed to remove logo');
              } finally {
                setSavingLogo(false);
              }
            }}
            disabled={savingLogo || !logoUrl}
            className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Remove Logo
          </button>
        </div>
      </div>

      {/* Wheel Center */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Wheel Center</h3>
            <p className="text-sm text-gray-500 mt-1">Color and size of the hub in the middle of the spinning wheel</p>
          </div>
          <button
            onClick={handleSaveWheel}
            disabled={savingWheel}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {savingWheel ? 'Saving...' : 'Save Center'}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Center Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={wheelCenterColor || '#DC2626'}
                onChange={(e) => setWheelCenterColor(e.target.value)}
                className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                title="Wheel center color"
              />
              <input
                type="text"
                value={wheelCenterColor || ''}
                onChange={(e) => setWheelCenterColor(e.target.value)}
                placeholder="#DC2626"
                pattern="^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Center Size</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const sizes = ['sm', 'md', 'lg', 'xl', '2xl'];
                  const idx = sizes.indexOf(wheelCenterSize);
                  if (idx > 0) setWheelCenterSize(sizes[idx - 1]);
                }}
                disabled={wheelCenterSize === 'sm'}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Decrease center size"
              >
                −
              </button>
              <select
                value={wheelCenterSize}
                onChange={(e) => setWheelCenterSize(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
                <option value="xl">Extra Large</option>
                <option value="2xl">2X Large</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const sizes = ['sm', 'md', 'lg', 'xl', '2xl'];
                  const idx = sizes.indexOf(wheelCenterSize);
                  if (idx < sizes.length - 1) setWheelCenterSize(sizes[idx + 1]);
                }}
                disabled={wheelCenterSize === '2xl'}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Increase center size"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="text-xs text-gray-500">Preview:</span>
          <div
            className="rounded-full border-2 border-black shadow-sm flex-shrink-0 transition-all"
            style={{
              backgroundColor: wheelCenterColor || '#DC2626',
              width: wheelCenterSize === 'sm' ? 28 : wheelCenterSize === 'md' ? 40 : wheelCenterSize === 'lg' ? 52 : wheelCenterSize === 'xl' ? 64 : 80,
              height: wheelCenterSize === 'sm' ? 28 : wheelCenterSize === 'md' ? 40 : wheelCenterSize === 'lg' ? 52 : wheelCenterSize === 'xl' ? 64 : 80
            }}
            title="Preview"
          />
          <span className="text-xs text-gray-500 capitalize">{wheelCenterSize}</span>
        </div>
      </div>

      {/* Preset Backgrounds */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Preset Backgrounds</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Red/Black', type: 'gradient', colors: ['#991b1b', '#000000', '#991b1b'] },
            { name: 'Blue Ocean', type: 'gradient', colors: ['#1e3a8a', '#3b82f6', '#60a5fa'] },
            { name: 'Purple Dream', type: 'gradient', colors: ['#581c87', '#7c3aed', '#a78bfa'] },
            { name: 'Green Forest', type: 'gradient', colors: ['#14532d', '#22c55e', '#86efac'] },
            { name: 'Dark', type: 'solid', color: '#000000' },
            { name: 'Red', type: 'solid', color: '#dc2626' },
            { name: 'Blue', type: 'solid', color: '#2563eb' },
            { name: 'Purple', type: 'solid', color: '#7c3aed' }
          ].map((preset, index) => (
            <button
              key={index}
              onClick={() => {
                setBackgroundConfig(preset);
                showMessage('info', `Applied ${preset.name} preset`);
              }}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div
                className="w-full h-20 rounded mb-2"
                style={
                  preset.type === 'gradient'
                    ? { background: `linear-gradient(to bottom right, ${preset.colors.join(', ')})` }
                    : { background: preset.color }
                }
              />
              <p className="text-sm font-medium text-gray-700">{preset.name}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BackgroundManager;
