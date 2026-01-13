import { useState, useEffect, useRef } from 'react';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [signageId, setSignageId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [showBuzzer, setShowBuzzer] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const pollingIntervalRef = useRef(null);
  const errorCountRef = useRef(0);
  const pollingStartTimeRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Get signage ID from URL parameter
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || 'DEFAULT';
    setSignageId(id);

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Poll for session result when game has started
  useEffect(() => {
    if (!sessionId || !gameStarted) return;

    const maxPollingTime = 300000; // 5 minutes
    const maxErrors = 5; // Stop after 5 consecutive errors
    pollingStartTimeRef.current = Date.now();
    errorCountRef.current = 0;

    const pollSession = async () => {
      try {
        // Check if we've been polling too long
        if (Date.now() - pollingStartTimeRef.current > maxPollingTime) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError('Game is taking too long. Please contact support or refresh the page.');
          return;
        }

        const response = await fetch(`${window.location.origin}/api/session/${sessionId}`);
        if (!response.ok) {
          console.error('Failed to fetch session');
          errorCountRef.current = (errorCountRef.current || 0) + 1;
          if (errorCountRef.current >= maxErrors) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setError('Failed to fetch game result. Please refresh the page.');
          }
          return;
        }

        errorCountRef.current = 0; // Reset on success
        const data = await response.json();
        
        if (data.status === 'completed' && data.outcome) {
          // Game completed, stop polling and show result
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setGameResult(data);
        }
      } catch (err) {
        console.error('Error polling session:', err);
        errorCountRef.current = (errorCountRef.current || 0) + 1;
        if (errorCountRef.current >= maxErrors) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError('Connection error. Please refresh the page.');
        }
      }
    };

    // Poll immediately, then every 1 second
    pollSession();
    pollingIntervalRef.current = setInterval(pollSession, 1000);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [sessionId, gameStarted]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate phone format (10 digits, can include spaces, dashes, or parentheses)
    const phoneDigits = formData.phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneDigits)) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${window.location.origin}/api/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          signageId
        })
      });

      // Check if response has content before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(text || 'Invalid response from server');
      }

      const data = await response.json();
      console.log('📝 Form submission response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }

      if (!data.sessionId) {
        console.error('❌ No sessionId in response:', data);
        throw new Error('Session ID not received from server');
      }

      console.log('✅ Form submitted successfully, sessionId:', data.sessionId);
      setSubmitted(true);
      setSessionId(data.sessionId); // Store sessionId
      setShowBuzzer(true); // Show buzzer screen
      setError(''); // Clear any previous errors
      setLoading(false); // Reset loading state so buzzer button is enabled
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleBuzzerClick = async () => {
    if (!sessionId) {
      console.error('No sessionId available');
      setError('Session ID missing. Please try submitting again.');
      return;
    }

    setLoading(true);
    setError(''); // Clear any previous errors
    
    try {
      console.log('🔔 Starting game for session:', sessionId);
      const url = `${window.location.origin}/api/session/${sessionId}/start`;
      console.log('Request URL:', url);
      
      // Create AbortController for timeout
      const controller = new AbortController();
      timeoutRef.current = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      console.log('Response status:', response.status, response.statusText);

      // Try to parse as JSON first
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(text || `Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        console.error('Error response:', data);
        throw new Error(data.error || `Failed to start game: ${response.status}`);
      }

      console.log('✅ Game started successfully:', data);
      setShowBuzzer(false);
      setGameStarted(true);
      setLoading(false);
    } catch (err) {
      console.error('❌ Buzzer click error:', err);
      if (err.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(err.message || 'Failed to start game. Please try again.');
      }
      setLoading(false);
    }
  };

  // Show result screen when game is completed
  if (gameResult) {
    const isNegative = gameResult.outcome?.is_negative || false;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            {!isNegative && (
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
            )}
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {gameResult.userName}
            </h2>
            {!isNegative && (
              <h3 className="text-xl font-semibold text-gray-600 mb-4">
                You Won:
              </h3>
            )}
            <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl px-6 py-4 inline-block">
              {gameResult.outcome?.label || 'Congratulations!'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show buzzer screen after form submission
  if (submitted && showBuzzer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="text-6xl mb-6">🔔</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Ready to Play!</h2>
            <p className="text-lg text-gray-600 mb-6">
              Click the buzzer below to start the game!
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Watch the screen after clicking to see your result
            </p>
            
            {/* Debug info - remove in production */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-100 p-2 rounded text-xs mb-4 text-left">
                <p>Session ID: {sessionId || 'None'}</p>
                <p>Loading: {loading ? 'true' : 'false'}</p>
                <p>Show Buzzer: {showBuzzer ? 'true' : 'false'}</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>
            )}

            <div className="flex justify-center mb-4">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('🔔 Buzzer button clicked!', { sessionId, loading });
                  handleBuzzerClick();
                }}
                disabled={loading || !sessionId}
                className="relative w-48 h-48 rounded-full bg-gradient-to-br from-red-500 via-red-600 to-red-700 text-white font-bold text-xl hover:from-red-600 hover:via-red-700 hover:to-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl disabled:shadow-lg"
                style={{ 
                  pointerEvents: loading || !sessionId ? 'none' : 'auto',
                  boxShadow: loading || !sessionId 
                    ? '0 10px 25px rgba(0,0,0,0.2)' 
                    : '0 15px 35px rgba(239, 68, 68, 0.4), inset 0 -5px 15px rgba(0,0,0,0.3)'
                }}
              >
                {/* Inner circle for depth effect */}
                <div className="absolute inset-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 opacity-80"></div>
                
                {/* Button content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  {loading ? (
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-[3px] border-white mb-2"></div>
                      <span className="text-sm">Starting...</span>
                    </div>
                  ) : !sessionId ? (
                    <div className="text-center">
                      <div className="text-4xl mb-2">⏳</div>
                      <span className="text-sm">Waiting...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-5xl mb-2">🔔</div>
                      <span className="text-lg font-bold">PRESS</span>
                    </div>
                  )}
                </div>
                
                {/* Shine effect */}
                <div className="absolute top-2 left-2 w-16 h-16 rounded-full bg-white opacity-20 blur-sm"></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show "watching screen" message while waiting for result
  if (submitted && gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Success!</h2>
            <p className="text-lg text-gray-600 mb-4">Watch the screen!</p>
            <p className="text-sm text-gray-500">Your game is starting now. Look up at the display!</p>
            <div className="mt-6">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="text-sm text-gray-500 mt-2">Waiting for result...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Spin the Wheel!</h1>
          <p className="text-gray-600">Enter your details to play</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Enter your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="Enter your phone number"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
