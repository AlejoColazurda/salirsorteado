import React, { useState } from 'react';
import { Users, Sparkles, Layers, ChevronRight, ChevronLeft, Check, Plus, Trash2, ShieldAlert } from 'lucide-react';
import type { DrawConfig } from './DrawConfigManager';

interface Participant {
  id: string;
  name: string;
  active: boolean;
}

interface SetupWizardProps {
  participants: Participant[];
  onAddParticipant: (name: string) => void;
  onToggleParticipant: (id: string) => void;
  onRemoveParticipant: (id: string) => void;
  configs: DrawConfig[];
  selectedConfigId: string;
  onSelectConfig: (id: string) => void;
  onCreateConfig: (config: DrawConfig) => void;
  allowRepeat: boolean;
  onSetAllowRepeat: (val: boolean) => void;
  onStartGame: (finalConfig: DrawConfig) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({
  participants,
  onAddParticipant,
  onToggleParticipant,
  onRemoveParticipant,
  configs,
  selectedConfigId,
  onSelectConfig,
  onCreateConfig,
  allowRepeat,
  onSetAllowRepeat,
  onStartGame,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [newParticipantName, setNewParticipantName] = useState('');
  
  // Custom draw config editor states
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customRoles, setCustomRoles] = useState<string[]>(['Ronda 1']);
  const [isCustomizing, setIsCustomizing] = useState(false);

  const activeParticipants = participants.filter((p) => p.active);

  const handleAddParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim()) return;
    onAddParticipant(newParticipantName.trim());
    setNewParticipantName('');
  };

  const handleNextStep = () => {
    if (step === 1 && activeParticipants.length < 2) return;
    setStep((prev) => (prev + 1) as any);
  };

  const handlePrevStep = () => {
    setStep((prev) => (prev - 1) as any);
  };

  const handleSelectPreset = (id: string) => {
    onSelectConfig(id);
    setIsCustomizing(false);
    handleNextStep();
  };

  const handleStartCustomDrawSetup = () => {
    setIsCustomizing(true);
    setCustomName('Sorteo Personalizado');
    setCustomDesc('Sorteo a medida creado por mí');
    setCustomRoles(['Primera Ronda', 'Segunda Ronda']);
    setStep(3);
  };

  const handleAddRole = () => {
    setCustomRoles([...customRoles, `Ronda ${customRoles.length + 1}`]);
  };

  const handleRoleChange = (idx: number, value: string) => {
    const updated = [...customRoles];
    updated[idx] = value;
    setCustomRoles(updated);
  };

  const handleRemoveRole = (idx: number) => {
    if (customRoles.length === 1) return;
    setCustomRoles(customRoles.filter((_, i) => i !== idx));
  };

  const handleLaunchGame = () => {
    let finalConfig: DrawConfig;

    if (isCustomizing) {
      const cleanRoles = customRoles.map((r) => r.trim()).filter((r) => r.length > 0);
      finalConfig = {
        id: `custom-${Date.now()}`,
        name: customName.trim() || 'Sorteo Personalizado',
        description: customDesc.trim() || 'Sorteo a la medida',
        roles: cleanRoles.length > 0 ? cleanRoles : ['Ganador'],
      };
      onCreateConfig(finalConfig);
    } else {
      finalConfig = configs.find((c) => c.id === selectedConfigId) || configs[0];
    }

    onStartGame(finalConfig);
  };

  // Steps indicators style helper
  const getStepClass = (s: number) => {
    if (step === s) return 'bg-blue-500 text-white shadow-md scale-110';
    if (step > s) return 'bg-emerald-500 text-white';
    return 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
  };

  return (
    <div className="flex flex-col gap-8 fade-in w-full">
      {/* Visual Step Indicator (iOS Style Segmented Control Indicator) */}
      <div className="flex items-center justify-between px-4 pb-2 border-b border-white/10 relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
        
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all duration-300 ${getStepClass(s)}`}
          >
            {step > s ? <Check size={14} /> : s}
          </div>
        ))}
      </div>

      {/* Step Contents */}
      {step === 1 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <Users className="text-blue-500" size={24} />
              ¿Quiénes juegan hoy?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ingresa los nombres y selecciona los que participarán en el sorteo (mínimo 2).
            </p>
          </div>

          <form onSubmit={handleAddParticipantSubmit} className="flex gap-2">
            <div className="ios-input-group flex-1">
              <input
                type="text"
                placeholder="Ingresa un nombre..."
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                className="ios-input"
              />
            </div>
            <button type="submit" className="ios-button-primary ios-clickable p-3">
              <Plus size={20} />
            </button>
          </form>

          {/* Participant Grid / Scrollable Cards */}
          <div className="glass-panel max-h-[300px] overflow-y-auto p-2 bg-white/40 dark:bg-black/20">
            {participants.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                No hay participantes cargados. ¡Agrega tu grupo!
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 border ${
                      p.active
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-500/5 border-transparent text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleParticipant(p.id)}
                      className="flex-1 flex items-center gap-3 font-semibold text-left ios-clickable"
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        p.active ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {p.active && <Check size={12} />}
                      </div>
                      <span className={p.active ? 'text-slate-800 dark:text-slate-200 font-bold' : ''}>
                        {p.name}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveParticipant(p.id)}
                      className="p-1 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={handleNextStep}
              disabled={activeParticipants.length < 2}
              className={`ios-button-primary ios-clickable w-full py-3 ${
                activeParticipants.length < 2 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span>Continuar ({activeParticipants.length} listos)</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <Layers className="text-blue-500" size={24} />
              ¿Qué sorteamos hoy?
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Selecciona una de las modalidades predeterminadas o diseña una personalizada.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {configs.map((config) => (
              <div
                key={config.id}
                onClick={() => handleSelectPreset(config.id)}
                className="glass-panel p-4 flex gap-4 items-center cursor-pointer border-white/20 bg-white/40 dark:bg-black/20 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-200"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                  <Sparkles size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-slate-800 dark:text-white">
                    {config.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {config.description}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            ))}

            <button
              onClick={handleStartCustomDrawSetup}
              className="glass-panel p-4 flex gap-4 items-center cursor-pointer border-dashed border-blue-500/30 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10 transition-all duration-200 text-left"
            >
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                <Plus size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-white">
                  Diseñar Sorteo Personalizado
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Crea múltiples rondas y define roles personalizados.
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={handlePrevStep}
              className="ios-button-secondary ios-clickable px-6"
            >
              <ChevronLeft size={18} />
              <span>Atrás</span>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <Sparkles className="text-blue-500" size={24} />
              Detalles y Reglas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configura las rondas de tiradas y define si el mismo jugador puede repetir.
            </p>
          </div>

          {/* Config Builder for Customizer */}
          {isCustomizing ? (
            <div className="glass-panel p-4 bg-white/40 dark:bg-black/20 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Nombre del Sorteo
                </label>
                <div className="ios-input-group">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="ios-input font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex justify-between items-center">
                  <span>Rondas del Sorteo</span>
                  <button
                    onClick={handleAddRole}
                    className="text-xs text-blue-500 font-bold flex items-center gap-0.5"
                  >
                    <Plus size={14} /> Añadir Ronda
                  </button>
                </label>

                {customRoles.map((role, idx) => (
                  <div key={idx} className="flex gap-2 items-center fade-in">
                    <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                    <div className="ios-input-group flex-1">
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => handleRoleChange(idx, e.target.value)}
                        className="ios-input"
                      />
                    </div>
                    {customRoles.length > 1 && (
                      <button
                        onClick={() => handleRemoveRole(idx)}
                        className="p-2 text-rose-500/80 hover:bg-rose-500/10 rounded-full"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-4 bg-white/40 dark:bg-black/20 text-left">
              <h3 className="font-bold text-slate-800 dark:text-white">
                Rondas Predeterminadas
              </h3>
              <div className="flex flex-col gap-2 mt-3">
                {configs.find((c) => c.id === selectedConfigId)?.roles.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center p-2.5 rounded-xl bg-white/60 dark:bg-black/40 border border-white/10">
                    <span className="text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      Ronda {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {r}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repeat Settings switch */}
          <div className="glass-panel p-4 bg-white/40 dark:bg-black/20 flex items-center justify-between">
            <div className="flex flex-col text-left pr-4">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Permitir repetir ganadores
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Si está desactivado, el ganador de la primera ronda no podrá salir sorteado en la siguiente.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={allowRepeat}
                onChange={(e) => onSetAllowRepeat(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={handlePrevStep}
              className="ios-button-secondary ios-clickable px-6"
            >
              <ChevronLeft size={18} />
              <span>Atrás</span>
            </button>
            <button
              onClick={handleNextStep}
              className="ios-button-primary ios-clickable px-6"
            >
              <span>Resumen</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col gap-6 fade-in text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
              <Sparkles size={32} className="animate-bounce" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
              ¡Todo listo!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Repasa la configuración antes de poner a girar la ruleta.
            </p>
          </div>

          {/* Detailed Summary Card */}
          <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 text-left flex flex-col gap-4 border-white/30">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase">Sorteo</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {isCustomizing ? customName : configs.find((c) => c.id === selectedConfigId)?.name}
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase">Participantes</span>
              <span className="text-sm font-bold text-blue-500">
                {activeParticipants.length} activos
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase">Rondas</span>
              <span className="text-sm font-bold text-slate-800 dark:text-white">
                {isCustomizing ? customRoles.length : configs.find((c) => c.id === selectedConfigId)?.roles.length}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">Regla de repetición</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allowRepeat ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {allowRepeat ? 'Permitido repetir' : 'Sin ganadores duplicados'}
              </span>
            </div>
          </div>

          {/* Validation Alert for too few eligible players */}
          {!allowRepeat && activeParticipants.length < (isCustomizing ? customRoles.length : configs.find((c) => c.id === selectedConfigId)?.roles.length || 1) && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex gap-2 items-start text-left">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Advertencia:</strong> Tienes más rondas que participantes activos y no permites repetir ganadores. Algunas rondas finales podrían no tener suficientes participantes elegibles.
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-between mt-4">
            <button
              onClick={handlePrevStep}
              className="ios-button-secondary ios-clickable px-6"
            >
              <ChevronLeft size={18} />
              <span>Atrás</span>
            </button>
            <button
              onClick={handleLaunchGame}
              className="ios-button-primary ios-clickable flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg text-white font-bold"
            >
              <span>¡EMPEZAR AHORA!</span>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
