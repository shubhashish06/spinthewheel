import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import Wheel from './components/Wheel';

const STATES = {
  IDLE: 'idle',
  READY: 'ready',
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
    type: 'solid',
    color: '#ffffff'
  });
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoSize, setLogoSize] = useState('xl');
  const [logoPosition, setLogoPosition] = useState('top-left');
  const [qrDisplaySize, setQrDisplaySize] = useState(208);
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
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const tokenRefreshIntervalRef = useRef(null);
  const stateRef = useRef(STATES.IDLE);
  const currentGameRef = useRef(null);

  // Generate QR code with token (extracted to be reusable)
  const generateQRCode = async (signageIdParam = null) => {
    try {
      const baseUrl = window.location.origin;
      // Use provided parameter or fall back to state, then to URL param, then to default
      const id = signageIdParam || signageId || (() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('id') || 'DEFAULT';
      })();
      
      if (!id || id === '') {
        console.error('❌ No signage ID available for QR code generation');
        return;
      }
      
      console.log(`🔑 Generating token for signage: ${id}`);
      
      // Generate a token for this signage
      const tokenRes = await fetch(`${baseUrl}/api/token/generate?signageId=${id}`);
      
      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        console.error(`❌ Token generation failed (${tokenRes.status}):`, errorText);
        throw new Error(`Token generation failed: ${tokenRes.status}`);
      }
      
      const tokenData = await tokenRes.json();
      console.log('📦 Token response:', tokenData);
      
      if (tokenData.token) {
        // Include token in QR code URL
        const formUrl = `${baseUrl}/play/?id=${id}&token=${tokenData.token}`;
        console.log(`✅ Generated QR code URL with token: ${formUrl}`);
        
        QRCode.toDataURL(formUrl, { width: 640, margin: 2 })
          .then(url => {
            console.log('✅ QR code generated successfully');
            setQrCodeUrl(url);
          })
          .catch(err => {
            console.error('❌ QR code generation error:', err);
            setQrCodeUrl('');
          });
      } else {
        console.error('❌ No token in response:', tokenData);
        throw new Error('Token not received from API');
      }
    } catch (err) {
      console.error('❌ Token generation error:', err);
      // Don't fallback to URL without token - show error instead
      setQrCodeUrl('');
      // Optionally show error message to user
      console.error('Failed to generate QR code with token. Please check backend connection.');
    }
  };

  useEffect(() => {
    // Get signage ID from URL or use default
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || 'DEFAULT';
    setSignageId(id);

    // Generate initial QR code with the ID parameter
    generateQRCode(id);

    // Regenerate token and QR code every 10 minutes (tokens expire in 15 minutes)
    tokenRefreshIntervalRef.current = setInterval(() => {
      generateQRCode();
    }, 10 * 60 * 1000);

    // Load signage config
    loadSignageConfig(id);
    loadBackgroundConfig(id);

    // Connect WebSocket
    connectWebSocket(id);

    // ✅ Complete any active session on page unload/close
    const handleBeforeUnload = () => {
      if (currentGameRef.current?.sessionId && stateRef.current === STATES.PLAYING) {
        // Try to complete session before page closes using sendBeacon (more reliable than fetch)
        const sessionId = currentGameRef.current.sessionId;
        const blob = new Blob([JSON.stringify({})], { type: 'application/json' });
        navigator.sendBeacon(
          `${window.location.origin}/api/session/${sessionId}/complete`,
          blob
        );
        console.log(`📤 Attempted to complete session ${sessionId} on page unload`);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload); // For mobile browsers

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (tokenRefreshIntervalRef.current) {
        clearInterval(tokenRefreshIntervalRef.current);
      }
    };
  }, [signageId]);

  // Sync state ref with state for interval access
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Sync currentGame ref for interval access
  useEffect(() => {
    currentGameRef.current = currentGame;
  }, [currentGame]);

  // Scale QR larger in portrait, tighter in landscape
  useEffect(() => {
    const updateQrDisplaySize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isPortrait = h >= w;

      if (isPortrait) {
        // Portrait: QR is the hero — use a large share of width / height
        const size = Math.min(w * 0.62, h * 0.42, 480);
        setQrDisplaySize(Math.max(220, Math.round(size)));
      } else {
        // Landscape: keep balanced with title + side margins
        const size = Math.min(h * 0.36, w * 0.24, 300);
        setQrDisplaySize(Math.max(160, Math.round(size)));
      }
    };

    updateQrDisplaySize();
    window.addEventListener('resize', updateQrDisplaySize);
    window.addEventListener('orientationchange', updateQrDisplaySize);
    return () => {
      window.removeEventListener('resize', updateQrDisplaySize);
      window.removeEventListener('orientationchange', updateQrDisplaySize);
    };
  }, []);

  const loadSignageConfig = async (id) => {
    try {
      const response = await fetch(`${window.location.origin}/api/signage/${id}`);
      const data = await response.json();
      // Ensure outcomes are sorted consistently (by probability_weight DESC, then by id for stability)
      const sortedOutcomes = (data.outcomes || []).sort((a, b) => {
        if (b.probability_weight !== a.probability_weight) {
          return b.probability_weight - a.probability_weight;
        }
        // If weights are equal, sort by id for consistent ordering
        return (a.id || '').localeCompare(b.id || '');
      });
      setOutcomes(sortedOutcomes);
      
      // Load logo settings if available
      if (data.logo_url) {
        setLogoUrl(data.logo_url);
      } else {
        setLogoUrl(null);
      }
      setLogoSize(data.logo_size || 'xl');
      setLogoPosition(data.logo_position || 'top-left');
      
      // Load text config if available
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
    
    if (message.type === 'game_ready') {
      console.log('🎯 Game ready - showing wheel:', {
        sessionId: message.sessionId,
        userName: message.userName,
        outcome: message.outcome
      });
      
      setCurrentGame({
        sessionId: message.sessionId,
        userName: message.userName,
        outcome: message.outcome
      });
      setState(STATES.READY);
      stateRef.current = STATES.READY;
    } else if (message.type === 'game_start') {
      console.log('🎮 Starting game - spinning wheel:', {
        sessionId: message.sessionId,
        userName: message.userName,
        outcome: message.outcome
      });
      
      // Ensure we have the game data
      if (!currentGame || currentGame.sessionId !== message.sessionId) {
        setCurrentGame({
          sessionId: message.sessionId,
          userName: message.userName,
          outcome: message.outcome
        });
      }
      
      setState(STATES.PLAYING);
      stateRef.current = STATES.PLAYING;
    } else if (message.type === 'background_update') {
      setBackgroundConfig(message.background_config);
    } else if (message.type === 'logo_update') {
      setLogoUrl(message.logo_url || null);
      setLogoSize(message.logo_size || 'xl');
      setLogoPosition(message.logo_position || 'top-left');
    }
  };

  const handleWheelComplete = () => {
    console.log('🏁 Wheel animation complete, showing result for:', currentGame);
    
    // Store sessionId separately to ensure it persists even if currentGame is cleared
    const sessionIdToComplete = currentGame?.sessionId;
    
    if (!sessionIdToComplete) {
      console.error('❌ ERROR: No sessionId available when wheel completed!', currentGame);
      return; // ✅ Early return to prevent silent failures
    }
    
    // Mark session as completed immediately when wheel finishes (not after 10 seconds)
    // This ensures mobile form gets results even if WebSocket disconnects
    const markSessionComplete = async (retryCount = 0) => {
      const maxRetries = 3; // ✅ Increased from 1 to 3 retries
      
      // Try WebSocket first (faster)
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionIdToComplete) {
        try {
          wsRef.current.send(JSON.stringify({
            type: 'game_complete',
            sessionId: sessionIdToComplete
          }));
          console.log('✅ Game marked as complete via WebSocket:', sessionIdToComplete);
          return true;
        } catch (error) {
          console.error('❌ Error sending game_complete via WebSocket:', error);
        }
      }
      
      // Fallback to HTTP API if WebSocket fails
      if (sessionIdToComplete) {
        try {
          const response = await fetch(`${window.location.origin}/api/session/${sessionIdToComplete}/complete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            console.log('✅ Game marked as complete via HTTP fallback:', sessionIdToComplete);
            return true;
          } else {
            const errorText = await response.text();
            console.error('❌ HTTP fallback failed:', response.status, errorText);
            // ✅ Retry with exponential backoff
            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
              setTimeout(() => markSessionComplete(retryCount + 1), delay);
              return false;
            } else {
              console.error('❌ Failed to complete session after all retries:', sessionIdToComplete);
            }
          }
        } catch (error) {
          console.error('❌ Error marking session complete via HTTP:', error);
          // ✅ Retry with exponential backoff
          if (retryCount < maxRetries) {
            const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
            setTimeout(() => markSessionComplete(retryCount + 1), delay);
            return false;
          } else {
            console.error('❌ Failed to complete session after all retries:', sessionIdToComplete);
          }
        }
      }
      
      return false;
    };
    
    // Mark as completed immediately
    markSessionComplete();
    
    // Smooth transition: fade out wheel, then show result
    setTimeout(() => {
      if (!currentGame || !currentGame.outcome) {
        console.error('❌ ERROR: No currentGame or outcome data when showing result!', currentGame);
      }
      
      // Step 1: show the RESULT screen with congratulations
      setState(STATES.RESULT);
      stateRef.current = STATES.RESULT;
      
      // Step 2: after showing the result for 10 seconds,
      // return to idle and refresh QR for next player
      setTimeout(() => {
        console.log('🔄 Returning to idle state');
        setState(STATES.IDLE);
        stateRef.current = STATES.IDLE;
        setCurrentGame(null);
        currentGameRef.current = null;
        
        console.log('🔄 Refreshing QR code after game completion');
        generateQRCode();
      }, 10000); // show congratulations for 10 seconds before going back to idle
    }, 300); // Small delay for smooth transition
  };

  const getBackgroundStyle = () => {
    if (!backgroundConfig || !backgroundConfig.type) {
      return {
        background: '#ffffff'
      };
    }

    if (backgroundConfig.type === 'gradient') {
      const colors = backgroundConfig.colors || ['#ffffff', '#f5f5f5', '#ffffff'];
      return {
        background: `linear-gradient(to bottom right, ${colors.join(', ')})`
      };
    } else if (backgroundConfig.type === 'solid') {
      return {
        background: backgroundConfig.color || '#ffffff'
      };
    } else if (backgroundConfig.type === 'image') {
      const imageUrl = backgroundConfig.url || '';
      if (!imageUrl || imageUrl.trim() === '') {
        // Fallback if no URL provided
        return {
          background: '#ffffff'
        };
      }
      // Clean and validate URL
      const cleanUrl = imageUrl.trim();
      return {
        backgroundImage: `url("${cleanUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#ffffff' // Fallback color while image loads
      };
    }
    // Default fallback
    return {
      background: '#ffffff'
    };
  };

  const getLogoSizeClass = () => {
    switch (logoSize) {
      case 'sm':
        return 'h-12 max-w-[7rem]';
      case 'md':
        return 'h-16 max-w-[9rem]';
      case 'lg':
        return 'h-20 max-w-[12rem]';
      case '2xl':
        return 'h-28 max-w-[16rem]';
      case 'xl':
      default:
        return 'h-24 max-w-[14rem]';
    }
  };

  const isTopLogo = logoUrl && logoPosition?.startsWith('top');
  const isBottomLogo = logoUrl && logoPosition?.startsWith('bottom');

  const getLogoBarJustifyClass = () => {
    switch (logoPosition) {
      case 'top-center':
        return 'justify-center';
      case 'top-right':
      case 'bottom-right':
        return 'justify-end';
      case 'top-left':
      case 'bottom-left':
      default:
        return 'justify-start';
    }
  };

  const renderLogoImage = () => {
    if (!logoUrl) return null;
    return (
      <img
        src={logoUrl}
        alt="Logo"
        className={`${getLogoSizeClass()} w-auto object-contain`}
        onError={(e) => {
          console.error('Failed to load logo:', logoUrl);
          e.target.style.display = 'none';
        }}
      />
    );
  };

  // Fixed three-zone shell: header / main / footer — footer zone always reserved
  const renderShell = (mainContent, { showFooterText = true, alignMain = 'center' } = {}) => (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={getBackgroundStyle()}
    >
      {/* Header — logo when positioned at top; keep tight to main text */}
      <header className={`flex-shrink-0 px-8 sm:px-12 ${isTopLogo ? 'pt-5 sm:pt-6 pb-0' : 'pt-4 pb-0'} flex items-center ${isTopLogo ? getLogoBarJustifyClass() : 'justify-center'}`}>
        {isTopLogo ? renderLogoImage() : null}
      </header>

      {/* Main — start = closer to logo; center = balanced for game states */}
      <main className={`flex-1 min-h-0 flex justify-center px-6 sm:px-10 ${
        alignMain === 'start' ? 'items-start pt-3 sm:pt-4' : 'items-center'
      }`}>
        {mainContent}
      </main>

      {/* Footer — always pinned so bottom text never disappears */}
      <footer className="flex-shrink-0 px-8 sm:px-12 pb-6 sm:pb-8 pt-3 min-h-[4.5rem] flex items-center">
        {isBottomLogo ? (
          <div className={`w-full flex items-end gap-6 ${getLogoBarJustifyClass()}`}>
            {logoPosition === 'bottom-right' ? (
              <>
                {showFooterText && (
                  <p
                    className="flex-1 text-center text-base sm:text-lg lg:text-xl font-light tracking-wide"
                    style={{ color: textConfig.textColorTertiary || '#6B7280' }}
                  >
                    {textConfig.footerText}
                  </p>
                )}
                {!showFooterText && <div className="flex-1" />}
                {renderLogoImage()}
              </>
            ) : (
              <>
                {renderLogoImage()}
                {showFooterText ? (
                  <p
                    className="flex-1 text-center text-base sm:text-lg lg:text-xl font-light tracking-wide"
                    style={{ color: textConfig.textColorTertiary || '#6B7280' }}
                  >
                    {textConfig.footerText}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}
              </>
            )}
          </div>
        ) : showFooterText ? (
          <p
            className="w-full text-center text-base sm:text-lg lg:text-xl font-light tracking-wide"
            style={{ color: textConfig.textColorTertiary || '#6B7280' }}
          >
            {textConfig.footerText}
          </p>
        ) : (
          <div className="w-full h-6" aria-hidden="true" />
        )}
      </footer>
    </div>
  );

  if (state === STATES.READY) {
    return renderShell(
      <Wheel
        userName={currentGame?.userName || 'Player'}
        outcome={currentGame?.outcome}
        outcomes={outcomes}
        onComplete={handleWheelComplete}
        ready={true}
        readyMessage={textConfig.readyMessage}
        readyInstruction={textConfig.readyInstruction}
        textColorPrimary={textConfig.textColorPrimary}
        textColorSecondary={textConfig.textColorSecondary}
      />,
      { showFooterText: false }
    );
  }

  if (state === STATES.PLAYING) {
    return renderShell(
      <Wheel
        userName={currentGame?.userName || 'Player'}
        outcome={currentGame?.outcome}
        outcomes={outcomes}
        onComplete={handleWheelComplete}
        ready={false}
        playingMessage={textConfig.playingMessage}
        textColorPrimary={textConfig.textColorPrimary}
        textColorSecondary={textConfig.textColorSecondary}
      />,
      { showFooterText: false }
    );
  }

  if (state === STATES.RESULT) {
    const isNegative = currentGame?.outcome?.is_negative || false;

    return renderShell(
      <div className="text-center max-w-4xl w-full space-y-6 sm:space-y-8">
        {!isNegative && (
          <div className="text-5xl sm:text-6xl lg:text-7xl animate-fadeIn">🎉</div>
        )}
        <div className="space-y-3 sm:space-y-4">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light tracking-tight animate-fadeIn"
            style={{ animationDelay: '0.1s', color: textConfig.textColorPrimary || '#111827' }}
          >
            {currentGame?.userName}
          </h1>
          {!isNegative && (
            <h2
              className="text-xl sm:text-2xl lg:text-3xl font-light animate-fadeIn"
              style={{ animationDelay: '0.2s', color: textConfig.textColorSecondary || '#4B5563' }}
            >
              {textConfig.resultWinMessage}
            </h2>
          )}
        </div>
        <div
          className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light animate-scaleIn"
          style={{ animationDelay: '0.3s', color: textConfig.textColorPrimary || '#111827' }}
        >
          {currentGame?.outcome?.label || 'Congratulations!'}
        </div>
      </div>,
      { showFooterText: false }
    );
  }

  // IDLE — brand, headline, subtitle, QR; keep logo and title close
  return renderShell(
    <div className="w-full max-w-3xl text-center flex flex-col items-center gap-6 sm:gap-8">
      <div className="space-y-2 sm:space-y-3 animate-fadeIn">
        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.05]"
          style={{ color: textConfig.textColorPrimary || '#111827' }}
        >
          {textConfig.idleHeading}
        </h1>
        <p
          className="text-lg sm:text-xl lg:text-2xl font-light tracking-wide"
          style={{ color: textConfig.textColorSecondary || '#4B5563' }}
        >
          {textConfig.idleSubtitle}
        </p>
      </div>

      {qrCodeUrl && (
        <div className="animate-scaleIn" style={{ animationDelay: '0.15s' }}>
          <div
            className="bg-white rounded-2xl border border-black/5 shadow-[0_8px_40px_rgba(0,0,0,0.06)] transition-[padding] duration-300"
            style={{ padding: Math.max(16, Math.round(qrDisplaySize * 0.08)) }}
          >
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="block transition-[width,height] duration-300 ease-out"
              style={{ width: qrDisplaySize, height: qrDisplaySize }}
            />
          </div>
        </div>
      )}
    </div>,
    { showFooterText: true, alignMain: isTopLogo ? 'start' : 'center' }
  );
}

export default App;
