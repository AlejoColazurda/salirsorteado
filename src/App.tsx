import { useState, useEffect } from 'react';
import { Sparkles, Users, History, Settings } from 'lucide-react';
import { SpinWheel } from './components/SpinWheel';
import { ParticipantManager } from './components/ParticipantManager';
import { DrawConfigManager } from './components/DrawConfigManager';
import type { DrawConfig } from './components/DrawConfigManager';
import { HistoryManager } from './components/HistoryManager';
import type { HistoryEntry } from './components/HistoryManager';

interface Participant {
  id: string;
  name: string;
  active: boolean;
}

// Initial draw config presets
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
  const [activeTab, setActiveTab] = useState<'draw' | 'participants' | 'configs' | 'history'>('draw');

  // Core state loaded from LocalStorage
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

  // Settings
  const [allowRepeat, setAllowRepeat] = useState<boolean>(() => {
    const saved = localStorage.getItem('sorteado_allow_repeat');
    return saved ? JSON.parse(saved) === 'true' : false;
  });

  // Multi-round active draw session state
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<{ participantName: string; role: string }[]>([]);
  const [sessionWinners, setSessionWinners] = useState<string[]>([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Sync to LocalStorage
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

  // Filter participants active for draw
  const activeParticipantNames = participants
    .filter((p) => p.active)
    .map((p) => p.name);

  // Filter out winners of previous rounds in the same session if repeat is disabled
  const eligibleParticipants = activeParticipantNames.filter(
    (name) => allowRepeat || !sessionWinners.includes(name)
  );

  // Handlers for participants
  const handleAddParticipant = (name: string) => {
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name,
      active: true,
    };
    setParticipants([...participants, newParticipant]);
  };

  const handleToggleParticipant = (id: string) => {
    setParticipants(
      participants.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  // Handlers for config
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

  // Reset active draw session
  const startNewSession = () => {
    setCurrentRoundIndex(0);
    setSessionResults([]);
    setSessionWinners([]);
    setSessionCompleted(false);
  };

  // Handle a single round completion
  const handleSpinEnd = (results: { participantName: string; role: string }[]) => {
    const winnerName = results[0].participantName;
    const currentRole = activeConfig.roles[currentRoundIndex];

    const updatedResults = [
      ...sessionResults,
      { participantName: winnerName, role: currentRole },
    ];
    const updatedWinners = [...sessionWinners, winnerName];

    setSessionResults(updatedResults);
    setSessionWinners(updatedWinners);

    // If there are more rounds and we have enough participants for the next round
    const nextRound = currentRoundIndex + 1;
    const nextEligibleCount = activeParticipantNames.filter(
      (name) => allowRepeat || !updatedWinners.includes(name)
    ).length;

    if (nextRound < activeConfig.roles.length && nextEligibleCount > 0) {
      // Proceed to next round after a delay
      setTimeout(() => {
        setCurrentRoundIndex(nextRound);
      }, 3500);
    } else {
      // Draw completed
      setSessionCompleted(true);
      
      // Save entire session to history
      const historyEntry: HistoryEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        drawConfigId: activeConfig.id,
        drawConfigName: activeConfig.name,
        participants: activeParticipantNames,
        results: updatedResults,
      };

      setHistory([historyEntry, ...history]);
    }
  };

  // Replay a past draw by restoring its participants
  const handleReplayDraw = (entry: HistoryEntry) => {
    // Re-create the list of participants matching the logged names
    const newParticipants: Participant[] = entry.participants.map((name, index) => ({
      id: `restored-${index}-${Date.now()}`,
      name,
      active: true,
    }));
    
    setParticipants(newParticipants);
    setSelectedConfigId(entry.drawConfigId);
    startNewSession();
    setActiveTab('draw');
  };

  return (
    <div className="min-h-screen relative pb-28">
      {/* Premium liquid backdrop circles */}
      <div className="liquid-bg-container">
        <div className="liquid-circle circle-1"></div>
        <div className="liquid-circle circle-2"></div>
        <div className="liquid-circle circle-3"></div>
      </div>

      {/* Top Header Bar */}
      <header className="ios-nav-bar glass-panel rounded-none border-t-0 border-x-0 border-b bg-white/70 dark:bg-black/70 px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-500 animate-pulse" size={24} />
          <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Salir Sorteado
          </h1>
        </div>
        <div className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 py-1 px-3 rounded-full border border-blue-500/20">
          iOS Style
        </div>
      </header>

      {/* Main Content Area */}
      <main className="ios-main-content">
        {activeTab === 'draw' && (
          <div className="flex flex-col gap-6 fade-in">
            {/* Draw summary / status */}
            <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white mb-1">
                {activeConfig.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeConfig.description}
              </p>

              {activeConfig.roles.length > 1 && (
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-300/20 dark:border-slate-800 pt-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                      Ronda actual
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Ronda {currentRoundIndex + 1} de {activeConfig.roles.length}: {activeConfig.roles[currentRoundIndex]}
                    </span>
                  </div>
                  {sessionWinners.length > 0 && (
                    <button
                      onClick={startNewSession}
                      className="text-xs font-bold text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-all ios-clickable"
                    >
                      Reiniciar Sorteo
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Validation / Alert if not enough participants */}
            {eligibleParticipants.length === 0 ? (
              <div className="glass-panel p-8 text-center bg-amber-500/5 border-amber-500/30 text-amber-600 dark:text-amber-400 flex flex-col gap-4 items-center">
                <Users size={48} className="text-amber-500 opacity-80" />
                <div>
                  <h3 className="font-bold text-lg">No hay suficientes participantes</h3>
                  <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                    Necesitas al menos 1 participante activo que no haya ganado previamente en esta ronda.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (sessionCompleted || sessionWinners.length > 0) {
                      startNewSession();
                    } else {
                      setActiveTab('participants');
                    }
                  }}
                  className="ios-button-primary ios-clickable text-xs py-2 px-4"
                >
                  {sessionCompleted || sessionWinners.length > 0 ? 'Iniciar Nuevo Sorteo' : 'Administrar Participantes'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <SpinWheel
                  key={`${selectedConfigId}-${currentRoundIndex}-${sessionWinners.length}`}
                  participants={eligibleParticipants}
                  roles={[activeConfig.roles[currentRoundIndex]]}
                  drawName={`${activeConfig.name} - Ronda ${currentRoundIndex + 1}`}
                  onSpinEnd={handleSpinEnd}
                />
              </div>
            )}

            {/* Display progress of multiple rounds */}
            {sessionResults.length > 0 && (
              <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20 mt-4 flex flex-col gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Resultados del Sorteo en Curso
                </h3>
                <div className="flex flex-col gap-2">
                  {sessionResults.map((res, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-3 rounded-xl bg-white/50 dark:bg-black/30 border border-white/10"
                    >
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {res.participantName}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold">
                        {res.role}
                      </span>
                    </div>
                  ))}
                </div>

                {sessionCompleted && (
                  <button
                    onClick={startNewSession}
                    className="ios-button-primary ios-clickable w-full mt-2"
                  >
                    <span>Nuevo Sorteo</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'participants' && (
          <ParticipantManager
            participants={participants}
            onAddParticipant={handleAddParticipant}
            onToggleParticipant={handleToggleParticipant}
            onRemoveParticipant={handleRemoveParticipant}
          />
        )}

        {activeTab === 'configs' && (
          <div className="flex flex-col gap-6">
            <DrawConfigManager
              configs={configs}
              selectedConfigId={selectedConfigId}
              onSelectConfig={(id) => {
                setSelectedConfigId(id);
                startNewSession();
              }}
              onCreateConfig={handleCreateConfig}
              onDeleteConfig={handleDeleteConfig}
            />

            {/* Extra Settings Panel */}
            <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20 mt-2">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                <Settings size={18} className="text-blue-500" />
                Reglas del Sorteo
              </h3>
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col pr-4">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Permitir repetir ganadores
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Permite que un mismo participante pueda salir sorteado en más de un rol del mismo sorteo.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowRepeat}
                    onChange={(e) => setAllowRepeat(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <HistoryManager
            history={history}
            onReplayDraw={handleReplayDraw}
            onClearHistory={() => setHistory([])}
          />
        )}
      </main>

      {/* iOS Translucent Bottom Tab Bar */}
      <nav className="ios-tab-bar">
        <button
          onClick={() => setActiveTab('draw')}
          className={`ios-tab-item ${activeTab === 'draw' ? 'active' : ''}`}
        >
          <Sparkles className="ios-tab-icon" size={24} />
          <span>Sorteo</span>
        </button>
        <button
          onClick={() => setActiveTab('participants')}
          className={`ios-tab-item ${activeTab === 'participants' ? 'active' : ''}`}
        >
          <Users className="ios-tab-icon" size={24} />
          <span>Participantes</span>
        </button>
        <button
          onClick={() => setActiveTab('configs')}
          className={`ios-tab-item ${activeTab === 'configs' ? 'active' : ''}`}
        >
          <Settings className="ios-tab-icon" size={24} />
          <span>Sorteos</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`ios-tab-item ${activeTab === 'history' ? 'active' : ''}`}
        >
          <History className="ios-tab-icon" size={24} />
          <span>Historial</span>
        </button>
      </nav>
    </div>
  );
}
