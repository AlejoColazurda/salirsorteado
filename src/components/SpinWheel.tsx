import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';

interface SpinWheelProps {
  participants: string[];
  roles: string[];
  drawName: string;
  onSpinEnd: (results: { participantName: string; role: string }[]) => void;
  isMultiplayer?: boolean;
  canISpin?: boolean;
  onTriggerRemoteSpin?: (speed: number, winnerIndex: number) => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  participants,
  roles,
  drawName,
  onSpinEnd,
  isMultiplayer = false,
  canISpin = true,
  onTriggerRemoteSpin,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<{ name: string; role: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pointerFlick, setPointerFlick] = useState(false);

  // Audio Context for synthetic haptic tick sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Rotation states
  const rotationRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const lastTickAngleRef = useRef(0);

  // Dragging interaction states (Refs to prevent state-change lag during dragging)
  const isDraggingRef = useRef(false);
  const lastAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityTrackerRef = useRef<number[]>([]);

  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Sound generator
  const playTickSound = (frequencyMultiplier = 1) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Wooden needle clicking click sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 * frequencyMultiplier, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100 * frequencyMultiplier, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      // Audio errors ignored
    }
  };

  const playWinSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      // Audio errors ignored
    }
  };

  const segmentColors = [
    '#ff3b30', // red
    '#ff9500', // orange
    '#ffcc00', // yellow
    '#34c759', // green
    '#007aff', // blue
    '#5856d6', // purple
    '#af52de', // violet
    '#ff2d55', // pink
  ];

  // Draw the wheel
  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina support scaling
    const dpr = window.devicePixelRatio || 1;
    const size = 350; // logical size
    
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    }
    
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = center - 16;

    const items = participants.length > 0 ? participants : ['Ingresa nombres'];
    const sliceAngle = (2 * Math.PI) / items.length;

    // 1. Draw background outer liquid ring
    ctx.shadowBlur = 24;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.stroke();
    ctx.restore(); // Clear shadow blur for segments

    // 2. Draw Wheel Segments
    items.forEach((item, i) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      const angle = rotationRef.current + i * sliceAngle;

      // Draw segment slice
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + sliceAngle);
      ctx.closePath();

      // Glassy gradient
      const grad = ctx.createRadialGradient(center, center, center * 0.1, center, center, radius);
      const baseColor = segmentColors[i % segmentColors.length];
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.5, baseColor + 'bb'); // semi transparent neon color
      grad.addColorStop(1, baseColor); // solid color at boundary

      ctx.fillStyle = grad;
      ctx.fill();

      // Translucent borders (simulating glass edge refraction)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 3. Draw text label
      ctx.translate(center, center);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Text Shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      
      const truncatedText = item.length > 14 ? item.substring(0, 12) + '..' : item;
      ctx.fillText(truncatedText, radius - 24, 0);
      ctx.restore();
    });

    // 4. Draw central glossy glass pin hub
    ctx.save();
    ctx.scale(dpr, dpr);
    
    // Outer glass bubble shadow
    ctx.beginPath();
    ctx.arc(center, center, 34, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    
    // Core white glossy cap
    ctx.beginPath();
    ctx.arc(center, center, 26, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(center - 6, center - 6, 2, center, center, 26);
    centerGrad.addColorStop(0, '#ffffff');
    centerGrad.addColorStop(0.5, '#f5f5f7');
    centerGrad.addColorStop(1, '#d1d1d6');
    ctx.fillStyle = centerGrad;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.fill();
    ctx.restore();

    // Center metallic pointer dot
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, 2 * Math.PI);
    const innerGrad = ctx.createRadialGradient(center - 2, center - 2, 1, center, center, 8);
    innerGrad.addColorStop(0, '#007aff');
    innerGrad.addColorStop(1, '#0040dd');
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.restore();
  };

  // Synchronized remote spin listener
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleRemoteSpin = (e: Event) => {
      const customEvent = e as CustomEvent<{ speed: number; winnerIndex: number }>;
      const { winnerIndex } = customEvent.detail;

      // Calculate target angle based on winnerIndex
      const sectorAngle = (2 * Math.PI) / participants.length;
      
      // Target angle at 12 o'clock for winnerIndex is (1.5 * Math.PI - (winnerIndex + 0.5) * sectorAngle)
      const targetStopAngle = (1.5 * Math.PI - (winnerIndex + 0.5) * sectorAngle) % (2 * Math.PI);
      
      let currentMod = rotationRef.current % (2 * Math.PI);
      if (currentMod < 0) currentMod += 2 * Math.PI;

      let targetMod = targetStopAngle % (2 * Math.PI);
      if (targetMod < 0) targetMod += 2 * Math.PI;

      let diff = targetMod - currentMod;
      if (diff < 0) diff += 2 * Math.PI;

      const totalRotation = diff + 6 * 2 * Math.PI; // at least 6 turns
      
      setWinner(null);
      setIsSpinning(true);
      angularVelocityRef.current = totalRotation * (1 - 0.991);
      getAudioContext();
    };

    window.addEventListener('remote-spin', handleRemoteSpin);
    return () => {
      window.removeEventListener('remote-spin', handleRemoteSpin);
    };
  }, [isMultiplayer, participants]);

  // Spin animation loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      // Only animate if the user is not actively dragging the wheel
      if (!isDraggingRef.current) {
        if (angularVelocityRef.current > 0.002) {
          rotationRef.current += angularVelocityRef.current;
          angularVelocityRef.current *= 0.991; // Constant decay for mathematical precision

          // Tick sound when pointer crosses segments
          const itemsCount = participants.length > 0 ? participants.length : 1;
          const segmentAngle = (2 * Math.PI) / itemsCount;
          const currentProgress = rotationRef.current / segmentAngle;
          
          if (Math.floor(currentProgress) !== Math.floor(lastTickAngleRef.current)) {
            playTickSound(Math.min(1.5, 0.6 + angularVelocityRef.current * 3));
            lastTickAngleRef.current = currentProgress;
            
            // Visual needle click/flick animation
            setPointerFlick(true);
            setTimeout(() => setPointerFlick(false), 50);
          }

          drawWheel();
          animId = requestAnimationFrame(animate);
        } else if (isSpinning) {
          setIsSpinning(false);
          angularVelocityRef.current = 0;
          determineWinner();
        }
      }
    };

    if (isSpinning && !isDraggingRef.current) {
      animId = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animId);
  }, [isSpinning, participants]);

  // Initial draw
  useEffect(() => {
    drawWheel();
  }, [participants]);

  const determineWinner = () => {
    if (participants.length === 0) return;

    // Normalise angle pointing at 12 o'clock (1.5 * Math.PI) on the rotated wheel
    let targetAngle = (1.5 * Math.PI - rotationRef.current) % (2 * Math.PI);
    if (targetAngle < 0) {
      targetAngle += 2 * Math.PI;
    }
    const sectorAngle = (2 * Math.PI) / participants.length;
    const index = Math.floor(targetAngle / sectorAngle) % participants.length;

    const winnerName = participants[index];
    const primaryRole = roles.length > 0 ? roles[0] : 'Sorteado';

    const results = [{ participantName: winnerName, role: primaryRole }];
    setWinner({ name: winnerName, role: primaryRole });
    
    // Trigger confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#007aff', '#bf5af2', '#ff2d55', '#34c759', '#ff9500'],
    });

    playWinSound();
    onSpinEnd(results);
  };

  const handleSpinStart = () => {
    if (isSpinning || participants.length === 0 || (isMultiplayer && !canISpin)) return;
    
    getAudioContext();
    setWinner(null);
    setIsSpinning(true);
    
    const initialVelocity = 0.55 + Math.random() * 0.35;

    if (isMultiplayer && onTriggerRemoteSpin) {
      const winnerIndex = Math.floor(Math.random() * participants.length);
      onTriggerRemoteSpin(initialVelocity, winnerIndex);
    } else {
      angularVelocityRef.current = initialVelocity;
    }
  };

  // Dragging event handlers helper
  const getCoordinatesFromEvent = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - centerX,
      y: clientY - centerY,
    };
  };

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (participants.length === 0 || winner !== null || isSpinning || (isMultiplayer && !canISpin)) return;
    
    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    getAudioContext();
    setWinner(null);

    // Stop active spins on drag
    setIsSpinning(false);
    angularVelocityRef.current = 0;

    const angle = Math.atan2(coords.y, coords.x);
    isDraggingRef.current = true;
    lastAngleRef.current = angle;
    lastTimeRef.current = performance.now();
    velocityTrackerRef.current = [];
  };

  const moveDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingRef.current) return;

    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    const currentAngle = Math.atan2(coords.y, coords.x);
    let delta = currentAngle - lastAngleRef.current;

    // Handle wrap-around
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;

    // Update rotation
    rotationRef.current += delta;

    // Track velocity
    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 0) {
      const velocity = delta / dt; // Radians per millisecond
      velocityTrackerRef.current.push(velocity);
      if (velocityTrackerRef.current.length > 5) {
        velocityTrackerRef.current.shift();
      }
    }

    // Tick sound on drag
    const itemsCount = participants.length > 0 ? participants.length : 1;
    const segmentAngle = (2 * Math.PI) / itemsCount;
    const currentProgress = rotationRef.current / segmentAngle;
    
    if (Math.floor(currentProgress) !== Math.floor(lastTickAngleRef.current)) {
      playTickSound(0.8);
      lastTickAngleRef.current = currentProgress;
      setPointerFlick(true);
      setTimeout(() => setPointerFlick(false), 50);
    }

    drawWheel();

    lastAngleRef.current = currentAngle;
    lastTimeRef.current = now;
  };

  const endDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Calculate average velocity from the last few drag frame movements
    const track = velocityTrackerRef.current;
    if (track.length > 0) {
      const avgVelocityMs = track.reduce((a, b) => a + b, 0) / track.length;
      const avgVelocityFrame = avgVelocityMs * 16.66;
      
      // Filter out micro-drags
      if (Math.abs(avgVelocityFrame) > 0.005) {
        let speedBoost = Math.min(Math.max(avgVelocityFrame * 1.5, -0.95), 0.95);
        let finalRotationOffset = speedBoost * 0.991 / (1 - 0.991);
        
        // Enforce 1 full turn (2 * Math.PI) minimum to land on a selection
        const minRotation = 2 * Math.PI;
        if (Math.abs(finalRotationOffset) < minRotation) {
          const direction = finalRotationOffset >= 0 ? 1 : -1;
          finalRotationOffset = direction * minRotation;
          speedBoost = (finalRotationOffset * (1 - 0.991)) / 0.991;
        }

        if (isMultiplayer && onTriggerRemoteSpin) {
          const targetStopAngle = (rotationRef.current + finalRotationOffset) % (2 * Math.PI);
          let targetAngle = (1.5 * Math.PI - targetStopAngle) % (2 * Math.PI);
          if (targetAngle < 0) targetAngle += 2 * Math.PI;
          const sectorAngle = (2 * Math.PI) / participants.length;
          const winnerIndex = Math.floor(targetAngle / sectorAngle) % participants.length;

          onTriggerRemoteSpin(Math.abs(speedBoost), winnerIndex);
        } else {
          angularVelocityRef.current = speedBoost;
          setIsSpinning(true);
        }
        return;
      }
    }

    // Snapped drag without speed release -> no winner drawn, just snap back
    drawWheel();
  };

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* Settings / Controls bar */}
      <div className="flex justify-between items-center w-full px-4 max-w-[350px]">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Sorteo: {drawName}
        </span>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2 rounded-full bg-white/40 dark:bg-black/30 border border-white/20 hover:bg-white/60 transition-colors"
        >
          {soundEnabled ? (
            <Volume2 size={16} className="text-blue-500" />
          ) : (
            <VolumeX size={16} className="text-slate-400" />
          )}
        </button>
      </div>

      {/* Canvas container with pointer indicator */}
      <div className="relative flex items-center justify-center p-4 w-full max-w-[350px] mx-auto">
        {/* CSS 3D Glassliquid container border shadow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-white/40 dark:from-white/5 dark:to-white/10 border border-white/30 dark:border-white/10 shadow-[inset_0_4px_16px_rgba(255,255,255,0.4),0_24px_48px_-12px_rgba(0,0,0,0.15)] pointer-events-none" />
        
        {/* Sleek fixed arrow pointing down from the top */}
        <div 
          className="absolute z-30" 
          style={{
            top: '8px',
            left: '50%',
            transform: pointerFlick ? 'translateX(-50%) rotate(-18deg)' : 'translateX(-50%) rotate(0deg)',
            transformOrigin: '50% 0%',
            transition: pointerFlick ? 'none' : 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            filter: 'drop-shadow(0 6px 12px rgba(255, 59, 48, 0.5))',
            pointerEvents: 'none'
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21L3 9H9V3H15V9H21L12 21Z" fill="url(#pointer-gradient)" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="pointer-gradient" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ff453a" />
                <stop offset="1" stopColor="#ff2d55" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <canvas
          ref={canvasRef}
          width={350}
          height={350}
          className="relative z-10 transition-transform cursor-grab active:cursor-grabbing"
          style={{
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none',
          }}
          onMouseDown={startDrag}
          onMouseMove={moveDrag}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={startDrag}
          onTouchMove={moveDrag}
          onTouchEnd={endDrag}
        />

        {/* Floating Center Spin Button */}
        <button
          disabled={isSpinning || participants.length === 0}
          onClick={handleSpinStart}
          className={`absolute z-20 w-16 h-16 rounded-full ios-clickable flex items-center justify-center font-bold text-xs shadow-xl transition-all duration-300 border border-white/40 ${
            isSpinning || participants.length === 0
              ? 'bg-slate-300/80 text-slate-500 cursor-not-allowed'
              : 'bg-white/90 text-blue-600 dark:bg-black/80 dark:text-blue-400 hover:scale-105 active:scale-95'
          }`}
        >
          {isSpinning ? (
            <RefreshCw className="animate-spin" size={24} />
          ) : (
            'GIRAR'
          )}
        </button>
      </div>

      {/* Winner Display Panel */}
      {winner && (
        <div className="glass-panel w-full max-w-[350px] p-5 text-center flex flex-col gap-2 border-white/50 bg-white/70 dark:bg-black/50 fade-in shadow-2xl relative overflow-hidden">
          {/* Subtle liquid glow in background */}
          <div className="absolute -top-10 -left-10 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="absolute -bottom-10 -right-10 w-24 h-24 rounded-full bg-purple-500/20 blur-2xl" />
          
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 dark:text-blue-400">
            ¡Tenemos un Ganador!
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            {winner.name}
          </h2>
          <div className="mx-auto mt-1 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium border border-blue-500/20">
            Rol: {winner.role}
          </div>
        </div>
      )}
    </div>
  );
};
