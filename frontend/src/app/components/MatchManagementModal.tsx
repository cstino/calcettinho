'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';

interface Player {
  nome: string;
  email: string;
}

interface PlayerMatchStats {
  gol: number;
  assist: number;
  gialli: number;
  rossi: number;
  parate?: number;
}

interface Match {
  id: string;
  matchId: string;
  date: string;
  teamA: string[];
  teamB: string[];
  completed: boolean;
  scoreA?: number;
  scoreB?: number;
  playerStats?: { [email: string]: PlayerMatchStats };
  match_status?: string;
  referee?: string;
}

interface MatchManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  match: Match | null;
}

interface StatAction {
  type: 'gol' | 'gialli' | 'rossi' | 'parate';
  team: 'A' | 'B';
}

interface GolAction {
  team: 'A' | 'B';
}

export default function MatchManagementModal({ isOpen, onClose, onSuccess, match }: MatchManagementModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerStats, setPlayerStats] = useState<{ [email: string]: PlayerMatchStats }>({});
  const [showStatModal, setShowStatModal] = useState(false);
  const [showGolModal, setShowGolModal] = useState(false);
  const [currentStatAction, setCurrentStatAction] = useState<StatAction | null>(null);
  const [currentGolAction, setCurrentGolAction] = useState<GolAction | null>(null);
  const [isUpdatingStat, setIsUpdatingStat] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 🔄 Auto-save e Restore system per prevenire perdita dati su refresh
  const getStorageKey = (matchId: string) => `calcettinho_match_${matchId}_tabellino`;
  
  const saveToLocalStorage = (stats: { [email: string]: PlayerMatchStats }, matchId: string) => {
    try {
      const saveData = {
        playerStats: stats,
        timestamp: new Date().toISOString(),
        matchId: matchId
      };
      localStorage.setItem(getStorageKey(matchId), JSON.stringify(saveData));
      setLastSaveTime(new Date().toLocaleTimeString());
      setHasUnsavedChanges(false);
      console.log('✅ Tabellino auto-salvato nel localStorage:', saveData);
    } catch (error) {
      console.error('❌ Errore nel salvare tabellino:', error);
    }
  };
  
  const loadFromLocalStorage = (matchId: string) => {
    try {
      const savedData = localStorage.getItem(getStorageKey(matchId));
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('🔄 Dati tabellino ripristinati dal localStorage:', parsed);
        setLastSaveTime(new Date(parsed.timestamp).toLocaleTimeString());
        return parsed.playerStats;
      }
    } catch (error) {
      console.error('❌ Errore nel caricare tabellino salvato:', error);
    }
    return null;
  };
  
  const clearLocalStorage = (matchId: string) => {
    try {
      localStorage.removeItem(getStorageKey(matchId));
      setLastSaveTime(null);
      setHasUnsavedChanges(false);
      console.log('🗑️ Dati tabellino rimossi dal localStorage');
    } catch (error) {
      console.error('❌ Errore nel rimuovere tabellino salvato:', error);
    }
  };

  useEffect(() => {
    if (isOpen && match) {
      fetchPlayers();
      initializeStats();
    }
  }, [isOpen, match]);

  useEffect(() => {
    console.log('Modal states - showGolModal:', showGolModal, 'showStatModal:', showStatModal);
  }, [showGolModal, showStatModal]);

  // 🔄 Auto-save quando playerStats cambia (con debounce di 1 secondo)
  useEffect(() => {
    if (!match || !playerStats || Object.keys(playerStats).length === 0) return;
    
    // Debounce per evitare troppe scritture
    const saveTimeout = setTimeout(() => {
      saveToLocalStorage(playerStats, match.matchId);
    }, 1000);
    
    // Marca come modificato immediatamente
    setHasUnsavedChanges(true);
    
    return () => clearTimeout(saveTimeout);
  }, [playerStats, match]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const playersData = await response.json();
        setPlayers(playersData);
      }
    } catch (error) {
      console.error('Errore nel caricamento giocatori:', error);
    }
  };

  const initializeStats = () => {
    if (!match) return;
    
    // 🔄 Prima controlla se ci sono dati salvati nel localStorage
    const savedStats = loadFromLocalStorage(match.matchId);
    
    const allPlayers = [...match.teamA, ...match.teamB];
    const initialStats: { [email: string]: PlayerMatchStats } = {};
    
    allPlayers.forEach(email => {
      // Usa i dati salvati se esistono, altrimenti usa quelli dal server o inizializza a zero
      initialStats[email] = savedStats?.[email] || match.playerStats?.[email] || {
        gol: 0,
        assist: 0,
        gialli: 0,
        rossi: 0,
        parate: 0
      };
    });

    setPlayerStats(initialStats);
    
    // Se abbiamo caricato dati salvati, mostra un messaggio
    if (savedStats) {
      console.log('🔄 Tabellino ripristinato dal salvataggio automatico');
      setHasUnsavedChanges(true); // Indica che ci sono dati non salvati nel server
    }
  };

  const getPlayerName = (email: string) => {
    const player = players.find(p => p.email === email);
    return player?.nome || email.split('@')[0];
  };

  const getTeamPlayers = (team: 'A' | 'B') => {
    if (!match) return [];
    const teamEmails = team === 'A' ? match.teamA : match.teamB;
    return teamEmails.map(email => ({
      email,
      name: getPlayerName(email)
    }));
  };

  const handleGolAction = (team: 'A' | 'B') => {
    console.log('handleGolAction chiamata, team:', team);
    setCurrentGolAction({ team });
    setShowGolModal(true);
    console.log('showGolModal impostato a true');
  };

  const handleStatAction = (type: StatAction['type'], team: 'A' | 'B') => {
    console.log('handleStatAction chiamata, type:', type, 'team:', team);
    setCurrentStatAction({ type, team });
    setShowStatModal(true);
    console.log('showStatModal impostato a true');
  };

  const handleGolSubmit = useCallback((scorerEmail: string, assistEmail?: string) => {
    // Genera un ID unico basato su parametri + timestamp per identificare univocamente questa specifica chiamata
    const timestamp = Date.now();
    const actionId = `gol-${scorerEmail}-${assistEmail || 'none'}-${timestamp}`;
    
    console.log('✅ handleGolSubmit chiamata per:', scorerEmail, 'assist:', assistEmail, 'actionId:', actionId);
    
    // Chiudi immediatamente i modal per evitare doppi click
    setShowGolModal(false);
    setCurrentGolAction(null);

    // Aggiorna lo stato immediatamente, senza setTimeout
    setPlayerStats(prev => {
      const newStats = { ...prev };
      
      // Aggiungi gol al marcatore
      if (!newStats[scorerEmail]) {
        newStats[scorerEmail] = { gol: 0, assist: 0, gialli: 0, rossi: 0, parate: 0 };
      }
      const oldGol = newStats[scorerEmail].gol;
      newStats[scorerEmail] = {
        ...newStats[scorerEmail],
        gol: oldGol + 1
      };
      console.log(`⚽ Gol per ${scorerEmail}: ${oldGol} -> ${newStats[scorerEmail].gol}`);
      
      // Aggiungi assist se specificato
      if (assistEmail && assistEmail !== scorerEmail) {
        if (!newStats[assistEmail]) {
          newStats[assistEmail] = { gol: 0, assist: 0, gialli: 0, rossi: 0, parate: 0 };
        }
        const oldAssist = newStats[assistEmail].assist;
        newStats[assistEmail] = {
          ...newStats[assistEmail],
          assist: oldAssist + 1
        };
        console.log(`🅰️ Assist per ${assistEmail}: ${oldAssist} -> ${newStats[assistEmail].assist}`);
      }
      
      return newStats;
    });
  }, []);

  const handlePlayerStatUpdate = useCallback((playerEmail: string) => {
    if (!currentStatAction) return;
    
    if (isUpdatingStat) {
      console.log('🛑 Statistica già in aggiornamento, bloccato');
      return;
    }

    console.log(`✅ handlePlayerStatUpdate chiamata per ${playerEmail}, tipo: ${currentStatAction.type}`);
    
    setIsUpdatingStat(true);
    
    // Chiudi immediatamente il modal
    setShowStatModal(false);
    setCurrentStatAction(null);

    // Aggiorna lo stato immediatamente
    setPlayerStats(prev => {
      const newStats = { ...prev };
      
      if (!newStats[playerEmail]) {
        newStats[playerEmail] = { gol: 0, assist: 0, gialli: 0, rossi: 0, parate: 0 };
      }

      const currentValue = newStats[playerEmail][currentStatAction.type] || 0;
      newStats[playerEmail] = {
        ...newStats[playerEmail],
        [currentStatAction.type]: currentValue + 1
      };
      
      console.log(`📊 ${currentStatAction.type} per ${playerEmail}: ${currentValue} -> ${newStats[playerEmail][currentStatAction.type]}`);
      
      return newStats;
    });
    
    // Reset del flag dopo un breve delay
    setTimeout(() => {
      setIsUpdatingStat(false);
    }, 1000);
  }, [currentStatAction, isUpdatingStat]);

  const calculateTeamScore = (team: 'A' | 'B') => {
    if (!match) return 0;
    const teamEmails = team === 'A' ? match.teamA : match.teamB;
    return teamEmails.reduce((total, email) => {
      return total + (playerStats[email]?.gol || 0);
    }, 0);
  };

  const handleSaveMatch = async () => {
    if (!match) return;
    
    setLoading(true);
    try {
      const finalScoreA = calculateTeamScore('A');
      const finalScoreB = calculateTeamScore('B');
      
      const response = await fetch(`/api/matches/${match.matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scoreA: finalScoreA,
          scoreB: finalScoreB,
          playerStats: playerStats,
          completed: true,
          match_status: 'completed'
        }),
      });

      if (response.ok) {
        // 🗑️ Pulisci i dati auto-salvati quando la partita è stata salvata con successo
        clearLocalStorage(match.matchId);
        console.log('✅ Partita salvata e dati temporanei rimossi');
        
        onSuccess();
        onClose();
      } else {
        console.error('Errore nel salvare la partita');
      }
    } catch (error) {
      console.error('Errore nel salvare la partita:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🚨 Gestione chiusura con controllo modifiche non salvate
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = confirm(
        '⚠️ Attenzione: Modifiche non salvate!\n\n' +
        'Hai delle modifiche al tabellino che non sono state salvate nel server.\n' +
        'I dati sono comunque protetti da auto-save locale.\n\n' +
        '• Clicca "OK" per chiudere (i dati rimangono salvati localmente)\n' +
        '• Clicca "Annulla" per continuare a modificare\n\n' +
        'Per salvare definitivamente, usa "Termina Partita"'
      );
      
      if (!confirmed) return;
    }
    
    onClose();
  };

  if (!isOpen || !match) return null;

  return (
    <>
      {/* Modal principale */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-700">
          {/* Header */}
          <div className="border-b border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white font-runtime">Gestione Tabellino</h2>
                  
                  {/* 🔄 Indicatore Auto-Save */}
                  {lastSaveTime && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400 font-runtime">
                        Auto-salvato {lastSaveTime}
                      </span>
                    </div>
                  )}
                  
                  {hasUnsavedChanges && !lastSaveTime && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-yellow-400 font-runtime">
                        Modifiche non salvate
                      </span>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-400 font-runtime mt-1">
                  {new Date(match.date).toLocaleDateString('it-IT')}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Contenuto */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Punteggio */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-8 mb-4">
                <div className="text-center">
                  <h3 className="text-red-400 font-runtime font-bold text-lg mb-2">Team Rosso</h3>
                  <div className="text-6xl font-bold text-white">{calculateTeamScore('A')}</div>
                </div>
                <div className="text-4xl font-bold text-gray-500">-</div>
                <div className="text-center">
                  <h3 className="text-blue-400 font-runtime font-bold text-lg mb-2">Team Blu</h3>
                  <div className="text-6xl font-bold text-white">{calculateTeamScore('B')}</div>
                </div>
              </div>
            </div>

            {/* Sezione 2: Card Bottoni - Team affiancati */}
            <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold text-white font-runtime mb-6 text-center">Azioni di Gioco</h3>
              
              <div className="grid grid-cols-2 gap-8">
                                 {/* Team Rosso - Bottoni */}
                 <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                   <h4 className="text-red-400 font-runtime font-bold text-lg mb-4 text-center">Team<br/>Rosso</h4>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato GOL Team A');
                        handleGolAction('A');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      GOL
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato GIALLO Team A');
                        handleStatAction('gialli', 'A');
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      GIALLO
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato ROSSO Team A');
                        handleStatAction('rossi', 'A');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      ROSSO
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato PARATA Team A');
                        handleStatAction('parate', 'A');
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      PARATA
                    </button>
                  </div>
                </div>

                                 {/* Team Blu - Bottoni */}
                 <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                   <h4 className="text-blue-400 font-runtime font-bold text-lg mb-4 text-center">Team<br/>Blu</h4>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato GOL Team B');
                        handleGolAction('B');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      GOL
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato GIALLO Team B');
                        handleStatAction('gialli', 'B');
                      }}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      GIALLO
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato ROSSO Team B');
                        handleStatAction('rossi', 'B');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      ROSSO
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Cliccato PARATA Team B');
                        handleStatAction('parate', 'B');
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-runtime font-semibold transition-all"
                    >
                      PARATA
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sezione 3: Card Tabellino - Tabelle professionali */}
            <div className="bg-gray-800/30 border border-gray-600 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white font-runtime mb-6 text-center">Tabellino</h3>
              
              {/* Team Rosso Table */}
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-red-400 font-runtime mb-4">Team Rosso</h4>
                <div className="bg-red-900/10 border border-red-500/30 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-red-900/30">
                      <tr>
                        <th className="text-left p-2 text-red-300 font-runtime font-medium text-xs">Giocatore</th>
                        <th className="text-center p-2 text-green-300 font-runtime font-medium text-xs w-12">GOL</th>
                        <th className="text-center p-2 text-blue-300 font-runtime font-medium text-xs w-12">ASS</th>
                        <th className="text-center p-2 text-yellow-300 font-runtime font-medium text-xs w-10">🟨</th>
                        <th className="text-center p-2 text-red-300 font-runtime font-medium text-xs w-10">🟥</th>
                        <th className="text-center p-2 text-purple-300 font-runtime font-medium text-xs w-12">PAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTeamPlayers('A').map(({ email, name }, index) => {
                        const stats = playerStats[email] || { gol: 0, assist: 0, gialli: 0, rossi: 0, parate: 0 };
                        return (
                          <tr key={email} className={`border-t border-red-500/20 ${index % 2 === 0 ? 'bg-red-900/5' : 'bg-transparent'}`}>
                            <td className="p-2 text-white font-runtime font-normal text-sm">{name}</td>
                            <td className="p-2 text-center text-green-400 font-semibold text-sm">{stats.gol || '-'}</td>
                            <td className="p-2 text-center text-blue-400 font-semibold text-sm">{stats.assist || '-'}</td>
                            <td className="p-2 text-center text-yellow-400 font-semibold text-sm">{stats.gialli || '-'}</td>
                            <td className="p-2 text-center text-red-400 font-semibold text-sm">{stats.rossi || '-'}</td>
                            <td className="p-2 text-center text-purple-400 font-semibold text-sm">{stats.parate || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Team Blu Table */}
              <div>
                <h4 className="text-lg font-semibold text-blue-400 font-runtime mb-4">Team Blu</h4>
                <div className="bg-blue-900/10 border border-blue-500/30 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-blue-900/30">
                      <tr>
                        <th className="text-left p-2 text-blue-300 font-runtime font-medium text-xs">Giocatore</th>
                        <th className="text-center p-2 text-green-300 font-runtime font-medium text-xs w-12">GOL</th>
                        <th className="text-center p-2 text-blue-300 font-runtime font-medium text-xs w-12">ASS</th>
                        <th className="text-center p-2 text-yellow-300 font-runtime font-medium text-xs w-10">🟨</th>
                        <th className="text-center p-2 text-red-300 font-runtime font-medium text-xs w-10">🟥</th>
                        <th className="text-center p-2 text-purple-300 font-runtime font-medium text-xs w-12">PAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getTeamPlayers('B').map(({ email, name }, index) => {
                        const stats = playerStats[email] || { gol: 0, assist: 0, gialli: 0, rossi: 0, parate: 0 };
                        return (
                          <tr key={email} className={`border-t border-blue-500/20 ${index % 2 === 0 ? 'bg-blue-900/5' : 'bg-transparent'}`}>
                            <td className="p-2 text-white font-runtime font-normal text-sm">{name}</td>
                            <td className="p-2 text-center text-green-400 font-semibold text-sm">{stats.gol || '-'}</td>
                            <td className="p-2 text-center text-blue-400 font-semibold text-sm">{stats.assist || '-'}</td>
                            <td className="p-2 text-center text-yellow-400 font-semibold text-sm">{stats.gialli || '-'}</td>
                            <td className="p-2 text-center text-red-400 font-semibold text-sm">{stats.rossi || '-'}</td>
                            <td className="p-2 text-center text-purple-400 font-semibold text-sm">{stats.parate || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-700 p-6">
            <div className="flex gap-4 justify-end">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-runtime font-semibold transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveMatch}
                disabled={loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-runtime font-semibold transition-all disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Termina Partita'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal GOL con assist */}
      {showGolModal && currentGolAction && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-600">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white font-runtime mb-4">
                Registra GOL - Team {currentGolAction.team === 'A' ? 'Rosso' : 'Blu'}
              </h3>
              
              <GolForm
                team={currentGolAction.team}
                players={getTeamPlayers(currentGolAction.team)}
                onSubmit={handleGolSubmit}
                onCancel={() => setShowGolModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal selezione giocatore per altre statistiche */}
      {showStatModal && currentStatAction && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-600">
            <div className="p-6">
              <h3 className="text-xl font-bold text-white font-runtime mb-4">
                Seleziona Giocatore - {currentStatAction.type.toUpperCase()}
              </h3>
              <div className="space-y-3">
                {getTeamPlayers(currentStatAction.team).map(({ email, name }) => (
                  <button
                    key={email}
                    onClick={() => handlePlayerStatUpdate(email)}
                    className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-runtime transition-all"
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowStatModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-runtime transition-all"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente per il form del gol
interface GolFormProps {
  team: 'A' | 'B';
  players: { email: string; name: string }[];
  onSubmit: (scorerEmail: string, assistEmail?: string) => void;
  onCancel: () => void;
}

function GolForm({ team, players, onSubmit, onCancel }: GolFormProps) {
  const [scorerEmail, setScorerEmail] = useState('');
  const [assistEmail, setAssistEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    if (!scorerEmail) {
      alert('Seleziona chi ha segnato il gol');
      return;
    }
    
    if (isSubmitting) {
      console.log('🛑 Form già in invio, bloccato');
      return;
    }
    
    setIsSubmitting(true);
    onSubmit(scorerEmail, assistEmail || undefined);
    
    // Reset dopo un breve delay
    setTimeout(() => {
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      {/* Marcatore */}
      <div>
        <label className="block text-white font-runtime mb-2">
          Chi ha segnato? *
        </label>
        <select
          value={scorerEmail}
          onChange={(e) => setScorerEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
        >
          <option value="">Seleziona marcatore...</option>
          {players.map(player => (
            <option key={player.email} value={player.email}>
              {player.name}
            </option>
          ))}
        </select>
      </div>

      {/* Assist */}
      <div>
        <label className="block text-white font-runtime mb-2">
          Chi ha fatto l'assist? (opzionale)
        </label>
        <select
          value={assistEmail}
          onChange={(e) => setAssistEmail(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-green-500 focus:outline-none"
        >
          <option value="">Nessun assist</option>
          {players
            .filter(player => player.email !== scorerEmail)
            .map(player => (
              <option key={player.email} value={player.email}>
                {player.name}
              </option>
            ))}
        </select>
      </div>

      {/* Bottoni */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-runtime transition-all"
        >
          Annulla
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-runtime transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Confermando...' : 'Conferma GOL'}
        </button>
      </div>
    </div>
  );
} 