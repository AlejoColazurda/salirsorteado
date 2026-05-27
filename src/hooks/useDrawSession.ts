import { useState, useEffect } from 'react';
import type { DrawConfig } from '../components/DrawConfigManager';
import type { HistoryEntry } from '../components/HistoryManager';

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

export const useDrawSession = () => {
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

  const activeConfig = configs.find((c) => c.id === selectedConfigId) || configs[0];

  const handleAddParticipant = (name: string) => {
    setParticipants([...participants, { id: Date.now().toString(), name, active: true }]);
  };

  const handleToggleParticipant = (id: string) => {
    setParticipants(participants.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

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
    const activeParticipantNames = participants.filter((p) => p.active).map((p) => p.name);
    const nextEligibleCount = activeParticipantNames.filter(
      (name) => allowRepeat || !updatedWinners.includes(name)
    ).length;

    const completed = !(nextRound < activeConfig.roles.length && nextEligibleCount > 0);

    if (!completed) {
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
        setHistory((prev) => [entry, ...prev]);
      }, 3500);
    }
  };

  return {
    participants,
    setParticipants,
    configs,
    setConfigs,
    selectedConfigId,
    setSelectedConfigId,
    history,
    setHistory,
    allowRepeat,
    setAllowRepeat,
    sessionActive,
    setSessionActive,
    currentRoundIndex,
    setCurrentRoundIndex,
    sessionResults,
    setSessionResults,
    sessionWinners,
    setSessionWinners,
    sessionCompleted,
    setSessionCompleted,
    activeConfig,
    handleAddParticipant,
    handleToggleParticipant,
    handleRemoveParticipant,
    handleCreateConfig,
    handleDeleteConfig,
    handleStartGame,
    handleReplayDraw,
    handleSpinEnd,
  };
};
