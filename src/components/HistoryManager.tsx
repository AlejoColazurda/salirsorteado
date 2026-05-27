import React from 'react';
import { Users, RotateCcw, Award, Clock } from 'lucide-react';

export interface HistoryEntry {
  id: string;
  timestamp: number;
  drawConfigId: string;
  drawConfigName: string;
  participants: string[];
  results: { participantName: string; role: string }[];
}

interface HistoryManagerProps {
  history: HistoryEntry[];
  onReplayDraw: (entry: HistoryEntry) => void;
  onClearHistory: () => void;
}

export const HistoryManager: React.FC<HistoryManagerProps> = ({
  history,
  onReplayDraw,
  onClearHistory,
}) => {
  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group history entries by drawConfigName
  const groupedHistory = history.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
    if (!acc[entry.drawConfigName]) {
      acc[entry.drawConfigName] = [];
    }
    acc[entry.drawConfigName].push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            Historial de Sorteos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Revisa los sorteos anteriores o vuelve a jugarlos con los mismos participantes.
          </p>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors bg-rose-500/10 px-3 py-2 rounded-xl ios-clickable"
          >
            Borrar Todo
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="glass-panel p-10 text-center text-slate-400 dark:text-slate-500 border-white/20 bg-white/40 dark:bg-black/20">
          No hay registros de sorteos realizados todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(groupedHistory).map(([drawName, entries]) => (
            <div key={drawName} className="flex flex-col gap-3">
              {/* Category Header */}
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-300/30 dark:border-slate-800 pb-1 flex justify-between">
                <span>{drawName}</span>
                <span>({entries.length} {entries.length === 1 ? 'partida' : 'partidas'})</span>
              </h3>

              {/* Entries list */}
              <div className="flex flex-col gap-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="glass-panel p-5 border-white/20 bg-white/50 dark:bg-black/30 flex flex-col gap-3 relative overflow-hidden"
                  >
                    {/* Header info */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <Clock size={14} />
                        <span>{formatDate(entry.timestamp)}</span>
                      </div>
                      
                      <button
                        onClick={() => onReplayDraw(entry)}
                        className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1 bg-blue-500/10 px-3 py-1.5 rounded-full ios-clickable"
                        title="Restaurar participantes y jugar"
                      >
                        <RotateCcw size={12} />
                        <span>Volver a Jugar</span>
                      </button>
                    </div>

                    {/* Results list */}
                    <div className="flex flex-col gap-2 bg-white/60 dark:bg-black/40 border border-white/10 dark:border-white/5 rounded-xl p-3">
                      {entry.results.map((res, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Award size={16} className="text-yellow-500" />
                            {res.participantName}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-medium rounded-full">
                            {res.role}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Participants log */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <Users size={12} />
                      <span className="truncate">
                        Participaron ({entry.participants.length}): {entry.participants.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
