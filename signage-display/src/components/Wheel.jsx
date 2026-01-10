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

function Wheel({ userName, outcome, outcomes, onComplete }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const animationRef = useRef(null);

  useEffect(() => {
    if (outcome && !isSpinning) {
      startSpin();
    }
  }, [outcome]);

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
          
          setIsSpinning(false);
          
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
    // Increased rim width to accommodate pointer inside the border
    // Pointer height is ~35px, so we need at least 40-45px border
    const outerRimWidth = Math.max(45, Math.min(60, radius * 0.12));
    const innerRadius = radius - outerRimWidth;

    // Draw outer black rim with glowing white dots
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    // Draw glowing white dots on outer rim
    const numDots = 48; // Number of dots around the rim
    // Responsive dot size based on radius
    const dotRadius = Math.max(2, Math.min(4, radius * 0.01));
    for (let i = 0; i < numDots; i++) {
      const angle = (i * 2 * Math.PI / numDots) + rotation;
      const dotX = centerX + Math.cos(angle) * (radius - outerRimWidth / 2);
      const dotY = centerY + Math.sin(angle) * (radius - outerRimWidth / 2);
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Draw segments with alternating red and gray colors
    outcomesToDraw.forEach((outcome, index) => {
      const startAngle = (index * segmentAngle) + rotation;
      const endAngle = ((index + 1) * segmentAngle) + rotation;
      const colorPair = COLORS[index % COLORS.length];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = colorPair.main;
      ctx.fill();

      // Draw segment border
      ctx.strokeStyle = colorPair.border;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw text with bold styling matching reference
      const textAngle = startAngle + segmentAngle / 2;
      const textRadius = innerRadius * 0.7;
      const textX = centerX + Math.cos(textAngle) * textRadius;
      const textY = centerY + Math.sin(textAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(textAngle + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Text color based on segment color (white on red, black on gray)
      const textColor = colorPair.main === '#DC2626' ? '#FFFFFF' : '#000000';
      
      // Text shadow for readability
      ctx.shadowBlur = 6;
      ctx.shadowColor = textColor === '#FFFFFF' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = textColor;
      // Responsive font size based on radius
      const fontSize = Math.max(16, Math.min(32, radius * 0.08));
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      
      // Wrap text if too long
      const maxWidth = innerRadius * 0.65;
      const words = outcome.label.split(' ');
      let line = '';
      let y = -14;
      
      words.forEach((word, i) => {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, 0, y);
          line = word + ' ';
          y += 32;
        } else {
          line = testLine;
        }
      });
      ctx.fillText(line, 0, y);
      ctx.restore();
    });

    // Reset shadow
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw center red button with "SPIN" text (reference style)
    const centerButtonRadius = 60;
    
    // Outer ring of white dots around center button
    const centerDots = 12;
    const centerDotRadius = 3;
    for (let i = 0; i < centerDots; i++) {
      const angle = (i * 2 * Math.PI / centerDots);
      const dotX = centerX + Math.cos(angle) * (centerButtonRadius + 8);
      const dotY = centerY + Math.sin(angle) * (centerButtonRadius + 8);
      
      ctx.beginPath();
      ctx.arc(dotX, dotY, centerDotRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Center red circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerButtonRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#DC2626';
    ctx.fill();
    
    // Center circle border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw "SPIN" text in center (if not spinning, otherwise show outcome)
    ctx.fillStyle = '#FFFFFF';
    // Responsive font size for center text
    const centerFontSize = Math.max(20, Math.min(36, radius * 0.1));
    ctx.font = `bold ${centerFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText('SPIN', centerX, centerY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw silver triangular pointer at top edge of wheel (inside the black border)
    // Pointer sits completely inside the black border, pointing toward center
    // Responsive pointer size based on radius
    const pointerHeight = Math.max(25, Math.min(35, radius * 0.08));
    const pointerWidth = Math.max(20, Math.min(30, radius * 0.07));
    
    // Position pointer completely inside the black border
    // The black border extends from radius (outer edge) to innerRadius (inner edge)
    // Pointer tip should be at innerRadius (pointing to segments)
    // Pointer base should be above tip, inside the border area
    const borderOuterEdge = centerY - radius; // Top of black border
    const borderInnerEdge = centerY - innerRadius; // Bottom of black border (where segments start)
    
    // CRITICAL: Pointer tip position in polar coordinates
    // The pointer is at the TOP of the wheel (centerY - innerRadius)
    // In polar coordinates: angle = 3π/2 (270°), radius = innerRadius
    // This is the point we're trying to align segments with
    
    // Position pointer tip at inner edge of border (pointing to segments)
    const pointerTipY = borderInnerEdge;
    // Position pointer base above tip, ensuring it stays inside the border
    // Leave some margin from the outer edge of the border
    const marginFromOuter = 5; // Small margin from outer border edge
    const pointerBaseY = Math.max(borderOuterEdge + marginFromOuter, pointerTipY - pointerHeight);

    // Silver gradient for pointer (light at base, darker at tip)
    const pointerGradient = ctx.createLinearGradient(
      centerX, pointerBaseY,
      centerX, pointerTipY
    );
    pointerGradient.addColorStop(0, '#F5F5F5');
    pointerGradient.addColorStop(0.5, '#C0C0C0');
    pointerGradient.addColorStop(1, '#808080');

    // Draw triangle with tip pointing down toward wheel center
    // Tip is at the inner edge of the wheel, pointing to the segment
    ctx.beginPath();
    ctx.moveTo(centerX, pointerTipY); // Tip at wheel edge, pointing inward
    ctx.lineTo(centerX - pointerWidth, pointerBaseY); // Top left corner
    ctx.lineTo(centerX + pointerWidth, pointerBaseY); // Top right corner
    ctx.closePath();
    ctx.fillStyle = pointerGradient;
    ctx.fill();
    
    // Pointer border for definition
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    ctx.stroke();

    // White dot at the tip (exact pointing position at wheel edge)
    ctx.beginPath();
    ctx.arc(centerX, pointerTipY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.fill();
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

    // Redraw if spinning
    if (isSpinning && outcomes.length > 0 && outcome) {
      const ctx = canvas.getContext('2d');
      // Clear and reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = Math.min(centerX, centerY) - 40;
      drawWheel(ctx, centerX, centerY, radius, currentRotation);
    } else {
      // Clear canvas completely if not spinning
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

    // Only draw if we're spinning (have outcome and outcomes loaded)
    if (isSpinning && outcomes.length > 0 && outcome) {
      const ctx = canvas.getContext('2d');
      // Clear and reset transform
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = Math.min(centerX, centerY) - 40;
      drawWheel(ctx, centerX, centerY, radius, rotation);
    } else {
      // Clear canvas completely if not spinning
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [outcomes, rotation, isSpinning, outcome]);

  // Don't render wheel until we have outcomes and are ready to spin
  if (!outcomes.length || !outcome) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-6xl font-bold text-white mb-3 drop-shadow-lg">
            Good luck, {userName}!
          </h2>
          <p className="text-3xl text-white/90 font-light tracking-wide">
            Preparing the wheel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      <div className="text-center mb-8 relative z-10">
        <h2 className="text-6xl font-bold text-white mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-pulse">
          Good luck, {userName}!
        </h2>
        <p className="text-3xl text-white/90 font-light tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          The wheel is spinning...
        </p>
      </div>
      
      <div className="relative z-10">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-[80vh]"
          style={{
            filter: 'drop-shadow(0 30px 60px rgba(0, 0, 0, 0.8))',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
            opacity: isSpinning ? 1 : 0,
            transform: isSpinning ? 'scale(1)' : 'scale(0.95)',
            backgroundColor: 'transparent'
          }}
        />
      </div>
    </div>
  );
}

export default Wheel;
