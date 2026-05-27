import React, { useState } from 'react';
import { UserPlus, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  active: boolean;
}

interface ParticipantManagerProps {
  participants: Participant[];
  onAddParticipant: (name: string) => void;
  onToggleParticipant: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
}

export const ParticipantManager: React.FC<ParticipantManagerProps> = ({
  participants,
  onAddParticipant,
  onToggleParticipant,
  onRemoveParticipant,
}) => {
  const [newParticipantName, setNewParticipantName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim()) return;
    onAddParticipant(newParticipantName.trim());
    setNewParticipantName('');
  };

  const activeCount = participants.filter((p) => p.active).length;

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          Participantes ({activeCount}/{participants.length})
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Agrega o activa/desactiva a las personas que participarán en el próximo sorteo.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="ios-input-group flex-1">
          <input
            type="text"
            placeholder="Nombre del participante..."
            value={newParticipantName}
            onChange={(e) => setNewParticipantName(e.target.value)}
            className="ios-input"
          />
        </div>
        <button type="submit" className="ios-button-primary ios-clickable p-3">
          <UserPlus size={20} />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </form>

      {/* Participant List */}
      <div className="glass-panel overflow-hidden border-white/20 bg-white/40 dark:bg-black/20">
        {participants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            No hay participantes todavía. ¡Agrega uno arriba!
          </div>
        ) : (
          <div className="divide-y divide-white/20 dark:divide-white/5">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-4 transition-colors ${
                  participant.active
                    ? 'bg-transparent'
                    : 'bg-slate-500/5 text-slate-400 dark:text-slate-500'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleParticipant(participant.id)}
                  className="flex items-center gap-3 text-left font-medium ios-clickable"
                >
                  {participant.active ? (
                    <CheckCircle2 className="text-blue-500" size={22} />
                  ) : (
                    <Circle className="text-slate-300 dark:text-slate-700" size={22} />
                  )}
                  <span className={participant.active ? 'text-slate-800 dark:text-slate-200' : 'line-through'}>
                    {participant.name}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveParticipant(participant.id)}
                  className="p-2 text-rose-500/80 hover:text-rose-500 rounded-full hover:bg-rose-500/10 transition-colors ios-clickable"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
