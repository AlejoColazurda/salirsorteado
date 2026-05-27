import { useState, useEffect, useRef } from 'react';
import { Sparkles, History, Settings, RotateCcw, Users, Link2, LogOut } from 'lucide-react';
import { SpinWheel } from './components/SpinWheel';
import { SetupWizard } from './components/SetupWizard';
import { DrawConfigManager } from './components/DrawConfigManager';
import type { DrawConfig } from './components/DrawConfigManager';
import { HistoryManager } from './components/HistoryManager';
import type { HistoryEntry } from './components/HistoryManager';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

interface Participant {
  id: string;
  name: string;
  active: boolean;
}

interface Member {
  id: string;
  name: string;
  isSpinner: boolean;
  isAdmin: boolean;
}

const defaultConfigs: DrawConfig[] = [
  {
    id: 'mate',
    name: 'Preparar y Cebar Mates',
    description: 'Sorteo doble: un participante prepara el mate y otro lo ceba.',
    roles: ['Preparar el mate (calentar agua y cambiar yerba)', 'Cebar los mates'],
  },
  {
    id: 'simple',
    name: 'Sorteo Simple',
    description: 'Un ganador único al azar.',
    roles: ['Ganador/a'],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'draw' | 'configs' | 'history'>('draw');

  // Local storage credentials
  const [dbUrl, setDbUrl] = useState(() => localStorage.getItem('supabase_url') || '');
  const [dbKey, setDbKey] = useState(() => localStorage.getItem('supabase_anon_key') || '');
  const [dbConnected, setDbConnected] = useState(() => isSupabaseConfigured());

  // Offline Core States
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const saved = localStorage.getItem('sorteado_participants');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Alejo', active: true },
      { id: '2', name: 'Facundo', active: true },
      { id: '3', name: 'Micaela', active: true },
      { id: '4', name: 'Santiago', active: true },
      { id: '5', name: 'Carolina', active: true },
    ];
  });

  const [configs, setConfigs] = useState<DrawConfig[]>(() => {
    const saved = localStorage.getItem('sorteado_configs');
    return saved ? JSON.parse(saved) : defaultConfigs;
  });

  const [selectedConfigId, setSelectedConfigId] = useState<string>(() => {
    return localStorage.getItem('sorteado_selected_config') || 'mate';
  });

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const saved = localStorage.getItem('sorteado_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [allowRepeat, setAllowRepeat] = useState<boolean>(() => {
    const saved = localStorage.getItem('sorteado_allow_repeat');
    return saved ? JSON.parse(saved) === 'true' : false;
  });

  // Game Session States
  const [sessionActive, setSessionActive] = useState(false);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ participantName: string; role: string }[]>([]);
  const [sessionWinners, setSessionWinners] = useState<string[]>([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // ==========================================
  // MULTIPLAYER REALTIME SYNC (SUPABASE)
  // ==========================================
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [myMemberId] = useState(() => `user-${Math.random().toString(36).substring(2, 9)}`);
  const [myName, setMyName] = useState(() => localStorage.getItem('multiplayer_name') || '');
  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [roomMembers, setRoomMembers] = useState<Member[]>([]);
  const [roomAdminId, setRoomAdminId] = useState<string | null>(null);
  const [canISpin, setCanISpin] = useState(false);

  const supabaseChannelRef = useRef<any>(null);

  // Read URL query parameter for room code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      setIsMultiplayer(true);
      setActiveTab('draw');
    }
  }, []);

  // Save Supabase Dynamic Config
  const handleSaveDbSettings = () => {
    localStorage.setItem('supabase_url', dbUrl.trim());
    localStorage.setItem('supabase_anon_key', dbKey.trim());
    setDbConnected(isSupabaseConfigured());
  };

  const handleClearDbSettings = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    setDbUrl('');
    setDbKey('');
    setDbConnected(false);
  };

  // Local state persistence
  useEffect(() => {
    localStorage.setItem('sorteado_participants', JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem('sorteado_configs', JSON.stringify(configs));
  }, [configs]);

  useEffect(() => {
    localStorage.setItem('sorteado_selected_config', selectedConfigId);
  }, [selectedConfigId]);

  useEffect(() => {
    localStorage.setItem('sorteado_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('sorteado_allow_repeat', String(allowRepeat));
  }, [allowRepeat]);

  // Selected config helper
  const activeConfig = configs.find((c) => c.id === selectedConfigId) || configs[0];

  // Active names present
  const activeParticipantNames = isMultiplayer
    ? roomMembers.map((m) => m.name)
    : participants.filter((p) => p.active).map((p) => p.name);

  // Eligible participants for current spin
  const eligibleParticipants = activeParticipantNames.filter(
    (name) => allowRepeat || !sessionWinners.includes(name)
  );

  // Realtime Broadcast Channel Listener/Sync
  useEffect(() => {
    if (!isMultiplayer || !roomCode || !hasJoinedLobby) return;

    const client = getSupabaseClient();
    if (!client) return;

    // Create unique room channel
    const channelName = `room-${roomCode}`;
    const channel = client.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    }) as any;

    supabaseChannelRef.current = channel;

    // Subscribe to broadcast events
    channel
      .on('broadcast', { event: 'join_request' }, ({ payload }: any) => {
        // Only Admin processes join requests and maintains the master members list
        if (roomAdminId === myMemberId) {
          setRoomMembers((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            const updated = [...prev, { id: payload.id, name: payload.name, isSpinner: false, isAdmin: false }];
            
            // Broadcast lobby state update to everyone
            channel.send({
              type: 'broadcast',
              event: 'lobby_update',
              payload: {
                members: updated,
                adminId: myMemberId,
                config: activeConfig,
                allowRepeat,
                currentRoundIndex,
                sessionWinners,
                sessionResults,
                sessionActive,
                sessionCompleted,
              },
            });
            return updated;
          });
        }
      })
      .on('broadcast', { event: 'lobby_update' }, ({ payload }: any) => {
        setRoomMembers(payload.members);
        setRoomAdminId(payload.adminId);
        setAllowRepeat(payload.allowRepeat);
        setCurrentRoundIndex(payload.currentRoundIndex);
        setSessionWinners(payload.sessionWinners);
        setSessionResults(payload.sessionResults);
        setSessionActive(payload.sessionActive);
        setSessionCompleted(payload.sessionCompleted);

        // Find my spin permission
        const me = payload.members.find((m: Member) => m.id === myMemberId);
        setCanISpin(me ? me.isSpinner || payload.adminId === myMemberId : payload.adminId === myMemberId);
      })
      .on('broadcast', { event: 'spin_wheel' }, ({ payload }: any) => {
        // This triggers spin on everyone's screens with the same speed / seed
        const spinEvent = new CustomEvent('remote-spin', {
          detail: { speed: payload.speed, winnerIndex: payload.winnerIndex },
        });
        window.dispatchEvent(spinEvent);
      })
      .on('broadcast', { event: 'reset_game' }, () => {
        setSessionResults([]);
        setSessionWinners([]);
        setCurrentRoundIndex(0);
        setSessionCompleted(false);
      });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        // Send join request
        channel.send({
          type: 'broadcast',
          event: 'join_request',
          payload: { id: myMemberId, name: myName },
        });
      }
    });

    return () => {
      channel.unsubscribe();
      supabaseChannelRef.current = null;
    };
  }, [isMultiplayer, roomCode, hasJoinedLobby, myName]);

  // Local/Admin Spin trigger
  const handleSpinEnd = (results: { participantName: string; role: string }[]) => {
    if (isMultiplayer && roomAdminId !== myMemberId) return; // Only admin commits results

    const winnerName = results[0].participantName;
    const currentRole = activeConfig.roles[currentRoundIndex];

    const updatedResults = [
      ...sessionResults,
      { participantName: winnerName, role: currentRole },
    ];
    const updatedWinners = [...sessionWinners, winnerName];

    setSessionResults(updatedResults);
    setSessionWinners(updatedWinners);

    const nextRound = currentRoundIndex + 1;
    const nextEligibleCount = activeParticipantNames.filter(
      (name) => allowRepeat || !updatedWinners.includes(name)
    ).length;

    const completed = !(nextRound < activeConfig.roles.length && nextEligibleCount > 0);

    if (!completed) {
      setTimeout(() => {
        setCurrentRoundIndex(nextRound);
        // Sync new round to lobby
        syncLobbyState({
          currentRoundIndex: nextRound,
          sessionWinners: updatedWinners,
          sessionResults: updatedResults,
        });
      }, 3500);
    } else {
      setTimeout(() => {
        setSessionCompleted(true);
        
        // Log to history
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          drawConfigId: activeConfig.id,
          drawConfigName: activeConfig.name,
          participants: activeParticipantNames,
          results: updatedResults,
        };
        setHistory([entry, ...history]);

        syncLobbyState({
          sessionCompleted: true,
          sessionWinners: updatedWinners,
          sessionResults: updatedResults,
        });
      }, 3500);
    }
  };

  // Helper to broadcast lobby status (Admin only)
  const syncLobbyState = (overrides: any = {}) => {
    if (!supabaseChannelRef.current || roomAdminId !== myMemberId) return;

    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'lobby_update',
      payload: {
        members: roomMembers,
        adminId: myMemberId,
        config: activeConfig,
        allowRepeat,
        currentRoundIndex,
        sessionWinners,
        sessionResults,
        sessionActive,
        sessionCompleted,
        ...overrides,
      },
    });
  };

  // Trigger spin over network
  const handleTriggerRemoteSpin = (speed: number, winnerIndex: number) => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'spin_wheel',
        payload: { speed, winnerIndex },
      });
    }
  };

  // Create multiplayer room (Admin)
  const handleCreateRoom = () => {
    if (!myName.trim()) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setIsMultiplayer(true);
    setRoomAdminId(myMemberId);
    setRoomMembers([{ id: myMemberId, name: myName.trim(), isSpinner: true, isAdmin: true }]);
    setHasJoinedLobby(true);
  };

  // Toggle user spin permission (Admin)
  const handleToggleSpinPermission = (memberId: string) => {
    const updated = roomMembers.map((m) =>
      m.id === memberId ? { ...m, isSpinner: !m.isSpinner } : m
    );
    setRoomMembers(updated);
    
    // Broadcast permission change
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'lobby_update',
        payload: {
          members: updated,
          adminId: myMemberId,
          config: activeConfig,
          allowRepeat,
          currentRoundIndex,
          sessionWinners,
          sessionResults,
          sessionActive,
          sessionCompleted,
        },
      });
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    setIsMultiplayer(false);
    setRoomCode(null);
    setRoomMembers([]);
    setRoomAdminId(null);
    setHasJoinedLobby(false);
    window.history.pushState({}, document.title, window.location.pathname);
  };

  const handleStartGame = (finalConfig: DrawConfig) => {
    setSelectedConfigId(finalConfig.id);
    setSessionActive(true);
    setCurrentRoundIndex(0);
    setSessionResults([]);
    setSessionWinners([]);
    setSessionCompleted(false);
  };

  const handleReplayDraw = (entry: HistoryEntry) => {
    setSelectedConfigId(entry.drawConfigId);
    
    const updatedParticipants = participants.map((p) => ({
      ...p,
      active: entry.participants.includes(p.name),
    }));
    setParticipants(updatedParticipants);

    setSessionActive(true);
    setCurrentRoundIndex(0);
    setSessionResults([]);
    setSessionWinners([]);
    setSessionCompleted(false);
    setActiveTab('draw');
  };

  // Modifiers
  const handleAddParticipant = (name: string) => {
    setParticipants([...participants, { id: Date.now().toString(), name, active: true }]);
  };

  const handleToggleParticipant = (id: string) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  // Preset modifiers
  const handleCreateConfig = (newConfig: DrawConfig) => {
    setConfigs([...configs, newConfig]);
    setSelectedConfigId(newConfig.id);
  };

  const handleDeleteConfig = (id: string) => {
    const updated = configs.filter((c) => c.id !== id);
    setConfigs(updated);
    if (selectedConfigId === id) {
      setSelectedConfigId(updated[0]?.id || 'simple');
    }
  };

  return (
    <div className="min-h-screen relative pb-28">
      {/* Background circles */}
      <div className="liquid-bg-container">
        <div className="liquid-circle circle-1"></div>
        <div className="liquid-circle circle-2"></div>
        <div className="liquid-circle circle-3"></div>
      </div>

      {/* Header */}
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

      {/* Main content */}
      <main className="ios-main-content">
        {isMultiplayer && !hasJoinedLobby ? (
          // Multiplayer Enter Name Splash screen
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
            <button
              onClick={() => {
                if (myName.trim()) setHasJoinedLobby(true);
              }}
              disabled={!myName.trim()}
              className="ios-button-primary ios-clickable w-full py-3"
            >
              Unirse al Lobby
            </button>
          </div>
        ) : activeTab === 'draw' ? (
          <div className="flex flex-col gap-6">
            {isMultiplayer && (
              // Multiplayer Lobby Info Panel
              <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20 text-left flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Sala Activa</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      Código: {roomCode}
                    </span>
                  </div>
                  <button
                    onClick={handleLeaveRoom}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors flex items-center gap-1 text-xs font-bold"
                  >
                    <LogOut size={16} /> Salir
                  </button>
                </div>

                {/* Invite Link copier (Admin only) */}
                {roomAdminId === myMemberId && (
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
                      navigator.clipboard.writeText(link);
                      alert('¡Enlace de invitación copiado al portapapeles!');
                    }}
                    className="ios-button-secondary ios-clickable w-full py-2.5 text-xs flex gap-2"
                  >
                    <Link2 size={16} /> Copiar Enlace de Invitación
                  </button>
                )}

                {/* Connected members grid with Admin control options */}
                <div className="flex flex-col gap-2 mt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Participantes en Sala ({roomMembers.length})</span>
                  <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                    {roomMembers.map((m) => (
                      <div key={m.id} className="flex justify-between items-center p-2 rounded-xl bg-white/50 dark:bg-black/30 border border-white/5 text-xs">
                        <span className="font-bold flex items-center gap-1">
                          {m.name}
                          {m.id === roomAdminId && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.2 rounded-full font-bold">Admin</span>}
                          {m.isSpinner && m.id !== roomAdminId && <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.2 rounded-full font-bold">Control</span>}
                        </span>

                        {/* Admin toggles spin permission */}
                        {roomAdminId === myMemberId && m.id !== myMemberId && (
                          <button
                            onClick={() => handleToggleSpinPermission(m.id)}
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
            )}

            {!sessionActive ? (
              <SetupWizard
                participants={participants}
                onAddParticipant={handleAddParticipant}
                onToggleParticipant={handleToggleParticipant}
                onRemoveParticipant={handleRemoveParticipant}
                configs={configs}
                selectedConfigId={selectedConfigId}
                onSelectConfig={(id) => {
                  setSelectedConfigId(id);
                  if (isMultiplayer && roomAdminId === myMemberId) {
                    setTimeout(() => syncLobbyState({ selectedConfigId: id }), 100);
                  }
                }}
                onCreateConfig={handleCreateConfig}
                allowRepeat={allowRepeat}
                onSetAllowRepeat={(val) => {
                  setAllowRepeat(val);
                  if (isMultiplayer && roomAdminId === myMemberId) {
                    setTimeout(() => syncLobbyState({ allowRepeat: val }), 100);
                  }
                }}
                onStartGame={(finalConfig) => {
                  if (isMultiplayer && roomAdminId !== myMemberId) return; // Only Admin can start
                  handleStartGame(finalConfig);
                  if (isMultiplayer) {
                    setTimeout(() => syncLobbyState({ sessionActive: true, selectedConfigId: finalConfig.id }), 100);
                  }
                }}
              />
            ) : (
              <div className="flex flex-col gap-6 fade-in">
                {/* Active Round Info Header */}
                <div className="glass-panel p-5 bg-white/50 dark:bg-black/40 border-white/30 text-left flex flex-col gap-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 text-[10px] uppercase font-bold text-blue-500">
                    Sorteo en vivo
                  </div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    {activeConfig.name}
                  </h2>
                  
                  {!sessionCompleted ? (
                    <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                        Ronda {currentRoundIndex + 1} de {activeConfig.roles.length}
                      </span>
                      <span>Rol: {activeConfig.roles[currentRoundIndex]}</span>
                    </div>
                  ) : (
                    <div className="mt-2 text-xs font-bold text-emerald-500 flex items-center gap-1">
                      <span>✓ Sorteo Finalizado</span>
                    </div>
                  )}
                </div>

                {!sessionCompleted ? (
                  <div className="flex flex-col items-center">
                    <SpinWheel
                      key={`${selectedConfigId}-${currentRoundIndex}-${sessionWinners.length}`}
                      participants={eligibleParticipants}
                      roles={[activeConfig.roles[currentRoundIndex]]}
                      drawName={activeConfig.roles[currentRoundIndex]}
                      onSpinEnd={handleSpinEnd}
                      isMultiplayer={isMultiplayer}
                      canISpin={canISpin}
                      onTriggerRemoteSpin={handleTriggerRemoteSpin}
                    />

                    {/* Progress indicators */}
                    {sessionResults.length > 0 && (
                      <div className="glass-panel w-full max-w-[350px] p-4 bg-white/40 dark:bg-black/20 border-white/20 mt-6 text-left flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                          Rondas Anteriores
                        </span>
                        {sessionResults.map((res, i) => (
                          <div key={i} className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                            <span className="font-bold text-slate-700 dark:text-slate-300">{res.participantName}</span>
                            <span className="text-[10px] text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">{res.role}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="glass-panel p-6 bg-white/60 dark:bg-black/40 border-white/40 text-center flex flex-col gap-6 fade-in shadow-2xl">
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center animate-bounce">
                        <Sparkles size={32} />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                        ¡Sorteo Exitoso!
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Aquí están los resultados finales del sorteo.
                      </p>
                    </div>

                    {/* Table of Results */}
                    <div className="flex flex-col gap-2.5 my-2">
                      {sessionResults.map((res, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-3 rounded-xl bg-white/80 dark:bg-black/50 border border-white/20 shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                              {res.participantName}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-blue-500 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                            {res.role}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Admin action controls */}
                    {(!isMultiplayer || roomAdminId === myMemberId) && (
                      <div className="flex flex-col gap-3 mt-2">
                        <button
                          onClick={() => {
                            setCurrentRoundIndex(0);
                            setSessionResults([]);
                            setSessionWinners([]);
                            setSessionCompleted(false);
                            if (isMultiplayer) {
                              supabaseChannelRef.current?.send({ type: 'broadcast', event: 'reset_game' });
                              setTimeout(() => syncLobbyState({ sessionCompleted: false, sessionWinners: [], sessionResults: [] }), 100);
                            }
                          }}
                          className="ios-button-primary ios-clickable py-3 bg-gradient-to-r from-blue-500 to-indigo-600 font-bold"
                        >
                          <RotateCcw size={16} />
                          <span>Volver a Jugar Mismas Reglas</span>
                        </button>

                        <button
                          onClick={() => {
                            setSessionActive(false);
                            if (isMultiplayer) {
                              setTimeout(() => syncLobbyState({ sessionActive: false }), 100);
                            }
                          }}
                          className="ios-button-secondary ios-clickable py-3 text-slate-700 dark:text-slate-300 font-bold"
                        >
                          <span>Nuevo Sorteo (Asistente)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'configs' ? (
          <div className="flex flex-col gap-6">
            <DrawConfigManager
              configs={configs}
              selectedConfigId={selectedConfigId}
              onSelectConfig={(id) => {
                setSelectedConfigId(id);
                setSessionActive(false);
              }}
              onCreateConfig={handleCreateConfig}
              onDeleteConfig={handleDeleteConfig}
            />

            {/* Supabase dynamic config settings panel */}
            <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20 mt-2">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Settings size={18} className="text-blue-500" />
                Base de Datos (Multiplayer)
              </h3>
              
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Ingresa tus credenciales de Supabase para habilitar las salas de sorteo en tiempo real. 
                Los participantes se conectan con sus celulares y ven el giro en vivo.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">SUPABASE_URL</span>
                  <div className="ios-input-group">
                    <input
                      type="text"
                      placeholder="https://your-project.supabase.co"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      className="ios-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">SUPABASE_ANON_KEY</span>
                  <div className="ios-input-group">
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={dbKey}
                      onChange={(e) => setDbKey(e.target.value)}
                      className="ios-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  {dbConnected && (
                    <button
                      onClick={handleClearDbSettings}
                      className="ios-button-secondary py-2 px-4 text-xs font-semibold text-rose-500"
                    >
                      Desconectar
                    </button>
                  )}
                  <button
                    onClick={handleSaveDbSettings}
                    className="ios-button-primary py-2 px-4 text-xs font-semibold"
                  >
                    {dbConnected ? 'Conectado ✓' : 'Guardar y Conectar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <HistoryManager
            history={history}
            onReplayDraw={handleReplayDraw}
            onClearHistory={() => setHistory([])}
          />
        )}
      </main>

      {/* Tab Navigation (Disabled in Multiplayer Participant view unless they are joined and is draw tab) */}
      {(!isMultiplayer || hasJoinedLobby) && (
        <nav className="ios-tab-bar">
          <button
            onClick={() => setActiveTab('draw')}
            className={`ios-tab-item ${activeTab === 'draw' ? 'active' : ''}`}
          >
            <Sparkles className="ios-tab-icon" size={24} />
            <span>Sorteo</span>
          </button>
          
          {/* Lobby Admin can customize configurations */}
          {(!isMultiplayer || roomAdminId === myMemberId) && (
            <button
              onClick={() => setActiveTab('configs')}
              className={`ios-tab-item ${activeTab === 'configs' ? 'active' : ''}`}
            >
              <Settings className="ios-tab-icon" size={24} />
              <span>Ajustes</span>
            </button>
          )}

          {(!isMultiplayer || roomAdminId === myMemberId) && (
            <button
              onClick={() => setActiveTab('history')}
              className={`ios-tab-item ${activeTab === 'history' ? 'active' : ''}`}
            >
              <History className="ios-tab-icon" size={24} />
              <span>Historial</span>
            </button>
          )}

          {/* If configured and not inside room, show Create Room option */}
          {isSupabaseConfigured() && !isMultiplayer && (
            <button
              onClick={() => {
                setActiveTab('draw');
                const name = prompt('Ingresa tu nombre de Admin para la Sala:');
                if (name?.trim()) {
                  setMyName(name.trim());
                  localStorage.setItem('multiplayer_name', name.trim());
                  setTimeout(() => handleCreateRoom(), 100);
                }
              }}
              className="ios-tab-item"
            >
              <Users className="ios-tab-icon text-purple-500" size={24} />
              <span className="text-purple-400 font-bold">Crear Sala</span>
            </button>
          )}
        </nav>
      )}
    </div>
  );
}
