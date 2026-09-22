import { useEffect, useRef, useState } from 'react';

// Reference-inspired color scheme: Red, Gray/White alternating
const COLORS = [
  { main: '#E5E5E5', border: '#CCCCCC' }, // Light Gray/White
  { main: '#DC2626', border: '#B91C1C' }, // Red
  { main: '#E5E5E5', border: '#CCCCCC' }, // Light Gray/White
  { main: '#DC2626', border: '#B91C1C' }, // Red
  { main: '#E5E5E5', border: '#CCCCCC' }, // Light Gray/White
  { main: '#DC2626', border: '#B91C1C' }  // Red
];

function Wheel({ userName, outcome, outcomes, onComplete, ready = false, readyMessage, readyInstruction, playingMessage, textColorPrimary = '#111827', textColorSecondary = '#4B5563' }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    // Only start spinning if we have outcome and we're not in ready state
    if (outcome && !isSpinning && !ready) {
      startSpin();
    }
  }, [outcome, ready]);

  const startSpin = () => {
    setIsSpinning(true);
    const canvas = canvasRef.current;
    if (!canvas || !outcomes.length || !outcome) return;

    // Wait a moment for canvas to be ready
    setTimeout(() => {
      const dpr = window.devicePixelRatio || 1;
      const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
      
      // Set canvas size first
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
      
      const ctx = canvas.getContext('2d');
      // Clear canvas before starting
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = Math.min(centerX, centerY) - 40; // More space for outer rim

      // Find the index of the winning outcome in the outcomes array
      // IMPORTANT: The outcomes array must be in the same order as displayed on the wheel
      let outcomeIndex = outcomes.findIndex(o => o.id === outcome.id);
      
      // If outcome not found, log error and use first outcome as fallback
      if (outcomeIndex === -1) {
        console.error('Outcome not found in outcomes array:', outcome.id, outcomes);
        console.error('Available outcomes:', outcomes.map(o => ({ id: o.id, label: o.label })));
        outcomeIndex = 0; // Fallback to first outcome to prevent crash
      }
      
      const totalSegments = outcomes.length;
      const segmentAngle = (2 * Math.PI) / totalSegments;

      // ===== PRECISE WHEEL STOPPING (works for any number of outcomes) =====
      // Pointer is at TOP of wheel (270° in standard math, but canvas Y is inverted)
      // In canvas coordinates: angle increases clockwise from right (0°)
      // Top = -90° or equivalently 270° when normalized
      const pointerAngle = (3 * Math.PI / 2); // 270° = top
      const segmentCenterAngle = (outcomeIndex * segmentAngle) + (segmentAngle / 2);
      
      // Calculate rotation needed to align segment center with pointer
      // After rotation: segmentCenter + rotation should equal pointerAngle
      let targetAngleForPointer = pointerAngle - segmentCenterAngle;
      
      // Normalize to [0, 2π) for consistent positive rotation
      const twoPi = 2 * Math.PI;
      while (targetAngleForPointer < 0) targetAngleForPointer += twoPi;
      while (targetAngleForPointer >= twoPi) targetAngleForPointer -= twoPi;

      // Calculate where each segment will be after rotation (for debugging)
      const segmentPositions = outcomes.map((o, idx) => {
        const segCenter = (idx * segmentAngle) + (segmentAngle / 2);
        const finalPos = (segCenter + targetAngleForPointer) % twoPi;
        const finalPosDeg = (finalPos * 180 / Math.PI);
        const pointerDeg = 270;
        let dist = Math.abs(finalPosDeg - pointerDeg);
        if (dist > 180) dist = 360 - dist;
        return {
          index: idx,
          label: o.label,
          finalDeg: finalPosDeg.toFixed(1),
          distFromPointer: dist.toFixed(1)
        };
      });
      
      const closest = segmentPositions.reduce((a, b) => 
        parseFloat(a.distFromPointer) < parseFloat(b.distFromPointer) ? a : b
      );

      console.log(`🎯 Selected: ${outcome.label} (index ${outcomeIndex}), Rotation: ${(targetAngleForPointer * 180 / Math.PI).toFixed(1)}°, Segments: ${totalSegments}`);
      console.log(`📍 Closest to pointer: index ${closest.index} (${closest.label}) at ${closest.finalDeg}°, distance: ${closest.distFromPointer}°`);
      if (parseInt(closest.index) !== outcomeIndex) {
        const offset = parseInt(closest.index) - outcomeIndex;
        console.warn(`⚠️  OFFSET DETECTED: ${offset} segments (${(offset * segmentAngle * 180 / Math.PI).toFixed(1)}°)`);
      }
      
      // Spin with multiple WHOLE rotations plus target angle
      // CRITICAL: Use whole number rotations only, so final angle is always targetAngleForPointer
      const fullRotations = Math.floor(4 + Math.random() * 2); // 4, 5, or 6 full rotations (random but whole)
      const finalRotation = (fullRotations * twoPi) + targetAngleForPointer;
      
      console.log(`🔄 Full rotations: ${fullRotations}, Final rotation: ${(finalRotation * 180 / Math.PI).toFixed(1)}° (${finalRotation.toFixed(2)} rad)`);

      let currentRotation = 0;
      const duration = 10000; // 10 seconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        if (progress < 1) {
          // Smooth easing function (ease-out cubic for natural deceleration)
          const easeOut = 1 - Math.pow(1 - progress, 3);
          currentRotation = finalRotation * easeOut;
          
          setRotation(currentRotation);
          drawWheel(ctx, centerX, centerY, radius, currentRotation, outcomes);
          
          animationRef.current = requestAnimationFrame(animate);
        } else {
          // Animation complete - set EXACT final rotation (no easing, no approximation)
          currentRotation = finalRotation;
          setRotation(finalRotation);
          drawWheel(ctx, centerX, centerY, radius, finalRotation, outcomes);
          
          // Verify final position (normalize properly to see where segment ended up)
          let finalSegmentCenter = segmentCenterAngle + finalRotation;
          // Normalize to [0, 2π) to see actual angle position
          finalSegmentCenter = ((finalSegmentCenter % twoPi) + twoPi) % twoPi;
          const finalSegmentCenterDeg = (finalSegmentCenter * 180 / Math.PI);
          const finalRotationDeg = (finalRotation * 180 / Math.PI);
          const finalRotationNormalized = ((finalRotation % twoPi) + twoPi) % twoPi;
          const finalRotationNormalizedDeg = (finalRotationNormalized * 180 / Math.PI);
          
          console.log(`✅ Animation complete. Segment ${outcomeIndex} center at: ${finalSegmentCenterDeg.toFixed(1)}° (should be 270°)`);
          console.log(`   Total rotation: ${finalRotationDeg.toFixed(1)}° | Normalized: ${finalRotationNormalizedDeg.toFixed(1)}°`);
          
          if (Math.abs(finalSegmentCenterDeg - 270) > 5) {
            console.error(`❌ ALIGNMENT ERROR: Segment is ${Math.abs(finalSegmentCenterDeg - 270).toFixed(1)}° away from pointer!`);
          }
          
          // Smooth transition delay before showing result
          setTimeout(() => {
            onComplete();
          }, 800);
        }
      };

      animate();
    }, 100);
  };

  const drawWheel = (ctx, centerX, centerY, radius, rotation, outcomesToDraw = outcomes) => {
    // Clear canvas completely before drawing
    // Get the actual canvas dimensions (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = ctx.canvas.width / dpr;
    const canvasHeight = ctx.canvas.height / dpr;
    
    // Clear the entire canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to clear properly
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    
    // Reset transform and scale for drawing
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const totalSegments = outcomesToDraw.length;
    const segmentAngle = (2 * Math.PI) / totalSegments;
    // Minimal rim width to match pointer - thinner border
    const outerRimWidth = Math.max(20, Math.min(30, radius * 0.06));
    const innerRadius = radius - outerRimWidth;

    // Draw minimal outer rim - clean, simple border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    
    // Subtle shadow only
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = outerRimWidth;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Draw segments with colors from database
    outcomesToDraw.forEach((outcomeItem, index) => {
      const startAngle = (index * segmentAngle) + rotation;
      const endAngle = ((index + 1) * segmentAngle) + rotation;
      
      // Use colors from database, fallback to default COLORS array
      // Normalize color to uppercase for consistent comparison
      const backgroundColor = outcomeItem.background_color 
        ? outcomeItem.background_color.toUpperCase() 
        : COLORS[index % COLORS.length].main;
      
      // Calculate darker border color from background
      const getDarkerColor = (color) => {
        if (!color) return '#CCCCCC';
        // Normalize color
        const normalizedColor = color.toUpperCase();
        if (normalizedColor === '#E5E5E5') return '#CCCCCC';
        if (normalizedColor === '#DC2626') return '#B91C1C';
        // For custom colors, darken by 20%
        const hex = normalizedColor.replace('#', '');
        // Handle both 3-digit and 6-digit hex
        let r, g, b;
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else {
          r = parseInt(hex.substr(0, 2), 16);
          g = parseInt(hex.substr(2, 2), 16);
          b = parseInt(hex.substr(4, 2), 16);
        }
        r = Math.max(0, r - 40);
        g = Math.max(0, g - 40);
        b = Math.max(0, b - 40);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
      };
      const calculatedBorderColor = getDarkerColor(backgroundColor);

      // Draw segment - clean, flat design
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
      ctx.closePath();
      
      // Minimal shadow for subtle depth
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = backgroundColor;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Minimal segment border - thin, clean line
      ctx.strokeStyle = calculatedBorderColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw text with dynamic sizing based on number of outcomes
      const textAngle = startAngle + segmentAngle / 2;
      
      // Dynamically adjust text radius based on number of outcomes
      // More outcomes = closer to center to fit better
      const textRadiusMultiplier = totalSegments <= 4 ? 0.7 : totalSegments <= 8 ? 0.65 : 0.6;
      const textRadius = innerRadius * textRadiusMultiplier;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Text color from database, fallback to default based on background
      // Normalize colors for consistent comparison
      const normalizedBgColor = backgroundColor.toUpperCase();
      const textColor = outcomeItem.text_color 
        ? outcomeItem.text_color.toUpperCase()
        : (normalizedBgColor === '#DC2626' ? '#FFFFFF' : '#000000');
      
      ctx.fillStyle = textColor;
      
      // Dynamically calculate font size based on number of outcomes and segment angle
      // More outcomes = smaller segments = smaller font needed
      // Base calculation: scale inversely with number of outcomes
      const baseFontSize = radius * 0.09;
      // Scale factor: decreases as number of outcomes increases
      // Formula: 1 / (1 + (outcomes - 4) * 0.15) for outcomes > 4
      // This ensures smooth scaling: 4 outcomes = 100%, 8 outcomes = ~73%, 12 outcomes = ~56%
      const scaleFactor = totalSegments <= 4 
        ? 1.0 
        : totalSegments <= 8 
        ? 1.0 / (1 + (totalSegments - 4) * 0.12)
        : 1.0 / (1 + (totalSegments - 4) * 0.15);
      
      const calculatedFontSize = baseFontSize * scaleFactor;
      // Clamp between reasonable min/max values
      const fontSize = Math.max(12, Math.min(36, calculatedFontSize));
      
      ctx.font = `300 ${fontSize}px -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif`;
      
      // Minimal text shadow for subtle readability
      // Normalize text color for comparison
      const normalizedTextColor = textColor.toUpperCase();
      ctx.shadowBlur = 2;
      ctx.shadowColor = normalizedTextColor === '#FFFFFF' 
        ? 'rgba(0, 0, 0, 0.3)' 
        : 'rgba(255, 255, 255, 0.3)';
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;
      
      // Dynamically adjust max width for text wrapping based on segment angle
      // Smaller segments (more outcomes) = smaller max width
      // Calculate arc length for the segment: radius * angle
      const segmentArcLength = textRadius * segmentAngle;
      // Use 60-70% of arc length as max width, but clamp to reasonable values
      const maxWidth = Math.max(fontSize * 2, Math.min(innerRadius * 0.8, segmentArcLength * 0.65));
      
      const words = outcomeItem.label.split(' ');
      let line = '';
      // Adjust initial Y position based on font size for better centering
      let y = -(fontSize * 0.4);
      
      words.forEach((word, i) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, 0, y);
          line = word + ' ';
          y += fontSize * 1.2;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, 0, y);
      
      // Reset shadow
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.restore();
    });

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw minimal center circle - clean, simple design
    const centerButtonRadius = Math.max(45, Math.min(60, radius * 0.1));
    
    // Center circle - flat, minimal design
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerButtonRadius, 0, 2 * Math.PI);
    
    // Subtle shadow only
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    
    // Simple solid color - no gradient
    ctx.fillStyle = '#DC2626';
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Minimal border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw minimal triangular pointer at top - clean, simple design
    // Pointer size matches the rim width exactly from end to end
    const pointerHeight = outerRimWidth; // Match rim width exactly
    const pointerWidth = pointerHeight * 0.7;
    
    // Position pointer at top edge - aligned with rim from end to end
    const borderOuterEdge = centerY - radius;
    const borderInnerEdge = centerY - innerRadius;
    const pointerTipY = borderInnerEdge; // Tip at inner edge
    const pointerBaseY = borderOuterEdge; // Base at outer edge - matches rim exactly

    // Simple, clean pointer - minimal gradient
    const pointerGradient = ctx.createLinearGradient(
      centerX, pointerBaseY,
      centerX, pointerTipY
    );
    pointerGradient.addColorStop(0, '#F5F5F5');
    pointerGradient.addColorStop(1, '#E0E0E0');

    // Draw triangle
    ctx.beginPath();
    ctx.moveTo(centerX, pointerTipY);
    ctx.lineTo(centerX - pointerWidth, pointerBaseY);
    ctx.lineTo(centerX + pointerWidth, pointerBaseY);
    ctx.closePath();
    
    // Minimal shadow
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    ctx.fillStyle = pointerGradient;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    
    // Enhanced pointer border for definition
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Add inner highlight line for 3D effect
    ctx.beginPath();
    ctx.moveTo(centerX - pointerWidth * 0.6, pointerBaseY + pointerHeight * 0.2);
    ctx.lineTo(centerX, pointerTipY - pointerHeight * 0.1);
    ctx.lineTo(centerX + pointerWidth * 0.6, pointerBaseY + pointerHeight * 0.2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Enhanced red center dot at the tip (matching reference)
    ctx.beginPath();
    ctx.arc(centerX, pointerTipY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#DC2626'; // Red center
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    
    // White outer ring around red dot
    ctx.beginPath();
    ctx.arc(centerX, pointerTipY, 8, 0, 2 * Math.PI);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  };

  // Function to calculate and set canvas size
  const updateCanvasSize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
    
    // Store current rotation to maintain it during resize
    const currentRotation = rotation;
    
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';

    // Redraw if ready or spinning
    if ((ready || isSpinning) && outcomes.length > 0 && outcome) {
      const ctx = canvas.getContext('2d');
      // Clear and reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = Math.min(centerX, centerY) - 40;
      drawWheel(ctx, centerX, centerY, radius, currentRotation, outcomes);
    } else {
      // Clear canvas completely if not ready or spinning
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    // Initial canvas setup
    updateCanvasSize();

    // Add resize event listener
    const handleResize = () => {
      updateCanvasSize();
    };

    // Throttle resize events for better performance
    let resizeTimeout;
    const throttledResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };

    window.addEventListener('resize', throttledResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', throttledResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);


  // Redraw wheel when rotation or state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;

    // Ensure canvas size is set
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';
    }

    // Draw if we're ready (visible but not spinning) or spinning (have outcome and outcomes loaded)
    if ((ready || isSpinning) && outcomes.length > 0 && outcome) {
      const ctx = canvas.getContext('2d');
      // Clear and reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = Math.min(centerX, centerY) - 40;
      drawWheel(ctx, centerX, centerY, radius, rotation, outcomes);
    } else {
      // Clear canvas completely if not ready or spinning
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [outcomes, rotation, isSpinning, outcome, ready]);

  // Default messages if not provided
  const defaultReadyMessage = readyMessage || 'Good luck, {userName}!';
  const defaultReadyInstruction = readyInstruction || 'Press the buzzer to spin';
  const defaultPlayingMessage = playingMessage || 'The wheel is spinning';
  
  // Replace {userName} placeholder
  const displayReadyMessage = defaultReadyMessage.replace('{userName}', userName);

  // Don't render wheel until we have outcomes
  if (!outcomes.length || !outcome) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-6xl font-bold mb-3 drop-shadow-lg" style={{ color: textColorPrimary || '#111827' }}>
            {displayReadyMessage}
          </h2>
          <p className="text-3xl font-light tracking-wide" style={{ color: textColorSecondary || '#4B5563' }}>
            Preparing the wheel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      <div className="text-center mb-6 sm:mb-8 relative z-10">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-light mb-3 tracking-tight" style={{ color: textColorPrimary || '#111827' }}>
          {displayReadyMessage}
        </h2>
        {ready ? (
          <p className="text-xl sm:text-2xl lg:text-3xl font-light tracking-wide" style={{ color: textColorSecondary || '#4B5563' }}>
            {defaultReadyInstruction}
          </p>
        ) : (
          <p className="text-xl sm:text-2xl lg:text-3xl font-light tracking-wide" style={{ color: textColorSecondary || '#4B5563' }}>
            {defaultPlayingMessage}
          </p>
        )}
      </div>
      
      <div className="relative z-10">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[75vh] sm:max-h-[80vh]"
          style={{
            filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.1))',
            transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: (ready || isSpinning) ? 1 : 0,
            transform: (ready || isSpinning) ? 'scale(1)' : 'scale(0.98)',
            backgroundColor: 'transparent'
          }}
        />
      </div>
    </div>
  );
}

export default Wheel;
