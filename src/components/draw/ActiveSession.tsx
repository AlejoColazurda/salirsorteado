import React from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';
import { SpinWheel } from '../SpinWheel';
import type { DrawConfig } from '../DrawConfigManager';

interface ActiveSessionProps {
  sessionCompleted: boolean;
  activeConfig: DrawConfig;
  currentRoundIndex: number;
  eligibleParticipants: string[];
  onSpinEnd: (results: { participantName: string; role: string }[]) => void;
  isMultiplayer: boolean;
  canISpin: boolean;
  onTriggerRemoteSpin: (speed: number, winnerIndex: number) => void;
  sessionResults: { participantName: string; role: string }[];
  onResetSession: () => void;
  onBackToSetup: () => void;
  roomAdminId: string | null;
  myMemberId: string;
}

export const ActiveSession: React.FC<ActiveSessionProps> = ({
  sessionCompleted,
  activeConfig,
  currentRoundIndex,
  eligibleParticipants,
  onSpinEnd,
  isMultiplayer,
  canISpin,
  onTriggerRemoteSpin,
  sessionResults,
  onResetSession,
  onBackToSetup,
  roomAdminId,
  myMemberId,
}) => {
  const isLobbyAdmin = !isMultiplayer || roomAdminId === myMemberId;

  if (sessionCompleted) {
    return (
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

        {/* Action Controls */}
        {isLobbyAdmin && (
          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={onResetSession}
              className="ios-button-primary ios-clickable py-3 bg-gradient-to-r from-blue-500 to-indigo-600 font-bold"
            >
              <RotateCcw size={16} />
              <span>Volver a Jugar Mismas Reglas</span>
            </button>

            <button
              onClick={onBackToSetup}
              className="ios-button-secondary ios-clickable py-3 text-slate-700 dark:text-slate-300 font-bold"
            >
              <span>Nuevo Sorteo (Asistente)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 fade-in">
      {/* Active Round Info Header */}
      <div className="glass-panel p-5 bg-white/50 dark:bg-black/40 border-white/30 text-left flex flex-col gap-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 text-[10px] uppercase font-bold text-blue-500">
          Sorteo en vivo
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
          Sorteando: {activeConfig.roles[currentRoundIndex]}
        </h2>
        <p className="text-xs text-slate-400">
          Rol {currentRoundIndex + 1} de {activeConfig.roles.length}
        </p>
      </div>

      <div className="flex flex-col items-center">
        <SpinWheel
          key={`${activeConfig.id}-${currentRoundIndex}-${sessionResults.length}`}
          participants={eligibleParticipants}
          roles={[activeConfig.roles[currentRoundIndex]]}
          drawName={activeConfig.roles[currentRoundIndex]}
          onSpinEnd={onSpinEnd}
          isMultiplayer={isMultiplayer}
          canISpin={canISpin}
          onTriggerRemoteSpin={onTriggerRemoteSpin}
        />

        {/* Progress indicators of previous rounds */}
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
    </div>
  );
};
