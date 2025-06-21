'use client';

import { useState, useEffect } from 'react';
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import CampoCalcetto from "../components/CampoCalcetto";
import CreateMatchModal from "../components/CreateMatchModal";
import MatchResultModal from "../components/MatchResultModal";
import VotingModal from "../components/VotingModal";
import EditMatchModal from "../components/EditMatchModal";
import { Calendar, Users, Star, Plus, Trophy, Clock, Vote, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { useAuth } from "../contexts/AuthContext";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { motion } from 'framer-motion';
import ProtectedRoute from "../components/ProtectedRoute";

interface PlayerMatchStats {
  gol: number;
  assist: number;
  gialli: number;
  rossi: number;
}

interface Match {
  id: string;
  matchId: string;
  date: string;
  teamA: string[];
  teamB: string[];
  location: string;
  completed: boolean;
  scoreA?: number;
  scoreB?: number;
  teamAScorer?: string;
  teamBScorer?: string;
  assistA?: string;
  assistB?: string;
  playerStats?: { [email: string]: PlayerMatchStats };
  status: 'scheduled' | 'completed';
}

interface CampoPlayer {
  name: string;
  email: string;
}

export default function Matches() {
  const { userEmail } = useAuth();
  const { AdminOnly } = useAdminGuard();
  const [matches, setMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const [votedMatches, setVotedMatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch players
        const playersResponse = await fetch('/api/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setAllPlayers(playersData);
        }
        
        // Fetch matches
        const matchesResponse = await fetch('/api/matches');
        
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setMatches(matchesData);
          
          if (userEmail) {
            await checkUserVotes(matchesData, userEmail);
          }
        } else {
          setMatches([]);
        }
        
      } catch (error) {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userEmail]);

  const checkUserVotes = async (matchesData: Match[], userEmail: string) => {
    try {
      const completedMatches = matchesData.filter(match => match.completed);
      const votedSet = new Set<string>();
      
      // Controlla ogni partita completata
      for (const match of completedMatches) {
        try {
          const url = `/api/votes/check/${encodeURIComponent(userEmail)}/${match.matchId}`;
          
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.hasVoted) {
              votedSet.add(match.matchId);
            }
          }
        } catch (error) {
          console.log(`❌ Errore nel controllo voti per partita ${match.matchId}:`, error);
        }
      }
      
      setVotedMatches(votedSet);
    } catch (error) {
      console.error('❌ Errore generale nel controllo voti utente:', error);
    }
  };

  const refreshMatches = async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.ok) {
        const matchesData = await response.json();
        
        // ✅ NUOVO: Ordinamento cronologico di backup nel frontend
        const sortedMatches = matchesData.sort((a: Match, b: Match) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB.getTime() - dateA.getTime(); // Prima le più recenti
        });
        
        setMatches(sortedMatches);
        
        if (userEmail) {
          await checkUserVotes(sortedMatches, userEmail);
        }
      }
    } catch (error) {
      console.error('Errore nel refresh delle partite:', error);
    }
  };

  const getPlayerName = (email: string): string => {
    const player = allPlayers.find(p => p.email === email);
    return player?.nome || email.split('@')[0] || 'Giocatore';
  };

  const convertEmailsToPlayers = (emails: string[]): CampoPlayer[] => {
    return emails.slice(0, 5).map(email => ({
      name: getPlayerName(email),
      email: email
    }));
  };

  const filteredMatches = matches.filter(match => {
    if (activeTab === 'upcoming') return !match.completed;
    if (activeTab === 'completed') return match.completed;
    return true;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data non impostata';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const handleNewMatch = () => {
    setShowCreateModal(true);
  };

  const handleMatchAction = async (action: string, matchId: string) => {
    const match = matches.find(m => m.matchId === matchId);
    
    if (!match) {
      alert('Partita non trovata!');
      return;
    }

    switch(action) {
      case 'start':
        setSelectedMatch(match);
        setShowResultModal(true);
        break;
      case 'edit':
        setSelectedMatch(match);
        setShowEditModal(true);
        break;
      case 'vote':
        if (!userEmail || (![...match.teamA, ...match.teamB].includes(userEmail))) {
          alert('Puoi votare solo per le partite a cui hai partecipato!');
          return;
        }
        setSelectedMatch(match);
        setShowVotingModal(true);
        break;
      case 'view':
        let detailsText = `📊 Dettagli partita:

Data: ${formatDate(match.date)}
Luogo: ${match.location}
Squadra A: ${match.teamA.map(email => getPlayerName(email)).join(', ')}
Squadra B: ${match.teamB.map(email => getPlayerName(email)).join(', ')}

`;

        if (match.completed) {
          detailsText += `Risultato: ${match.scoreA} - ${match.scoreB}\n\n`;
          
          if (match.playerStats) {
            detailsText += `🔴 SQUADRA A:\n`;
            match.teamA.forEach(email => {
              const playerName = getPlayerName(email);
              const stats = match.playerStats![email];
              if (stats && (stats.gol > 0 || stats.assist > 0 || stats.gialli > 0 || stats.rossi > 0)) {
                detailsText += `  ${playerName}: `;
                const statsList = [];
                if (stats.gol > 0) statsList.push(`⚽${stats.gol}`);
                if (stats.assist > 0) statsList.push(`🅰️${stats.assist}`);
                if (stats.gialli > 0) statsList.push(`🟨${stats.gialli}`);
                if (stats.rossi > 0) statsList.push(`🟥${stats.rossi}`);
                detailsText += statsList.join(' ') + '\n';
              }
            });
            
            detailsText += `\n🔵 SQUADRA B:\n`;
            match.teamB.forEach(email => {
              const playerName = getPlayerName(email);
              const stats = match.playerStats![email];
              if (stats && (stats.gol > 0 || stats.assist > 0 || stats.gialli > 0 || stats.rossi > 0)) {
                detailsText += `  ${playerName}: `;
                const statsList = [];
                if (stats.gol > 0) statsList.push(`⚽${stats.gol}`);
                if (stats.assist > 0) statsList.push(`🅰️${stats.assist}`);
                if (stats.gialli > 0) statsList.push(`🟨${stats.gialli}`);
                if (stats.rossi > 0) statsList.push(`🟥${stats.rossi}`);
                detailsText += statsList.join(' ') + '\n';
              }
            });
          } else {
            detailsText += `Marcatori A: ${match.teamAScorer ? getPlayerName(match.teamAScorer) : 'Nessuno'}
Marcatori B: ${match.teamBScorer ? getPlayerName(match.teamBScorer) : 'Nessuno'}
Assist A: ${match.assistA ? getPlayerName(match.assistA) : 'Nessuno'}
Assist B: ${match.assistB ? getPlayerName(match.assistB) : 'Nessuno'}`;
          }
        } else {
          detailsText += 'Partita non ancora completata';
        }
        
        alert(detailsText);
        break;
      case 'delete':
        if (confirm('Sei sicuro di voler eliminare questa partita?')) {
          try {
            const response = await fetch(`/api/matches/${matchId}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              alert('✅ Partita eliminata con successo!');
              refreshMatches();
            } else {
              alert('❌ Errore nell\'eliminazione della partita');
            }
          } catch (error) {
            console.error('Errore nell\'eliminazione:', error);
            alert('❌ Errore nell\'eliminazione della partita');
          }
        }
        break;
      default:
        alert(`🔧 Azione ${action} per partita ${matchId} - Funzione in sviluppo!`);
    }
  };

  const toggleExpandMatch = (matchId: string) => {
    setExpandedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        newSet.add(matchId);
      }
      return newSet;
    });
  };

  const CompactMatchCard = ({ match }: { match: Match }) => {
    const isExpanded = expandedMatches.has(match.matchId);
    const allPlayers = [...match.teamA, ...match.teamB];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700/50 overflow-hidden"
      >
        <div 
          onClick={() => toggleExpandMatch(match.matchId)}
          className="p-4 cursor-pointer hover:bg-gray-700/30 transition-colors duration-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-green-400" />
                <span className="text-gray-300 font-runtime text-sm">
                  {formatDate(match.date)}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-red-400 font-runtime font-semibold text-xs">Rossi</div>
                  <div className="text-xl font-bold text-white font-runtime">
                    {match.scoreA ?? 0}
                  </div>
                </div>
                <span className="text-gray-400 font-runtime">-</span>
                <div className="text-center">
                  <div className="text-blue-400 font-runtime font-semibold text-xs">Blu</div>
                  <div className="text-xl font-bold text-white font-runtime">
                    {match.scoreB ?? 0}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-gray-300 font-runtime text-sm">
                  {allPlayers.slice(0, 3).map(email => getPlayerName(email)).join(', ')}
                  {allPlayers.length > 3 && ` +${allPlayers.length - 3}`}
                </span>
              </div>
              
              <div className="flex items-center text-gray-400">
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
              </div>
            </div>
          </div>
          
          <div className="md:hidden mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="text-gray-300 font-runtime text-sm">
                {allPlayers.slice(0, 2).map(email => getPlayerName(email)).join(', ')}
                {allPlayers.length > 2 && ` +${allPlayers.length - 2}`}
              </span>
            </div>
            <span className="text-xs text-gray-500 font-runtime">
              Clicca per {isExpanded ? 'chiudere' : 'aprire'}
            </span>
          </div>
        </div>
        
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-700/50"
          >
            <div className="p-6">
              <div className="flex justify-center items-center gap-8 mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300 font-runtime text-sm">
                    {match.location}
                  </span>
                </div>
                <div className="inline-flex px-3 py-1 rounded-full text-xs font-runtime font-semibold bg-green-900/50 text-green-400 border border-green-400/30">
                  Completata
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start mb-6">
                <div className="lg:col-span-1 bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                  <h3 className="text-base font-semibold text-red-400 mb-2 font-runtime text-center">
                    Team Rosso
                  </h3>
                  <div className="space-y-1">
                    {match.teamA.map((email, idx) => (
                      <div key={idx} className="bg-red-900/30 p-2 rounded text-center">
                        <span className="text-white text-xs font-runtime">
                          {getPlayerName(email)}
                        </span>
                        {match.completed && match.playerStats && match.playerStats[email] && (
                          <div className="mt-1 text-xs space-y-0.5 flex flex-col items-center">
                            {match.playerStats[email].gol > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">⚽</div>
                                <div className="text-center">{match.playerStats[email].gol}</div>
                              </div>
                            )}
                            {match.playerStats[email].assist > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">
                                  <span className="w-3 h-3 bg-green-500 text-white text-xs flex items-center justify-center rounded font-bold leading-none">A</span>
                                </div>
                                <div className="text-center">{match.playerStats[email].assist}</div>
                              </div>
                            )}
                            {match.playerStats[email].gialli > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">🟨</div>
                                <div className="text-center">{match.playerStats[email].gialli}</div>
                              </div>
                            )}
                            {match.playerStats[email].rossi > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">🟥</div>
                                <div className="text-center">{match.playerStats[email].rossi}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-3 flex flex-col items-center">
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <div className="text-red-400 font-runtime font-semibold text-sm mb-1">Team Rosso</div>
                        <div className="text-2xl md:text-3xl font-bold text-white font-runtime">
                          {match.scoreA ?? 0}
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <Trophy className="w-6 h-6 text-yellow-400 mb-1" />
                        <span className="text-xl md:text-2xl font-bold text-gray-400 font-runtime">VS</span>
                      </div>
                      <div className="text-center">
                        <div className="text-blue-400 font-runtime font-semibold text-sm mb-1">Team Blu</div>
                        <div className="text-2xl md:text-3xl font-bold text-white font-runtime">
                          {match.scoreB ?? 0}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-full max-w-lg">
                    <CampoCalcetto
                      team1={convertEmailsToPlayers(match.teamA)}
                      team2={convertEmailsToPlayers(match.teamB)}
                      team1Name="Team Rosso"
                      team2Name="Team Blu"
                    />
                  </div>
                </div>

                <div className="lg:col-span-1 bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                  <h3 className="text-base font-semibold text-blue-400 mb-2 font-runtime text-center">
                    Team Blu
                  </h3>
                  <div className="space-y-1">
                    {match.teamB.map((email, idx) => (
                      <div key={idx} className="bg-blue-900/30 p-2 rounded text-center">
                        <span className="text-white text-xs font-runtime">
                          {getPlayerName(email)}
                        </span>
                        {match.completed && match.playerStats && match.playerStats[email] && (
                          <div className="mt-1 text-xs space-y-0.5 flex flex-col items-center">
                            {match.playerStats[email].gol > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">⚽</div>
                                <div className="text-center">{match.playerStats[email].gol}</div>
                              </div>
                            )}
                            {match.playerStats[email].assist > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">
                                  <span className="w-3 h-3 bg-green-500 text-white text-xs flex items-center justify-center rounded font-bold leading-none">A</span>
                                </div>
                                <div className="text-center">{match.playerStats[email].assist}</div>
                              </div>
                            )}
                            {match.playerStats[email].gialli > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">🟨</div>
                                <div className="text-center">{match.playerStats[email].gialli}</div>
                              </div>
                            )}
                            {match.playerStats[email].rossi > 0 && (
                              <div className="grid grid-cols-2 gap-0.5 text-red-300 items-center">
                                <div className="text-center w-4 flex justify-center">🟥</div>
                                <div className="text-center">{match.playerStats[email].rossi}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                  {userEmail && [...match.teamA, ...match.teamB].includes(userEmail) && (
                    // ✅ Controllo se l'utente ha già votato per questa partita
                    (() => {
                      const hasVoted = votedMatches.has(match.matchId);
                      
                      return hasVoted ? (
                        <button
                          disabled
                          className="flex-1 bg-gray-600 text-gray-300 px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-not-allowed"
                        >
                          <Check className="w-5 h-5" />
                          Voti Inviati
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMatchAction('vote', match.matchId)}
                          className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <Vote className="w-5 h-5" />
                          Vota Ora
                        </button>
                      );
                    })()
                  )}
                  <AdminOnly>
                    <button
                      onClick={() => handleMatchAction('edit', match.matchId)}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Modifica
                    </button>
                  </AdminOnly>
                  <AdminOnly>
                    <button
                      onClick={() => handleMatchAction('delete', match.matchId)}
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Elimina
                    </button>
                  </AdminOnly>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-black">
        {/* Background Pattern rimosso per OLED */}
        <div className="absolute inset-0 bg-black pointer-events-none z-0"></div>
        
        <div className="relative z-10 pointer-events-auto">
          <Navigation />
          
          {/* Header */}
          <section className="pt-1 lg:pt-24 pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-6xl font-bold font-runtime text-white mb-6 drop-shadow-lg">
                  Gestione <span className="text-green-400">Partite</span>
                </h1>
                <p className="text-xl text-gray-300 font-runtime max-w-3xl mx-auto drop-shadow-md">
                  Organizza partite, forma squadre e tieni traccia di tutti i risultati
                </p>
              </motion.div>
            </div>
          </section>

          {/* Tabs */}
          <section className="pb-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-center space-x-1 bg-gray-800/50 p-1 rounded-lg backdrop-blur-sm mb-6 relative z-20">
                <button
                  onClick={() => {
                    setActiveTab('upcoming');
                  }}
                  className={`px-6 py-3 rounded-md font-runtime font-semibold transition-all duration-300 cursor-pointer pointer-events-auto relative z-30 ${
                    activeTab === 'upcoming' 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Clock className="w-4 h-4 inline mr-2" />
                  Prossime
                </button>
                <button
                  onClick={() => {
                    setActiveTab('completed');
                  }}
                  className={`px-6 py-3 rounded-md font-runtime font-semibold transition-all duration-300 cursor-pointer pointer-events-auto relative z-30 ${
                    activeTab === 'completed' 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Trophy className="w-4 h-4 inline mr-2" />
                  Completate
                </button>
                <button
                  onClick={() => {
                    setActiveTab('all');
                  }}
                  className={`px-6 py-3 rounded-md font-runtime font-semibold transition-all duration-300 cursor-pointer pointer-events-auto relative z-30 ${
                    activeTab === 'all' 
                      ? 'bg-green-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Tutte
                </button>
              </div>

              {/* New Match Button */}
              <AdminOnly>
                <div className="text-center mb-8 relative z-20">
                  <button
                    onClick={handleNewMatch}
                    className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-runtime font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer pointer-events-auto relative z-30"
                  >
                    <Plus className="w-5 h-5 inline mr-2" />
                    Nuova Partita
                  </button>
                </div>
              </AdminOnly>
            </div>
          </section>

          {/* Matches List */}
          <section className="pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
                  <p className="text-gray-300 mt-4 font-runtime">Caricamento partite...</p>
                </div>
              ) : filteredMatches.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-runtime text-gray-300 mb-2">
                    Nessuna partita {activeTab === 'upcoming' ? 'programmata' : activeTab === 'completed' ? 'completata' : 'trovata'}
                  </h3>
                  <p className="text-gray-500 font-runtime">
                    {activeTab === 'upcoming' && 'Crea una nuova partita per iniziare!'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredMatches.map((match, index) => (
                    match.completed ? (
                      <CompactMatchCard key={match.id} match={match} />
                    ) : (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.1 }}
                        className="bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-700/50"
                      >
                        <div className="flex justify-center items-center gap-8 mb-6">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-green-400" />
                            <span className="text-gray-300 font-runtime text-sm">
                              {formatDate(match.date)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-400" />
                            <span className="text-gray-300 font-runtime text-sm">
                              {match.location}
                            </span>
                          </div>
                          <div className="inline-flex px-3 py-1 rounded-full text-xs font-runtime font-semibold bg-blue-900/50 text-blue-400 border border-blue-400/30">
                            Programmata
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start mb-6">
                          <div className="lg:col-span-1 bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                            <h3 className="text-base font-semibold text-red-400 mb-2 font-runtime text-center">
                              Team Rosso
                            </h3>
                            <div className="space-y-1">
                              {match.teamA.map((email, idx) => (
                                <div key={idx} className="bg-red-900/30 p-2 rounded text-center">
                                  <span className="text-white text-xs font-runtime">
                                    {getPlayerName(email)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="lg:col-span-3 flex flex-col items-center">
                            <div className="w-full max-w-lg">
                              <CampoCalcetto
                                team1={convertEmailsToPlayers(match.teamA)}
                                team2={convertEmailsToPlayers(match.teamB)}
                                team1Name="Team Rosso"
                                team2Name="Team Blu"
                              />
                            </div>
                          </div>

                          <div className="lg:col-span-1 bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">
                            <h3 className="text-base font-semibold text-blue-400 mb-2 font-runtime text-center">
                              Team Blu
                            </h3>
                            <div className="space-y-1">
                              {match.teamB.map((email, idx) => (
                                <div key={idx} className="bg-blue-900/30 p-2 rounded text-center">
                                  <span className="text-white text-xs font-runtime">
                                    {getPlayerName(email)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-center">
                          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
                            <AdminOnly>
                              <button
                                onClick={() => handleMatchAction('start', match.matchId)}
                                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                              >
                                <Trophy className="w-5 h-5" />
                                Partita Terminata
                              </button>
                            </AdminOnly>
                            <AdminOnly>
                              <button
                                onClick={() => handleMatchAction('edit', match.matchId)}
                                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                              >
                                Modifica
                              </button>
                            </AdminOnly>
                            <AdminOnly>
                              <button
                                onClick={() => handleMatchAction('delete', match.matchId)}
                                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-runtime font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                              >
                                Elimina
                              </button>
                            </AdminOnly>
                          </div>
                        </div>
                      </motion.div>
                    )
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Footer spacer per navbar mobile */}
          <div className="h-20 sm:h-8"></div>
        </div>

        {/* Modali */}
        <CreateMatchModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshMatches}
        />

        <MatchResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          onSuccess={refreshMatches}
          match={selectedMatch}
        />

        <VotingModal
          isOpen={showVotingModal}
          onClose={() => setShowVotingModal(false)}
          match={selectedMatch}
          voterEmail={userEmail || ''}
          allPlayers={allPlayers.map(p => ({ name: p.nome, email: p.email }))}
          onSuccess={async () => {
            console.log('🎉 Voti inviati con successo! Ricaricando stato...');
            
            // ✅ Forza subito l'aggiunta della partita ai voti inviati
            if (selectedMatch && userEmail) {
              setVotedMatches(prev => {
                const newSet = new Set(prev);
                newSet.add(selectedMatch.matchId);
                console.log('🔄 Aggiunta manuale partita ai voti:', selectedMatch.matchId);
                return newSet;
              });
              
              // ✅ Poi ricarica tutto per sicurezza
              setTimeout(async () => {
                await refreshMatches();
              }, 500);
            }
            
            alert('🎉 Voti inviati con successo!');
          }}
        />

        <EditMatchModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          match={selectedMatch}
          allPlayers={allPlayers.map(p => ({ nome: p.nome, email: p.email }))}
          onSuccess={refreshMatches}
        />
      </div>
    </ProtectedRoute>
  );
} 