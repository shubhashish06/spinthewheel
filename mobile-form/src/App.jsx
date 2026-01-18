import { useState, useEffect, useRef } from 'react';

function App() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [signageId, setSignageId] = useState('');
  const [token, setToken] = useState(null);
  const [tokenValidated, setTokenValidated] = useState(false);
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
  const resultTimeoutRef = useRef(null);

  useEffect(() => {
    // Get signage ID and token from URL parameters
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || 'DEFAULT';
    const urlToken = params.get('token');
    
    setSignageId(id);
    setToken(urlToken);

    // Validate token if present
    if (urlToken) {
      validateAccessToken(urlToken, id);
    } else {
      // No token - show error and prevent form access
      setError('Access denied. Please scan the QR code to play.');
      setTokenValidated(false);
      setLoading(true); // Prevent form submission
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
      }
    };
  }, []);

  const validateAccessToken = async (tokenValue, signageIdValue) => {
    try {
      const res = await fetch(`${window.location.origin}/api/token/validate?token=${tokenValue}`);
      const data = await res.json();
      
      if (data.valid && data.signageId === signageIdValue) {
        // Token is valid, allow form access
        setError('');
        setTokenValidated(true);
        setLoading(false);
      } else {
        // Invalid token
        setError(data.error || 'Invalid access token. Please scan the QR code again.');
        setTokenValidated(false);
        setLoading(true);
      }
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Failed to validate access. Please scan the QR code again.');
      setTokenValidated(false);
      setLoading(true);
    }
  };

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
          // Game completed, stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          // Wait 1 second after getting results from signage before showing on mobile
          if (resultTimeoutRef.current) {
            clearTimeout(resultTimeoutRef.current);
          }
          resultTimeoutRef.current = setTimeout(() => {
            setGameResult(data);
            resultTimeoutRef.current = null;
          }, 1000);
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
      if (resultTimeoutRef.current) {
        clearTimeout(resultTimeoutRef.current);
        resultTimeoutRef.current = null;
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

    // Re-validate token before submission
    if (!token) {
      setError('Access denied. Please scan the QR code to play.');
      return;
    }

    if (!tokenValidated) {
      setError('Token validation failed. Please scan the QR code again.');
      return;
    }

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

    // Validate phone format (minimum 10 digits, can include spaces, dashes, or parentheses)
    const phoneDigits = formData.phone.replace(/[\s\-()]/g, '');
    const phoneRegex = /^[0-9]{10,}$/;
    if (!phoneRegex.test(phoneDigits)) {
      setError('Please enter a valid phone number with at least 10 digits');
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
          signageId,
          token
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
    const hasRedemptionCode = gameResult.redemptionCode && !isNegative;
    
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          {!isNegative && (
            <div className="text-7xl animate-fadeIn">🎉</div>
          )}
          <div className="space-y-4">
            <h2 className="text-4xl font-light text-gray-900 tracking-tight">
              {gameResult.userName}
            </h2>
            {!isNegative && (
              <h3 className="text-2xl font-light text-gray-600">
                You Won
              </h3>
            )}
            <div className="text-5xl font-light text-gray-900 py-6">
              {gameResult.outcome?.label || 'Congratulations!'}
            </div>
          </div>
          
          {hasRedemptionCode && (
            <div className="mt-12 p-8 bg-gray-50 rounded-2xl border border-gray-200">
              <p className="text-sm font-medium text-gray-600 mb-4 tracking-wide uppercase">
                Redemption Code
              </p>
              <div className="bg-white border-2 border-gray-300 rounded-xl p-6 mb-4">
                <p className="text-4xl font-light text-gray-900 tracking-wider">
                  {gameResult.redemptionCode}
                </p>
              </div>
              <p className="text-xs text-gray-500 tracking-wide">
                Show this code at the counter to claim your prize
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show buzzer screen after form submission
  if (submitted && showBuzzer) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-12">
          <div className="space-y-6">
            <div className="text-6xl">🔔</div>
            <h2 className="text-4xl font-light text-gray-900 tracking-tight">
              Ready to Play
            </h2>
            <p className="text-lg font-light text-gray-600">
              Press the buzzer to start the game
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleBuzzerClick();
            }}
            disabled={loading || !sessionId}
            className="relative w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white font-light text-xl hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-2"></div>
                  <span className="text-sm font-light">Starting...</span>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-5xl mb-2">🔔</div>
                  <span className="text-lg font-light">PRESS</span>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Show "watching screen" message while waiting for result
  if (submitted && gameStarted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-light text-gray-900 tracking-tight">Success</h2>
            <p className="text-lg font-light text-gray-600">Watch the screen for your result</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  // Main form - Apple-inspired design
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-light text-gray-900 tracking-tight">
            Spin the Wheel
          </h1>
          <p className="text-lg font-light text-gray-600">
            Enter your details to play
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-lg font-light"
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-lg font-light"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition text-lg font-light"
              placeholder="Your phone number"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !tokenValidated}
            className="w-full bg-gray-900 text-white font-light py-4 px-6 rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Submitting...' : !tokenValidated ? 'Access Denied' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;
