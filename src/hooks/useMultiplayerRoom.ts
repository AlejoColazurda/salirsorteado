import { useState, useEffect, useRef } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '../supabase';
import type { DrawConfig } from '../components/DrawConfigManager';
import type { HistoryEntry } from '../components/HistoryManager';

interface Member {
  id: string;
  name: string;
  avatar: string;
  isSpinner: boolean;
  isAdmin: boolean;
}

interface DrawState {
  activeConfig: DrawConfig;
  allowRepeat: boolean;
  setAllowRepeat: (val: boolean) => void;
  currentRoundIndex: number;
  setCurrentRoundIndex: (val: number) => void;
  sessionWinners: string[];
  setSessionWinners: (val: string[]) => void;
  sessionResults: { participantName: string; role: string }[];
  setSessionResults: (val: any[]) => void;
  sessionActive: boolean;
  setSessionActive: (val: boolean) => void;
  sessionCompleted: boolean;
  setSessionCompleted: (val: boolean) => void;
  setSelectedConfigId: (id: string) => void;
  history: HistoryEntry[];
  setHistory: any;
  participants: any[];
}

export const useMultiplayerRoom = (draw: DrawState) => {
  // Database configuration
  const [dbUrl, setDbUrl] = useState(() => localStorage.getItem('supabase_url') || '');
  const [dbKey, setDbKey] = useState(() => localStorage.getItem('supabase_anon_key') || '');
  const [dbConnected, setDbConnected] = useState(() => isSupabaseConfigured());

  // Lobby States
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isMultiplayer, setIsMultiplayer] = useState(false);
  const [myMemberId] = useState(() => `user-${Math.random().toString(36).substring(2, 9)}`);
  const [myName, setMyName] = useState(() => localStorage.getItem('multiplayer_name') || '');
  const [myAvatar, setMyAvatar] = useState(() => localStorage.getItem('multiplayer_avatar') || '😀');
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [roomMembers, setRoomMembers] = useState<Member[]>([]);
  const [roomAdminId, setRoomAdminId] = useState<string | null>(null);
  const [canISpin, setCanISpin] = useState(false);

  const supabaseChannelRef = useRef<any>(null);

  // Read URL query parameter for room code on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setRoomCode(code.toUpperCase());
      setIsMultiplayer(true);
    }
  }, []);

  const handleSaveDbSettings = () => {
    localStorage.setItem('supabase_url', dbUrl.trim());
    localStorage.setItem('supabase_anon_key', dbKey.trim());
    setDbConnected(isSupabaseConfigured());
  };

  const handleClearDbSettings = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    setDbUrl('');
    setDbKey('');
    setDbConnected(false);
  };

  // Helper to sync lobby status (Admin only)
  const syncLobbyState = (overrides: any = {}) => {
    if (!supabaseChannelRef.current || roomAdminId !== myMemberId) return;

    supabaseChannelRef.current.send({
      type: 'broadcast',
      event: 'lobby_update',
      payload: {
        members: roomMembers,
        adminId: myMemberId,
        config: draw.activeConfig,
        allowRepeat: draw.allowRepeat,
        currentRoundIndex: draw.currentRoundIndex,
        sessionWinners: draw.sessionWinners,
        sessionResults: draw.sessionResults,
        sessionActive: draw.sessionActive,
        sessionCompleted: draw.sessionCompleted,
        ...overrides,
      },
    });
  };

  // Trigger spin over network
  const handleTriggerRemoteSpin = (speed: number, winnerIndex: number) => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'spin_wheel',
        payload: { speed, winnerIndex },
      });
    }
  };

  // Create multiplayer room (Admin)
  const handleCreateRoom = () => {
    if (!myName.trim()) return;
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    setRoomCode(code);
    setIsMultiplayer(true);
    setRoomAdminId(myMemberId);
    setRoomMembers([{ id: myMemberId, name: myName.trim(), avatar: myAvatar, isSpinner: true, isAdmin: true }]);
    setHasJoinedLobby(true);
  };

  // Toggle user spin permission (Admin)
  const handleToggleSpinPermission = (memberId: string) => {
    const updated = roomMembers.map((m) =>
      m.id === memberId ? { ...m, isSpinner: !m.isSpinner } : m
    );
    setRoomMembers(updated);
    
    // Broadcast permission change
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'lobby_update',
        payload: {
          members: updated,
          adminId: myMemberId,
          config: draw.activeConfig,
          allowRepeat: draw.allowRepeat,
          currentRoundIndex: draw.currentRoundIndex,
          sessionWinners: draw.sessionWinners,
          sessionResults: draw.sessionResults,
          sessionActive: draw.sessionActive,
          sessionCompleted: draw.sessionCompleted,
        },
      });
    }
  };

  // Leave room
  const handleLeaveRoom = () => {
    setIsMultiplayer(false);
    setRoomCode(null);
    setRoomMembers([]);
    setRoomAdminId(null);
    setHasJoinedLobby(false);
    window.history.pushState({}, document.title, window.location.pathname);
  };

  // Realtime Broadcast Channel Listener/Sync
  useEffect(() => {
    if (!isMultiplayer || !roomCode || !hasJoinedLobby) return;

    const client = getSupabaseClient();
    if (!client) return;

    const channelName = `room-${roomCode}`;
    const channel = client.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    }) as any;

    supabaseChannelRef.current = channel;

    // Subscribe to broadcast events
    channel
      .on('broadcast', { event: 'join_request' }, ({ payload }: any) => {
        if (roomAdminId === myMemberId) {
          setRoomMembers((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            const updated = [...prev, { id: payload.id, name: payload.name, avatar: payload.avatar || '😀', isSpinner: false, isAdmin: false }];
            
            // Broadcast lobby state update to everyone
            channel.send({
              type: 'broadcast',
              event: 'lobby_update',
              payload: {
                members: updated,
                adminId: myMemberId,
                config: draw.activeConfig,
                allowRepeat: draw.allowRepeat,
                currentRoundIndex: draw.currentRoundIndex,
                sessionWinners: draw.sessionWinners,
                sessionResults: draw.sessionResults,
                sessionActive: draw.sessionActive,
                sessionCompleted: draw.sessionCompleted,
              },
            });
            return updated;
          });
        }
      })
      .on('broadcast', { event: 'lobby_update' }, ({ payload }: any) => {
        setRoomMembers(payload.members);
        setRoomAdminId(payload.adminId);
        draw.setAllowRepeat(payload.allowRepeat);
        draw.setCurrentRoundIndex(payload.currentRoundIndex);
        draw.setSessionWinners(payload.sessionWinners);
        draw.setSessionResults(payload.sessionResults);
        draw.setSessionActive(payload.sessionActive);
        draw.setSessionCompleted(payload.sessionCompleted);

        // Find my spin permission
        const me = payload.members.find((m: Member) => m.id === myMemberId);
        setCanISpin(me ? me.isSpinner || payload.adminId === myMemberId : payload.adminId === myMemberId);
      })
      .on('broadcast', { event: 'spin_wheel' }, ({ payload }: any) => {
        const spinEvent = new CustomEvent('remote-spin', {
          detail: { speed: payload.speed, winnerIndex: payload.winnerIndex },
        });
        window.dispatchEvent(spinEvent);
      })
      .on('broadcast', { event: 'reaction' }, ({ payload }: any) => {
        const id = Math.random().toString(36).substring(2, 9);
        const left = Math.floor(Math.random() * 80) + 10;
        setActiveReactions((prev) => [...prev, { id, emoji: payload.emoji, left }]);
        setTimeout(() => {
          setActiveReactions((prev) => prev.filter((r) => r.id !== id));
        }, 2000);
      })
      .on('broadcast', { event: 'reset_game' }, () => {
        draw.setSessionResults([]);
        draw.setSessionWinners([]);
        draw.setCurrentRoundIndex(0);
        draw.setSessionCompleted(false);
      });

    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'join_request',
          payload: { id: myMemberId, name: myName, avatar: myAvatar },
        });
      }
    });

    return () => {
      channel.unsubscribe();
      supabaseChannelRef.current = null;
    };
  }, [isMultiplayer, roomCode, hasJoinedLobby, myName, myAvatar]);

  // Handle spin end specifically in multiplayer (syncs state)
  const handleMultiplayerSpinEnd = (results: { participantName: string; role: string }[]) => {
    if (roomAdminId !== myMemberId) return; // Only admin commits results over net

    const winnerName = results[0].participantName;
    const currentRole = draw.activeConfig.roles[draw.currentRoundIndex];

    const updatedResults = [
      ...draw.sessionResults,
      { participantName: winnerName, role: currentRole },
    ];
    const updatedWinners = [...draw.sessionWinners, winnerName];

    draw.setSessionResults(updatedResults);
    draw.setSessionWinners(updatedWinners);

    const nextRound = draw.currentRoundIndex + 1;
    const activeParticipantNames = roomMembers.map((m) => m.name);
    const nextEligibleCount = activeParticipantNames.filter(
      (name) => draw.allowRepeat || !updatedWinners.includes(name)
    ).length;

    const completed = !(nextRound < draw.activeConfig.roles.length && nextEligibleCount > 0);

    if (!completed) {
      setTimeout(() => {
        draw.setCurrentRoundIndex(nextRound);
        syncLobbyState({
          currentRoundIndex: nextRound,
          sessionWinners: updatedWinners,
          sessionResults: updatedResults,
        });
      }, 3500);
    } else {
      setTimeout(() => {
        draw.setSessionCompleted(true);
        // Log to history
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          drawConfigId: draw.activeConfig.id,
          drawConfigName: draw.activeConfig.name,
          participants: activeParticipantNames,
          results: updatedResults,
        };
        draw.setHistory((prev: HistoryEntry[]) => [entry, ...prev]);

        syncLobbyState({
          sessionCompleted: true,
          sessionWinners: updatedWinners,
          sessionResults: updatedResults,
        });
      }, 3500);
    }
  };

  const handleResetMultiplayerGame = () => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({ type: 'broadcast', event: 'reset_game' });
    }
    setTimeout(() => syncLobbyState({ sessionCompleted: false, sessionWinners: [], sessionResults: [] }), 100);
  };

  const sendReaction = (emoji: string) => {
    if (supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji },
      });
    }
  };

  return {
    dbUrl,
    setDbUrl,
    dbKey,
    setDbKey,
    dbConnected,
    handleSaveDbSettings,
    handleClearDbSettings,
    roomCode,
    setRoomCode,
    isMultiplayer,
    setIsMultiplayer,
    myMemberId,
    myName,
    setMyName,
    myAvatar,
    setMyAvatar,
    activeReactions,
    sendReaction,
    hasJoinedLobby,
    setHasJoinedLobby,
    roomMembers,
    roomAdminId,
    canISpin,
    syncLobbyState,
    handleTriggerRemoteSpin,
    handleCreateRoom,
    handleToggleSpinPermission,
    handleLeaveRoom,
    handleMultiplayerSpinEnd,
    handleResetMultiplayerGame,
  };
};
