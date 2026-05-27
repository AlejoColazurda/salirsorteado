import { useState, useEffect } from 'react';
import { Sparkles, History, Settings, RotateCcw } from 'lucide-react';
import { SpinWheel } from './components/SpinWheel';
import { SetupWizard } from './components/SetupWizard';
import { DrawConfigManager } from './components/DrawConfigManager';
import type { DrawConfig } from './components/DrawConfigManager';
import { HistoryManager } from './components/HistoryManager';
import type { HistoryEntry } from './components/HistoryManager';

interface Participant {
  id: string;
  name: string;
  active: boolean;
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

  // Core states loaded from LocalStorage
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

  // Game Session state
  const [sessionActive, setSessionActive] = useState(false);
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

  // Active names present
  const activeParticipantNames = participants
    .filter((p) => p.active)
    .map((p) => p.name);

  // Eligible participants for current spin
  const eligibleParticipants = activeParticipantNames.filter(
    (name) => allowRepeat || !sessionWinners.includes(name)
  );

  // Participant modifiers
  const handleAddParticipant = (name: string) => {
    setParticipants([...participants, { id: Date.now().toString(), name, active: true }]);
  };

  const handleToggleParticipant = (id: string) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  // Config modifier
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

  // Start draw session
  const handleStartGame = (finalConfig: DrawConfig) => {
    setSelectedConfigId(finalConfig.id);
    setCurrentRoundIndex(0);
    setSessionResults([]);
    setSessionWinners([]);
    setSessionCompleted(false);
    setSessionActive(true);
  };

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

    const nextRound = currentRoundIndex + 1;
    const nextEligibleCount = activeParticipantNames.filter(
      (name) => allowRepeat || !updatedWinners.includes(name)
    ).length;

    if (nextRound < activeConfig.roles.length && nextEligibleCount > 0) {
      setTimeout(() => {
        setCurrentRoundIndex(nextRound);
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
      }, 3500);
    }
  };

  const handleReplayDraw = (entry: HistoryEntry) => {
    const restored = entry.participants.map((name, index) => ({
      id: `restored-${index}-${Date.now()}`,
      name,
      active: true,
    }));
    setParticipants(restored);
    setSelectedConfigId(entry.drawConfigId);
    
    // Auto-launch game
    const matchingConfig = configs.find((c) => c.id === entry.drawConfigId) || {
      id: entry.drawConfigId,
      name: entry.drawConfigName,
      description: 'Sorteo restaurado',
      roles: entry.results.map((r) => r.role),
    };

    handleStartGame(matchingConfig);
    setActiveTab('draw');
  };

  return (
    <div className="min-h-screen relative pb-28">
      {/* Background circles */}
      <div className="liquid-bg-container">
        <div className="liquid-circle circle-1"></div>
        <div className="liquid-circle circle-2"></div>
        <div className="liquid-circle circle-3"></div>
      </div>

      {/* iOS Header */}
      <header className="ios-nav-bar glass-panel rounded-none border-t-0 border-x-0 border-b bg-white/70 dark:bg-black/70 px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="text-blue-500 animate-pulse" size={24} />
          <h1 className="text-xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Salir Sorteado
          </h1>
        </div>
        <div className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 py-1 px-3 rounded-full border border-blue-500/20">
          Premium
        </div>
      </header>

      {/* Content Container */}
      <main className="ios-main-content">
        {activeTab === 'draw' && (
          <div className="flex flex-col gap-6">
            {!sessionActive ? (
              // Step-by-step Wizard Flow
              <SetupWizard
                participants={participants}
                onAddParticipant={handleAddParticipant}
                onToggleParticipant={handleToggleParticipant}
                onRemoveParticipant={handleRemoveParticipant}
                configs={configs}
                selectedConfigId={selectedConfigId}
                onSelectConfig={setSelectedConfigId}
                onCreateConfig={handleCreateConfig}
                allowRepeat={allowRepeat}
                onSetAllowRepeat={setAllowRepeat}
                onStartGame={handleStartGame}
              />
            ) : (
              // Game Drawing Screen
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
                  /* Spin Wheel Interface */
                  <div className="flex flex-col items-center">
                    <SpinWheel
                      key={`${selectedConfigId}-${currentRoundIndex}-${sessionWinners.length}`}
                      participants={eligibleParticipants}
                      roles={[activeConfig.roles[currentRoundIndex]]}
                      drawName={activeConfig.roles[currentRoundIndex]}
                      onSpinEnd={handleSpinEnd}
                    />

                    {/* Progress indicators of previous round results */}
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
                  /* Celebratory Recap Screen */
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

                    <div className="flex flex-col gap-3 mt-2">
                      <button
                        onClick={() => {
                          // Restart session
                          setCurrentRoundIndex(0);
                          setSessionResults([]);
                          setSessionWinners([]);
                          setSessionCompleted(false);
                        }}
                        className="ios-button-primary ios-clickable py-3 bg-gradient-to-r from-blue-500 to-indigo-600 font-bold"
                      >
                        <RotateCcw size={16} />
                        <span>Volver a Jugar Mismas Reglas</span>
                      </button>

                      <button
                        onClick={() => setSessionActive(false)}
                        className="ios-button-secondary ios-clickable py-3 text-slate-700 dark:text-slate-300 font-bold"
                      >
                        <span>Nuevo Sorteo (Asistente)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'configs' && (
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

      {/* Tab Navigation Bar */}
      <nav className="ios-tab-bar">
        <button
          onClick={() => setActiveTab('draw')}
          className={`ios-tab-item ${activeTab === 'draw' ? 'active' : ''}`}
        >
          <Sparkles className="ios-tab-icon" size={24} />
          <span>Sorteo</span>
        </button>
        <button
          onClick={() => setActiveTab('configs')}
          className={`ios-tab-item ${activeTab === 'configs' ? 'active' : ''}`}
        >
          <Settings className="ios-tab-icon" size={24} />
          <span>Modalidades</span>
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
