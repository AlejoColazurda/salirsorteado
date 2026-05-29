import React, { useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';

const AVATARS = ['😀', '🦊', '🦁', '🐸', '🐼', '🦄', '🐨', '👻', '🤖', '👑', '🍕', '🎉'];

interface CreateRoomCardProps {
  isConfigured: boolean;
  myName: string;
  setMyName: (name: string) => void;
  myAvatar: string;
  setMyAvatar: (avatar: string) => void;
  onCreateRoom: () => void;
  onGoToSettings: () => void;
}

export const CreateRoomCard: React.FC<CreateRoomCardProps> = ({
  isConfigured,
  myName,
  setMyName,
  myAvatar,
  setMyAvatar,
  onCreateRoom,
  onGoToSettings,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Collapsed call-to-action
  if (!expanded) {
    return (
      <div className="glass-panel p-5 bg-white/50 dark:bg-black/30 border-white/30 flex flex-col gap-3 fade-in shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-extrabold text-slate-800 dark:text-white">Jugar con amigos</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Creá una sala y compartí el link. Tus amigos giran la ruleta en vivo desde sus celulares.
            </span>
          </div>
        </div>
        <button onClick={() => setExpanded(true)} className="ios-button-primary ios-clickable w-full py-3">
          <Users size={16} />
          <span>Crear sala</span>
        </button>
      </div>
    );
  }

  const canCreate = !!myName.trim() && isConfigured;

  return (
    <div className="glass-panel p-5 bg-white/60 dark:bg-black/40 border-white/40 flex flex-col gap-4 fade-in shadow-2xl">
      <div className="text-left">
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Crear tu sala</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Elegí tu nombre y avatar. Vas a ser el administrador: controlás quién puede girar la ruleta.
        </p>
      </div>

      {!isConfigured && (
        <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left">
          <span className="text-xs font-bold text-amber-600 flex items-center gap-1.5">
            <AlertTriangle size={14} /> Falta conectar la base de datos
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            El multijugador necesita Supabase para sincronizar en tiempo real.
          </span>
          <button onClick={onGoToSettings} className="ios-button-secondary ios-clickable py-2 text-xs mt-1">
            Ir a Ajustes para conectar
          </button>
        </div>
      )}

      <div className="ios-input-group">
        <input
          type="text"
          placeholder="Tu nombre..."
          value={myName}
          onChange={(e) => setMyName(e.target.value)}
          className="ios-input font-bold"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase text-left">Elegí tu avatar</span>
        <div className="flex flex-wrap gap-2 justify-center">
          {AVATARS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setMyAvatar(emoji)}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${
                myAvatar === emoji
                  ? 'bg-blue-500/20 border-blue-500 shadow-sm'
                  : 'bg-white/40 border-white/10 dark:bg-black/20'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setExpanded(false)}
          className="ios-button-secondary ios-clickable py-3 flex-1"
        >
          Cancelar
        </button>
        <button
          onClick={onCreateRoom}
          disabled={!canCreate}
          className="ios-button-primary ios-clickable py-3 flex-1"
          style={{ opacity: canCreate ? 1 : 0.5, cursor: canCreate ? 'pointer' : 'not-allowed' }}
        >
          Crear sala
        </button>
      </div>
    </div>
  );
};
