import { useState, useEffect } from 'react';
import StatsOverview from './components/StatsOverview';
import UsersList from './components/UsersList';
import SessionsList from './components/SessionsList';
import OutcomesManager from './components/OutcomesManager';
import BackgroundManager from './components/BackgroundManager';
import ValidationConfigManager from './components/ValidationConfigManager';
import RedemptionsManager from './components/RedemptionsManager';
import AnalyticsManager from './components/AnalyticsManager';
import SuperAdmin from './components/SuperAdmin';

function App() {
  // Check if this is superadmin route
  const isSuperAdmin = window.location.pathname.includes('/super') || 
                       window.location.pathname.includes('/superadmin');

  // If superadmin, show SuperAdmin component
  if (isSuperAdmin) {
    return <SuperAdmin />;
  }

  // Get instance ID from URL parameter, default to 'DEFAULT'
  const params = new URLSearchParams(window.location.search);
  const initialSignageId = params.get('id') || 'DEFAULT';
  
  const [activeTab, setActiveTab] = useState('overview');
  const [signageId, setSignageId] = useState(initialSignageId);
  const [signageInfo, setSignageInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load signage info for this specific instance
  useEffect(() => {
    loadSignageInfo();
  }, [signageId]);

  const loadSignageInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${window.location.origin}/api/signage/${signageId}`);
      if (response.ok) {
        const data = await response.json();
        setSignageInfo(data);
      } else {
        console.error('Failed to load signage info');
      }
    } catch (err) {
      console.error('Failed to load signage info:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'sessions', label: 'Sessions', icon: '🎮' },
    { id: 'outcomes', label: 'Outcomes', icon: '🎯' },
    { id: 'background', label: 'Background', icon: '🎨' },
    { id: 'validation', label: 'Validation', icon: '🔒' },
    { id: 'redemptions', label: 'Redemptions', icon: '🎫' },
    { id: 'analytics', label: 'Analytics', icon: '📈' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🎡 Spin the Wheel</h1>
              <p className="text-sm text-gray-500">
                Admin Dashboard
                {signageInfo && (
                  <span className="ml-2 text-blue-600">
                    - {signageInfo.location_name} ({signageInfo.id})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">Loading instance data...</div>
        ) : !signageInfo ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">Instance not found: {signageId}</div>
            <a
              href={`${window.location.origin}/superadmin`}
              className="text-blue-600 hover:text-blue-800"
            >
              Go to Super Admin to create instances
            </a>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <StatsOverview signageId={signageId} />}
            {activeTab === 'users' && <UsersList signageId={signageId} />}
            {activeTab === 'sessions' && <SessionsList signageId={signageId} />}
            {activeTab === 'outcomes' && <OutcomesManager signageId={signageId} />}
            {activeTab === 'background' && <BackgroundManager signageId={signageId} />}
            {activeTab === 'validation' && <ValidationConfigManager signageId={signageId} />}
            {activeTab === 'redemptions' && <RedemptionsManager signageId={signageId} />}
            {activeTab === 'analytics' && <AnalyticsManager signageId={signageId} />}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
