import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import Wheel from './components/Wheel';

const STATES = {
  IDLE: 'idle',
  PLAYING: 'playing',
  RESULT: 'result'
};

function App() {
  const [state, setState] = useState(STATES.IDLE);
  const [signageId, setSignageId] = useState('DEFAULT');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [backgroundConfig, setBackgroundConfig] = useState({
    type: 'gradient',
    colors: ['#991b1b', '#000000', '#991b1b']
  });
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);

  useEffect(() => {
    // Get signage ID from URL or use default
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || 'DEFAULT';
    setSignageId(id);

    // Generate QR code
    const baseUrl = window.location.origin;
    const formUrl = `${baseUrl}/play/?id=${id}`;
    QRCode.toDataURL(formUrl, { width: 400, margin: 2 })
      .then(url => setQrCodeUrl(url))
      .catch(err => {
        console.error('QR code generation error:', err);
        // Set empty string to indicate failure, UI will handle gracefully
        setQrCodeUrl('');
      });

    // Load signage config
    loadSignageConfig(id);
    loadBackgroundConfig(id);

    // Connect WebSocket
    connectWebSocket(id);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  const loadSignageConfig = async (id) => {
    try {
      const response = await fetch(`${window.location.origin}/api/signage/${id}`);
      const data = await response.json();
      setOutcomes(data.outcomes || []);
      
      // Load background config if available
      if (data.background_config) {
        // Handle both object and string formats
        let bgConfig = data.background_config;
        if (typeof bgConfig === 'string') {
          try {
            bgConfig = JSON.parse(bgConfig);
          } catch (e) {
            console.error('Failed to parse background_config:', e);
          }
        }
        if (bgConfig && typeof bgConfig === 'object') {
          setBackgroundConfig(bgConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load signage config:', error);
    }
  };

  const loadBackgroundConfig = async (id) => {
    try {
      const response = await fetch(`${window.location.origin}/api/signage/${id}/background`);
      if (response.ok) {
        const data = await response.json();
        // Ensure we have a valid config object
        if (data && typeof data === 'object') {
          // Validate image URL if type is image
          if (data.type === 'image' && data.url) {
            // Test if image loads
            const img = new Image();
            img.onerror = () => {
              console.warn('Background image failed to load:', data.url);
              // Keep the config but log the error
            };
            img.src = data.url;
          }
          setBackgroundConfig(data);
        }
      }
    } catch (error) {
      console.error('Failed to load background config:', error);
    }
  };

  const connectWebSocket = (id) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/signage/${id}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      // Send ping every 30 seconds to keep connection alive
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        } else {
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket(id);
      }, 3000);
    };
  };

  const handleWebSocketMessage = (message) => {
    console.log('📨 WebSocket message received:', message);
    
    if (message.type === 'game_start') {
      console.log('🎮 Starting game:', {
        sessionId: message.sessionId,
        userName: message.userName,
        outcome: message.outcome
      });
      
      setCurrentGame({
        sessionId: message.sessionId,
        userName: message.userName,
        outcome: message.outcome
      });
      setState(STATES.PLAYING);
    } else if (message.type === 'background_update') {
      setBackgroundConfig(message.background_config);
    }
  };

  const handleWheelComplete = () => {
    console.log('🏁 Wheel animation complete, showing result for:', currentGame);
    
    // Smooth transition: fade out wheel, then show result
    setTimeout(() => {
      if (!currentGame || !currentGame.outcome) {
        console.error('❌ ERROR: No currentGame or outcome data when showing result!', currentGame);
      }
      
      setState(STATES.RESULT);
      
      // Wait for result screen to be displayed (5 seconds), then mark session as complete
      // This ensures the session only ends after results are shown on screen
      setTimeout(() => {
        // Notify backend that game is complete (after results are shown)
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentGame) {
          wsRef.current.send(JSON.stringify({
            type: 'game_complete',
            sessionId: currentGame.sessionId
          }));
          console.log('✅ Game marked as complete:', currentGame.sessionId);
        }

        // Return to idle after results are displayed
        console.log('🔄 Returning to idle state');
        setState(STATES.IDLE);
        setCurrentGame(null);
      }, 5000); // Wait 5 seconds for result display
    }, 300); // Small delay for smooth transition
  };

  const getBackgroundStyle = () => {
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
        // Fallback if no URL provided
        return {
          background: 'linear-gradient(to bottom right, #991b1b, #000000, #991b1b)'
        };
      }
      // Clean and validate URL
      const cleanUrl = imageUrl.trim();
      return {
        backgroundImage: `url("${cleanUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#000000' // Fallback color while image loads
      };
    }
    // Default fallback
    return {
      background: 'linear-gradient(to bottom right, #991b1b, #000000, #991b1b)'
    };
  };

  if (state === STATES.PLAYING) {
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center relative overflow-hidden transition-all duration-500"
        style={getBackgroundStyle()}
      >
        <Wheel
          userName={currentGame?.userName || 'Player'}
          outcome={currentGame?.outcome}
          outcomes={outcomes}
          onComplete={handleWheelComplete}
        />
      </div>
    );
  }

  if (state === STATES.RESULT) {
    const isNegative = currentGame?.outcome?.is_negative || false;
    
    return (
      <div 
        className="h-screen w-screen flex items-center justify-center animate-fadeIn"
        style={getBackgroundStyle()}
      >
        <div className="text-center text-white animate-slideUp">
          {!isNegative && (
            <div className="text-8xl mb-8 animate-bounce drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">🎉</div>
          )}
          <h1 className="text-6xl font-bold mb-4 animate-fadeIn drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            {currentGame?.userName}
          </h1>
          {!isNegative && (
            <h2 className="text-5xl font-semibold mb-8 animate-fadeIn drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              You Won:
            </h2>
          )}
          <div className="text-7xl font-bold bg-white/20 rounded-2xl px-12 py-8 inline-block animate-scaleIn drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]" style={{ animationDelay: '0.6s', animationFillMode: 'both' }}>
            {currentGame?.outcome?.label || 'Congratulations!'}
          </div>
        </div>
      </div>
    );
  }

  // IDLE state
  return (
    <div 
      className="h-screen w-screen flex items-center justify-center p-8"
      style={getBackgroundStyle()}
    >
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-7xl font-bold text-white mb-4 drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">Spin the Wheel!</h1>
        <p className="text-3xl text-white/90 mb-12 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">Scan the QR code to play</p>
        
        {qrCodeUrl && (
          <div className="flex justify-center mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-2xl">
              <img src={qrCodeUrl} alt="QR Code" className="w-80 h-80" />
            </div>
          </div>
        )}
        
        <div className="text-2xl text-white/80 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <p>📱 Use your phone to scan</p>
          <p className="mt-2">🎯 Win amazing prizes!</p>
        </div>
      </div>
    </div>
  );
}

export default App;
