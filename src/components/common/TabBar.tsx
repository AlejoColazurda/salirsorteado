import React from 'react';
import { Sparkles, Settings, History } from 'lucide-react';

interface TabBarProps {
  activeTab: 'draw' | 'configs' | 'history';
  setActiveTab: (tab: 'draw' | 'configs' | 'history') => void;
  isMultiplayer: boolean;
  hasJoinedLobby: boolean;
  roomAdminId: string | null;
  myMemberId: string;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  setActiveTab,
  isMultiplayer,
  hasJoinedLobby,
  roomAdminId,
  myMemberId,
}) => {
  // Disable tabs in multiplayer for participants until they join lobby
  if (isMultiplayer && !hasJoinedLobby) return null;

  const showConfigsTab = !isMultiplayer || roomAdminId === myMemberId;

  return (
    <nav className="ios-tab-bar">
      <button
        onClick={() => setActiveTab('draw')}
        className={`ios-tab-item ${activeTab === 'draw' ? 'active' : ''}`}
      >
        <Sparkles className="ios-tab-icon" size={24} />
        <span>Sorteo</span>
      </button>
      
      {showConfigsTab && (
        <button
          onClick={() => setActiveTab('configs')}
          className={`ios-tab-item ${activeTab === 'configs' ? 'active' : ''}`}
        >
          <Settings className="ios-tab-icon" size={24} />
          <span>Ajustes</span>
        </button>
      )}

      <button
        onClick={() => setActiveTab('history')}
        className={`ios-tab-item ${activeTab === 'history' ? 'active' : ''}`}
      >
        <History className="ios-tab-icon" size={24} />
        <span>Historial</span>
      </button>
    </nav>
  );
};
