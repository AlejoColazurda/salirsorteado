import { useState } from 'react';
import { SetupWizard } from './components/SetupWizard';
import { DrawConfigManager } from './components/DrawConfigManager';
import { HistoryManager } from './components/HistoryManager';
import { Header } from './components/common/Header';
import { TabBar } from './components/common/TabBar';
import { MultiplayerLobby } from './components/multiplayer/MultiplayerLobby';
import { ActiveSession } from './components/draw/ActiveSession';
import { useDrawSession } from './hooks/useDrawSession';
import { useMultiplayerRoom } from './hooks/useMultiplayerRoom';
import { requestNotificationPermission } from './notifications';
import { Users } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'draw' | 'configs' | 'history'>('draw');

  // Business logic hooks
  const draw = useDrawSession();
  const room = useMultiplayerRoom(draw);

  // Active names helper
  const activeParticipantNames = room.isMultiplayer
    ? room.roomMembers.map((m) => `${m.avatar || '😀'} ${m.name}`)
    : draw.participants.filter((p) => p.active).map((p) => p.name);

  // Eligible participants for current spin
  const eligibleParticipants = activeParticipantNames.filter(
    (name) => draw.allowRepeat || !draw.sessionWinners.includes(name)
  );

  return (
    <div className="min-h-screen relative pb-28">
      {/* Liquid background mallas */}
      <div className="liquid-bg-container">
        <div className="liquid-circle circle-1"></div>
        <div className="liquid-circle circle-2"></div>
        <div className="liquid-circle circle-3"></div>
      </div>

      {/* Global Header */}
      <Header isMultiplayer={room.isMultiplayer} roomCode={room.roomCode} />

      {/* Main content area */}
      <main className="ios-main-content">
        {room.isMultiplayer && !room.hasJoinedLobby ? (
          // View 1: Splash connection screen
          <MultiplayerLobby
            roomCode={room.roomCode}
            hasJoinedLobby={room.hasJoinedLobby}
            myName={room.myName}
            setMyName={room.setMyName}
            myAvatar={room.myAvatar}
            setMyAvatar={room.setMyAvatar}
            onJoinLobby={() => {
              requestNotificationPermission();
              room.setHasJoinedLobby(true);
            }}
            roomMembers={room.roomMembers}
            roomAdminId={room.roomAdminId}
            myMemberId={room.myMemberId}
            onLeaveRoom={room.handleLeaveRoom}
            onToggleSpinPermission={room.handleToggleSpinPermission}
          />
        ) : activeTab === 'draw' ? (
          <div className="flex flex-col gap-6">
            
            {/* View 2: Realtime room active users panel */}
            {room.isMultiplayer && (
              <MultiplayerLobby
                roomCode={room.roomCode}
                hasJoinedLobby={room.hasJoinedLobby}
                myName={room.myName}
                setMyName={room.setMyName}
                myAvatar={room.myAvatar}
                setMyAvatar={room.setMyAvatar}
                onJoinLobby={() => {}}
                roomMembers={room.roomMembers}
                roomAdminId={room.roomAdminId}
                myMemberId={room.myMemberId}
                onLeaveRoom={room.handleLeaveRoom}
                onToggleSpinPermission={room.handleToggleSpinPermission}
              />
            )}

            {!draw.sessionActive ? (
              room.isMultiplayer && room.roomAdminId !== room.myMemberId ? (
                // Waiting screen for guests
                <div className="glass-panel p-6 bg-white/60 dark:bg-black/40 border-white/40 text-center flex flex-col gap-4 fade-in">
                  <div className="animate-pulse flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <Users size={24} />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">Esperando al Administrador</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    El creador de la sala está configurando el sorteo. En cuanto comience, verás la ruleta aquí. ¡Prepárate!
                  </p>
                </div>
              ) : (
                // Setup panel wizard
                <SetupWizard
                  participants={draw.participants}
                  onAddParticipant={draw.handleAddParticipant}
                  onToggleParticipant={draw.handleToggleParticipant}
                  onRemoveParticipant={draw.handleRemoveParticipant}
                  configs={draw.configs}
                  selectedConfigId={draw.selectedConfigId}
                  onSelectConfig={(id) => {
                    draw.setSelectedConfigId(id);
                    if (room.isMultiplayer && room.roomAdminId === room.myMemberId) {
                      setTimeout(() => room.syncLobbyState({ selectedConfigId: id }), 100);
                    }
                  }}
                  onCreateConfig={draw.handleCreateConfig}
                  allowRepeat={draw.allowRepeat}
                  onSetAllowRepeat={(val) => {
                    draw.setAllowRepeat(val);
                    if (room.isMultiplayer && room.roomAdminId === room.myMemberId) {
                      setTimeout(() => room.syncLobbyState({ allowRepeat: val }), 100);
                    }
                  }}
                  onStartGame={(finalConfig) => {
                    if (room.isMultiplayer && room.roomAdminId !== room.myMemberId) return; // Only Admin starts
                    requestNotificationPermission();
                    draw.handleStartGame(finalConfig);
                    if (room.isMultiplayer) {
                      setTimeout(() => room.syncLobbyState({ sessionActive: true, selectedConfigId: finalConfig.id }), 100);
                    }
                  }}
                  isMultiplayer={room.isMultiplayer}
                  roomMembers={room.roomMembers}
                />
              )
            ) : (
              // Active Sorteo Wheel panel
              <ActiveSession
                sessionCompleted={draw.sessionCompleted}
                activeConfig={draw.activeConfig}
                currentRoundIndex={draw.currentRoundIndex}
                eligibleParticipants={eligibleParticipants}
                onSpinEnd={room.isMultiplayer ? room.handleMultiplayerSpinEnd : draw.handleSpinEnd}
                isMultiplayer={room.isMultiplayer}
                canISpin={room.canISpin}
                onTriggerRemoteSpin={room.handleTriggerRemoteSpin}
                sessionResults={draw.sessionResults}
                onResetSession={() => {
                  draw.setCurrentRoundIndex(0);
                  draw.setSessionResults([]);
                  draw.setSessionWinners([]);
                  draw.setSessionCompleted(false);
                  if (room.isMultiplayer) {
                    room.handleResetMultiplayerGame();
                  }
                }}
                onBackToSetup={() => {
                  draw.setSessionActive(false);
                  if (room.isMultiplayer) {
                    setTimeout(() => room.syncLobbyState({ sessionActive: false }), 100);
                  }
                }}
                roomAdminId={room.roomAdminId}
                myMemberId={room.myMemberId}
              />
            )}
          </div>
        ) : activeTab === 'configs' ? (
          <div className="flex flex-col gap-6">
            {/* Presets and DB credentials manager tab */}
            <DrawConfigManager
              configs={draw.configs}
              selectedConfigId={draw.selectedConfigId}
              onSelectConfig={(id) => {
                draw.setSelectedConfigId(id);
                draw.setSessionActive(false);
              }}
              onCreateConfig={draw.handleCreateConfig}
              onDeleteConfig={draw.handleDeleteConfig}
            />

            {/* Supabase client configs */}
            <div className="glass-panel p-5 bg-white/40 dark:bg-black/20 border-white/20 mt-2">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
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
                      value={room.dbUrl}
                      onChange={(e) => room.setDbUrl(e.target.value)}
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
                      value={room.dbKey}
                      onChange={(e) => room.setDbKey(e.target.value)}
                      className="ios-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end mt-2">
                  {room.dbConnected && (
                    <button
                      onClick={room.handleClearDbSettings}
                      className="ios-button-secondary py-2 px-4 text-xs font-semibold text-rose-500"
                    >
                      Desconectar
                    </button>
                  )}
                  <button
                    onClick={room.handleSaveDbSettings}
                    className="ios-button-primary py-2 px-4 text-xs font-semibold"
                  >
                    {room.dbConnected ? 'Conectado ✓' : 'Guardar y Conectar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // History tab
          <HistoryManager
            history={draw.history}
            onReplayDraw={draw.handleReplayDraw}
            onClearHistory={() => draw.setHistory([])}
          />
        )}
      </main>

      {/* Navigation tab bar */}
      <TabBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMultiplayer={room.isMultiplayer}
        hasJoinedLobby={room.hasJoinedLobby}
        roomAdminId={room.roomAdminId}
        myMemberId={room.myMemberId}
      />

      {/* Floating Reactions overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {room.activeReactions.map((r) => (
          <div
            key={r.id}
            className="floating-reaction"
            style={{ left: `${r.left}%` }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Reactions Bar for Multiplayer */}
      {room.isMultiplayer && room.hasJoinedLobby && (
        <div className="fixed bottom-24 right-4 z-[999] flex flex-col gap-2 bg-white/20 dark:bg-black/40 backdrop-blur-md border border-white/10 p-2.5 rounded-full shadow-2xl animate-fade-in">
          {['😂', '🔥', '😭', '👏', '🎉'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => room.sendReaction(emoji)}
              className="w-10 h-10 rounded-full bg-white/40 border border-white/10 dark:bg-black/20 hover:scale-125 transition-all text-xl flex items-center justify-center cursor-pointer active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
