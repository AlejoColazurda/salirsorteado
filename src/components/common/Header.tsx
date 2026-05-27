import React from 'react';
import { Sparkles } from 'lucide-react';

interface HeaderProps {
  isMultiplayer: boolean;
  roomCode: string | null;
}

export const Header: React.FC<HeaderProps> = ({ isMultiplayer, roomCode }) => {
  return (
    <header className="ios-nav-bar glass-panel rounded-none border-t-0 border-x-0 border-b bg-white/70 dark:bg-black/70 px-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-blue-500 animate-pulse" size={24} />
        <h1 className="text-xl font-extrabold tracking-tight siri-glow-text">
          Salir Sorteado
        </h1>
      </div>
      <div className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 py-1 px-3 rounded-full border border-blue-500/20">
        {isMultiplayer ? `Sala: ${roomCode}` : 'Local'}
      </div>
    </header>
  );
};
