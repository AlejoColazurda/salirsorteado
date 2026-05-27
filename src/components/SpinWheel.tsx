import React, { useRef, useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Volume2, VolumeX, RefreshCw } from 'lucide-react';

interface SpinWheelProps {
  participants: string[];
  roles: string[];
  drawName: string;
  onSpinEnd: (results: { participantName: string; role: string }[]) => void;
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  participants,
  roles,
  drawName,
  onSpinEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<{ name: string; role: string } | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Audio Context for synthetic haptic tick sounds
  const audioContextRef = useRef<AudioContext | null>(null);

  // Rotation states
  const rotationRef = useRef(0);
  const angularVelocityRef = useRef(0);
  const lastTickAngleRef = useRef(0);

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

      // Cute wooden-like pointer clicking sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600 * frequencyMultiplier, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100 * frequencyMultiplier, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {
      console.error(e);
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
      console.error(e);
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

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 16;

    ctx.clearRect(0, 0, size, size);

    const items = participants.length > 0 ? participants : ['Ingresa nombres'];
    const sliceAngle = (2 * Math.PI) / items.length;

    // Draw background outer ring
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(center, center, radius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    items.forEach((item, i) => {
      const angle = rotationRef.current + i * sliceAngle;

      // Draw segment path
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, angle, angle + sliceAngle);
      ctx.closePath();

      // Glassy colorful gradient fill
      const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
      const baseColor = segmentColors[i % segmentColors.length];
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      grad.addColorStop(1, baseColor);

      ctx.fillStyle = grad;
      ctx.fill();

      // Border lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw names text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // Drop shadow for text readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Outfit", sans-serif';
      
      const truncatedText = item.length > 14 ? item.substring(0, 12) + '..' : item;
      ctx.fillText(truncatedText, radius - 20, 0);
      ctx.restore();
    });

    // Draw central glossy pin hub
    ctx.beginPath();
    ctx.arc(center, center, 32, 0, 2 * Math.PI);
    const centerGrad = ctx.createRadialGradient(center, center, 0, center, center, 32);
    centerGrad.addColorStop(0, '#ffffff');
    centerGrad.addColorStop(1, '#e5e5ea');
    ctx.fillStyle = centerGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw inner logo circle (glass)
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0, 122, 255, 0.1)';
    ctx.strokeStyle = 'rgba(0, 122, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Center icon/decoration (inner dot)
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#007aff';
    ctx.fill();
  };

  // Spin animation loop
  useEffect(() => {
    let animId: number;

    const animate = () => {
      if (angularVelocityRef.current > 0.002) {
        rotationRef.current += angularVelocityRef.current;
        // Suspense physics curve
        if (angularVelocityRef.current > 0.05) {
          angularVelocityRef.current *= 0.988; // Slow down gradually (build suspense)
        } else {
          angularVelocityRef.current *= 0.975; // Stop quicker once it gets very slow
        }

        // Tick sound when pointer crosses segments
        const itemsCount = participants.length > 0 ? participants.length : 1;
        const segmentAngle = (2 * Math.PI) / itemsCount;
        const currentProgress = rotationRef.current / segmentAngle;
        
        if (Math.floor(currentProgress) !== Math.floor(lastTickAngleRef.current)) {
          // Pitch changes slightly depending on speed
          playTickSound(Math.min(1.5, 0.6 + angularVelocityRef.current * 3));
          lastTickAngleRef.current = currentProgress;
        }

        drawWheel();
        animId = requestAnimationFrame(animate);
      } else if (isSpinning) {
        setIsSpinning(false);
        angularVelocityRef.current = 0;
        determineWinner();
      }
    };

    if (isSpinning) {
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

    // Normalise angle to [0, 2*PI]
    const normalizedAngle = (rotationRef.current % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    
    // The selector is at the 3 o'clock position (0 radians on canvas)
    // To make it point from the top (12 o'clock, which is -Math.PI/2), we calculate:
    const targetAngle = (2 * Math.PI - normalizedAngle - Math.PI / 2) % (2 * Math.PI);
    const sectorAngle = (2 * Math.PI) / participants.length;
    let index = Math.floor(targetAngle / sectorAngle);
    if (index < 0) index += participants.length;
    index = index % participants.length;

    const winnerName = participants[index];

    // Assign roles. For multiple roles or a single person:
    // If we have multiple roles, we can assign the selected participant to the first role,
    // or if we have one main role, assign that.
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
    if (isSpinning || participants.length === 0) return;
    
    // Trigger audio initialization
    getAudioContext();

    setWinner(null);
    setIsSpinning(true);
    
    // Set a high initial angular velocity
    angularVelocityRef.current = 0.35 + Math.random() * 0.25;
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
      <div className="relative flex items-center justify-center p-4">
        {/* CSS 3D Glassliquid container border shadow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-white/40 dark:from-white/5 dark:to-white/10 border border-white/30 dark:border-white/10 shadow-[inset_0_4px_16px_rgba(255,255,255,0.4),0_24px_48px_-12px_rgba(0,0,0,0.15)] pointer-events-none" />
        
        {/* iOS style Top Indicator Triangle */}
        <div className="absolute -top-1 z-30 drop-shadow-md">
          <div className="w-6 h-6 bg-gradient-to-b from-red-500 to-red-600 rounded-b-md shadow-lg" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
        </div>

        <canvas
          ref={canvasRef}
          width={350}
          height={350}
          className="relative z-10 transition-transform"
          style={{
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none',
          }}
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
