import React, { useState } from 'react';
import { Layers, Plus, Trash2, Sparkles } from 'lucide-react';

export interface DrawConfig {
  id: string;
  name: string;
  description: string;
  roles: string[]; // List of roles to draw (e.g., ["Preparar Mate", "Cebar Mate"])
}

interface DrawConfigManagerProps {
  configs: DrawConfig[];
  selectedConfigId: string;
  onSelectConfig: (id: string) => void;
  onCreateConfig: (config: DrawConfig) => void;
  onDeleteConfig: (id: string) => void;
}

export const DrawConfigManager: React.FC<DrawConfigManagerProps> = ({
  configs,
  selectedConfigId,
  onSelectConfig,
  onCreateConfig,
  onDeleteConfig,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newDrawName, setNewDrawName] = useState('');
  const [newDrawDesc, setNewDrawDesc] = useState('');
  const [newRoles, setNewRoles] = useState<string[]>(['']);

  const handleAddRoleInput = () => {
    setNewRoles([...newRoles, '']);
  };

  const handleRoleInputChange = (index: number, value: string) => {
    const updated = [...newRoles];
    updated[index] = value;
    setNewRoles(updated);
  };

  const handleRemoveRoleInput = (index: number) => {
    if (newRoles.length === 1) return;
    const updated = newRoles.filter((_, i) => i !== index);
    setNewRoles(updated);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrawName.trim()) return;

    // Filter empty roles
    const filteredRoles = newRoles
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    const finalRoles = filteredRoles.length > 0 ? filteredRoles : ['Ganador'];

    const newConfig: DrawConfig = {
      id: Date.now().toString(),
      name: newDrawName.trim(),
      description: newDrawDesc.trim() || 'Sorteo personalizado',
      roles: finalRoles,
    };

    onCreateConfig(newConfig);
    setIsCreating(false);
    
    // Reset state
    setNewDrawName('');
    setNewDrawDesc('');
    setNewRoles(['']);
  };

  return (
    <div className="flex flex-col gap-6 fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
            Configuración de Sorteos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Selecciona una modalidad existente o crea una nueva con múltiples roles o rondas.
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="ios-button-primary ios-clickable p-3 flex gap-2 text-xs py-2 px-3"
          >
            <Plus size={16} />
            <span>Nuevo</span>
          </button>
        )}
      </div>

      {isCreating ? (
        <form onSubmit={handleSaveConfig} className="glass-panel p-5 flex flex-col gap-4 border-white/30 bg-white/50 dark:bg-black/30 fade-in">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-blue-500" />
            Nuevo Tipo de Sorteo
          </h3>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Nombre del Sorteo
            </label>
            <div className="ios-input-group">
              <input
                type="text"
                required
                placeholder="Ej. Preparar el Mate"
                value={newDrawName}
                onChange={(e) => setNewDrawName(e.target.value)}
                className="ios-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Descripción
            </label>
            <div className="ios-input-group">
              <input
                type="text"
                placeholder="Ej. Sorteo para ver quién calienta y quién ceba"
                value={newDrawDesc}
                onChange={(e) => setNewDrawDesc(e.target.value)}
                className="ios-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex justify-between items-center">
              <span>Roles o Rondas de Tiradas</span>
              <button
                type="button"
                onClick={handleAddRoleInput}
                className="text-blue-500 hover:text-blue-600 font-semibold text-xs flex items-center gap-1"
              >
                <Plus size={14} /> Agregar Ronda
              </button>
            </label>
            
            {newRoles.map((role, idx) => (
              <div key={idx} className="flex gap-2 items-center fade-in">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-600 w-6">
                  #{idx + 1}
                </span>
                <div className="ios-input-group flex-1">
                  <input
                    type="text"
                    required
                    placeholder={`Ej. Ronda ${idx + 1}: Preparador / Cebador`}
                    value={role}
                    onChange={(e) => handleRoleInputChange(idx, e.target.value)}
                    className="ios-input"
                  />
                </div>
                {newRoles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRoleInput(idx)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 justify-end mt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="ios-button-secondary ios-clickable py-2 px-4"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="ios-button-primary ios-clickable py-2 px-4"
            >
              Guardar
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {configs.map((config) => {
            const isSelected = config.id === selectedConfigId;
            return (
              <div
                key={config.id}
                onClick={() => onSelectConfig(config.id)}
                className={`glass-panel p-4 flex justify-between items-center cursor-pointer transition-all border-white/20 hover:border-blue-500/40 ${
                  isSelected
                    ? 'border-blue-500/60 bg-blue-500/5 shadow-[0_0_15px_rgba(0,122,255,0.1)]'
                    : 'bg-white/40 dark:bg-black/20'
                }`}
              >
                <div className="flex gap-3 items-center">
                  <div className={`p-3 rounded-xl ${isSelected ? 'bg-blue-500/20 text-blue-500' : 'bg-slate-400/15 text-slate-500'}`}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      {config.name}
                      {isSelected && <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">Activo</span>}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{config.description}</p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {config.roles.map((r, i) => (
                        <span key={i} className="text-[10px] font-semibold bg-white/60 dark:bg-black/40 border border-white/10 dark:border-white/5 rounded-full px-2.5 py-0.5 text-slate-600 dark:text-slate-400">
                          Ronda {i+1}: {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Don't allow deleting default presets */}
                {config.id !== 'mate' && config.id !== 'simple' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteConfig(config.id);
                    }}
                    className="p-2 text-rose-400 hover:text-rose-500 rounded-full hover:bg-rose-500/10 transition-colors"
                    title="Eliminar Sorteo"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
