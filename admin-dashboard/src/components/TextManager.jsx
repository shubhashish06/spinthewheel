import { useState, useEffect } from 'react';

function TextManager({ signageId }) {
  const [textConfig, setTextConfig] = useState({
    idleHeading: 'Spin the Wheel',
    idleSubtitle: 'Scan to play',
    readyMessage: 'Good luck, {userName}!',
    readyInstruction: 'Press the buzzer to spin',
    playingMessage: 'The wheel is spinning',
    resultWinMessage: 'You Won',
    footerText: 'Use your phone camera to scan',
    textColorPrimary: '#111827',
    textColorSecondary: '#4B5563',
    textColorTertiary: '#6B7280'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadTextConfig();
  }, [signageId]);

  const loadTextConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/signage/${signageId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.text_config && typeof data.text_config === 'object') {
          setTextConfig({
            idleHeading: data.text_config.idleHeading || 'Spin the Wheel',
            idleSubtitle: data.text_config.idleSubtitle || 'Scan to play',
            readyMessage: data.text_config.readyMessage || 'Good luck, {userName}!',
            readyInstruction: data.text_config.readyInstruction || 'Press the buzzer to spin',
            playingMessage: data.text_config.playingMessage || 'The wheel is spinning',
            resultWinMessage: data.text_config.resultWinMessage || 'You Won',
            footerText: data.text_config.footerText || 'Use your phone camera to scan',
            textColorPrimary: data.text_config.textColorPrimary || '#111827',
            textColorSecondary: data.text_config.textColorSecondary || '#4B5563',
            textColorTertiary: data.text_config.textColorTertiary || '#6B7280'
          });
        }
      }
    } catch (err) {
      console.error('Failed to load text config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${window.location.origin}/api/signage/${signageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text_config: textConfig })
      });

      if (res.ok) {
        showMessage('success', 'Text settings updated successfully!');
      } else {
        const error = await res.json();
        showMessage('error', error.error || 'Failed to update text settings');
      }
    } catch (err) {
      console.error('Failed to save text config:', err);
      showMessage('error', 'Failed to save text settings');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleChange = (field, value) => {
    setTextConfig({ ...textConfig, [field]: value });
  };

  if (loading) {
    return <div className="text-center py-12">Loading text settings...</div>;
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
          <h2 className="text-2xl font-bold text-gray-900">Text Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Customize the text displayed on the signage screen</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : '💾 Save Text Settings'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* IDLE State Text */}
        <div>
          <h3 className="text-lg font-semibold mb-4 text-gray-900">IDLE State (QR Code Screen)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Main Heading
              </label>
              <input
                type="text"
                value={textConfig.idleHeading}
                onChange={(e) => handleChange('idleHeading', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Spin the Wheel"
              />
              <p className="text-xs text-gray-500 mt-1">Large heading displayed on the idle screen</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                value={textConfig.idleSubtitle}
                onChange={(e) => handleChange('idleSubtitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Scan to play"
              />
              <p className="text-xs text-gray-500 mt-1">Subtitle text below the heading</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer Text
              </label>
              <input
                type="text"
                value={textConfig.footerText}
                onChange={(e) => handleChange('footerText', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Use your phone camera to scan"
              />
              <p className="text-xs text-gray-500 mt-1">Text displayed at the bottom of the idle screen</p>
            </div>
          </div>
        </div>

        {/* READY State Text */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">READY State (Before Spinning)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welcome Message
              </label>
              <input
                type="text"
                value={textConfig.readyMessage}
                onChange={(e) => handleChange('readyMessage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Good luck, {userName}!"
              />
              <p className="text-xs text-gray-500 mt-1">Use {'{userName}'} to display the player's name</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instruction Text
              </label>
              <input
                type="text"
                value={textConfig.readyInstruction}
                onChange={(e) => handleChange('readyInstruction', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Press the buzzer to spin"
              />
              <p className="text-xs text-gray-500 mt-1">Instruction shown when wheel is ready</p>
            </div>
          </div>
        </div>

        {/* PLAYING State Text */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">PLAYING State (Wheel Spinning)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Spinning Message
              </label>
            <input
              type="text"
              value={textConfig.playingMessage}
              onChange={(e) => handleChange('playingMessage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="The wheel is spinning"
            />
            <p className="text-xs text-gray-500 mt-1">Message shown while the wheel is spinning</p>
          </div>
        </div>

        {/* RESULT State Text */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">RESULT State (After Winning)</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Win Message
            </label>
            <input
              type="text"
              value={textConfig.resultWinMessage}
              onChange={(e) => handleChange('resultWinMessage', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="You Won"
            />
            <p className="text-xs text-gray-500 mt-1">Message shown for positive outcomes (negative outcomes don't show this)</p>
          </div>
        </div>

        {/* Text Colors */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Text Colors</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary Text Color (Headings)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={textConfig.textColorPrimary || '#111827'}
                  onChange={(e) => handleChange('textColorPrimary', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={textConfig.textColorPrimary || '#111827'}
                  onChange={(e) => handleChange('textColorPrimary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="#111827"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for main headings (default: #111827 - dark gray)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secondary Text Color (Subtitles)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={textConfig.textColorSecondary || '#4B5563'}
                  onChange={(e) => handleChange('textColorSecondary', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={textConfig.textColorSecondary || '#4B5563'}
                  onChange={(e) => handleChange('textColorSecondary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="#4B5563"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for subtitles and secondary text (default: #4B5563 - medium gray)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tertiary Text Color (Footer)
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={textConfig.textColorTertiary || '#6B7280'}
                  onChange={(e) => handleChange('textColorTertiary', e.target.value)}
                  className="w-16 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={textConfig.textColorTertiary || '#6B7280'}
                  onChange={(e) => handleChange('textColorTertiary', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder="#6B7280"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Used for footer and less prominent text (default: #6B7280 - light gray)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TextManager;
