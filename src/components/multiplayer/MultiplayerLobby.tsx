import React from 'react';
import { Users, LogOut, Link2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  avatar: string;
  isSpinner: boolean;
  isAdmin: boolean;
}

const AVATARS = ['😀', '🦊', '🦁', '🐸', '🐼', '🦄', '🐨', '👻', '🤖', '👑', '🍕', '🎉'];

interface MultiplayerLobbyProps {
  roomCode: string | null;
  hasJoinedLobby: boolean;
  myName: string;
  setMyName: (name: string) => void;
  myAvatar: string;
  setMyAvatar: (avatar: string) => void;
  onJoinLobby: () => void;
  roomMembers: Member[];
  roomAdminId: string | null;
  myMemberId: string;
  onLeaveRoom: () => void;
  onToggleSpinPermission: (memberId: string) => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  roomCode,
  hasJoinedLobby,
  myName,
  setMyName,
  myAvatar,
  setMyAvatar,
  onJoinLobby,
  roomMembers,
  roomAdminId,
  myMemberId,
  onLeaveRoom,
  onToggleSpinPermission,
}) => {
  const isLobbyAdmin = roomAdminId === myMemberId;

  // View 1: Splash screen to enter name
  if (!hasJoinedLobby) {
    return (
      <div className="glass-panel p-6 bg-white/60 dark:bg-black/40 border-white/40 text-center flex flex-col gap-6 fade-in shadow-2xl">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center animate-bounce">
            <Users size={32} />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
            ¡Te invitaron a una Sala!
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ingresa tu nombre para unirte a la sala de sorteo {roomCode}.
          </p>
        </div>
        <div className="ios-input-group">
          <input
            type="text"
            placeholder="Tu nombre..."
            value={myName}
            onChange={(e) => {
              setMyName(e.target.value);
              localStorage.setItem('multiplayer_name', e.target.value);
            }}
            className="ios-input font-bold"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase text-left">Elige tu Avatar</span>
          <div className="flex flex-wrap gap-2 justify-center">
            {AVATARS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setMyAvatar(emoji);
                  localStorage.setItem('multiplayer_avatar', emoji);
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border transition-all ${
                  myAvatar === emoji
                    ? 'bg-blue-500/20 border-blue-500 scale-110 shadow-sm'
                    : 'bg-white/40 border-white/10 dark:bg-black/20 hover:scale-105'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onJoinLobby}
          disabled={!myName.trim()}
          className="ios-button-primary ios-clickable w-full py-3"
        >
          Unirse al Lobby
        </button>
      </div>
    );
  }

  // View 2: Active Room Status Dashboard
  const handleCopyLink = () => {
    const localUrl = localStorage.getItem('supabase_url') || '';
    const localKey = localStorage.getItem('supabase_anon_key') || '';
    let link = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    if (localUrl && localKey) {
      link += `&url=${encodeURIComponent(localUrl)}&key=${encodeURIComponent(localKey)}`;
    } else {
      const params = new URLSearchParams(window.location.search);
      const urlParam = params.get('url');
      const keyParam = params.get('key');
      if (urlParam && keyParam) {
        link += `&url=${encodeURIComponent(urlParam)}&key=${encodeURIComponent(keyParam)}`;
      }
    }
    navigator.clipboard.writeText(link);
    alert('¡Enlace de invitación copiado al portapapeles!');
  };

  return (
    <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20 text-left flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Sala Activa</span>
          <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            Código: {roomCode}
          </span>
        </div>
        <button
          onClick={onLeaveRoom}
          className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
        >
          <LogOut size={16} /> Salir
        </button>
      </div>

      {isLobbyAdmin && (
        <button
          onClick={handleCopyLink}
          className="ios-button-secondary ios-clickable w-full py-2.5 text-xs flex gap-2"
        >
          <Link2 size={16} /> Copiar Enlace de Invitación
        </button>
      )}

      <div className="flex flex-col gap-2 mt-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase">
          Participantes en Sala ({roomMembers.length})
        </span>
        <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
          {roomMembers.map((m) => (
            <div
              key={m.id}
              className="flex justify-between items-center p-2 rounded-xl bg-white/50 dark:bg-black/30 border border-white/5 text-xs"
            >
              <span className="font-bold flex items-center gap-1.5">
                <span className="text-base">{m.avatar || '😀'}</span>
                {m.name}
                {m.id === roomAdminId && (
                  <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                    Admin
                  </span>
                )}
                {m.isSpinner && m.id !== roomAdminId && (
                  <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                    Control
                  </span>
                )}
              </span>

              {isLobbyAdmin && m.id !== myMemberId && (
                <button
                  onClick={() => onToggleSpinPermission(m.id)}
                  className={`px-2.5 py-1 rounded-full font-bold text-[9px] ios-clickable ${
                    m.isSpinner
                      ? 'bg-purple-500/20 text-purple-600'
                      : 'bg-slate-300 text-slate-500'
                  }`}
                >
                  {m.isSpinner ? 'Quitar control' : 'Permitir girar'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
