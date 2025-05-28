'use client';

import { useState, useEffect } from 'react';
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import CampoCalcetto from "../components/CampoCalcetto";
import { Calendar, Users, Star } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import { motion } from 'framer-motion';

interface Match {
  id: string;
  date: string;
  teamA: string[];
  teamB: string[];
  location: string;
  completed: boolean;
}

interface CampoPlayer {
  name: string;
  email: string;
}

export default function Matches() {
  const { userEmail } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'all'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testCount, setTestCount] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration - solo client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const playersResponse = await fetch('/api/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setAllPlayers(playersData);
        }
        
        const matchesResponse = await fetch('/api/matches');
        if (matchesResponse.ok) {
          const matchesData = await matchesResponse.json();
          setMatches(matchesData);
        } else {
          const mockMatches = [
            {
              id: '1',
              date: '2024-01-15',
              teamA: ['player1@test.com', 'player2@test.com'],
              teamB: ['player3@test.com', 'player4@test.com'],
              location: 'Campo Centrale',
              completed: true
            }
          ];
          setMatches(mockMatches);
        }
        
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    console.log('🎉 New match button clicked - Z-INDEX FIXED!');
    setShowCreateModal(true);
  };

  const handleMatchAction = (action: string, matchId: string) => {
    console.log(`🎯 ${action} for match ${matchId} - Z-INDEX FIXED!`);
    alert(`${action} partita ${matchId} - Pulsanti funzionanti!`);
  };

  const addLog = (message: string) => {
    const newLog = `${logs.length + 1}: ${message}`;
    setLogs(prev => [newLog, ...prev.slice(0, 4)]);
    console.log(`🔥 ${message}`);
  };

  const handleTestClick = () => {
    addLog(`TEST BUTTON CLICKED! Count: ${testCount}`);
    alert(`Test clicked! Count: ${testCount}`);
    setTestCount(testCount + 1);
  };

  const handleClearLogs = () => {
    setLogs([]);
    addLog('Logs cleared');
  };

  const handleForceReload = () => {
    addLog('Force reload triggered');
    window.location.reload();
  };

  if (!isClient) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#1f2937', 
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#1f2937', 
      color: 'white'
    }}>
      
      {/* Navigation */}
      <Navigation />
      
      <div style={{
        paddingTop: '100px',
        padding: '20px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        
        <h1 style={{ 
          fontSize: '3rem', 
          textAlign: 'center',
          marginBottom: '30px',
          color: '#EF4444'
        }}>
          🔧 HYDRATION FIXED
        </h1>
        
        <div style={{
          backgroundColor: '#374151',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '30px',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '1.2rem', marginBottom: '20px' }}>
            Test Count: <span style={{ color: '#10B981', fontWeight: 'bold' }}>{testCount}</span>
          </p>
          
          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            
            <button 
              onClick={handleTestClick}
              style={{
                backgroundColor: '#EF4444',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              🔴 Test Counter ({testCount})
            </button>
            
            <button 
              onClick={handleClearLogs}
              style={{
                backgroundColor: '#F59E0B',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              🧹 Clear Logs
            </button>
            
            <button 
              onClick={handleForceReload}
              style={{
                backgroundColor: '#3B82F6',
                color: 'white',
                padding: '15px 30px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              🔄 Reload
            </button>
            
          </div>
        </div>

        {/* Live logs */}
        <div style={{
          backgroundColor: '#111827',
          padding: '20px',
          borderRadius: '10px',
          marginBottom: '30px'
        }}>
          <h3 style={{ color: '#10B981', marginBottom: '15px' }}>📝 Live Logs:</h3>
          {logs.length === 0 ? (
            <p style={{ color: '#6B7280', fontStyle: 'italic' }}>Nessun log ancora...</p>
          ) : (
            <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
              {logs.map((log, index) => (
                <div key={index} style={{ 
                  color: '#D1D5DB', 
                  marginBottom: '5px',
                  padding: '5px',
                  backgroundColor: index === 0 ? '#1F2937' : 'transparent',
                  borderRadius: '4px'
                }}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnostics */}
        <div style={{
          backgroundColor: '#16A34A',
          padding: '20px',
          borderRadius: '10px',
          border: '1px solid #22C55E'
        }}>
          <h3 style={{ color: '#DCFCE7', marginBottom: '15px' }}>🎉 PROBLEMI RISOLTI:</h3>
          
          <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ margin: '5px 0' }}>
              ✅ <strong>Hydration Error:</strong> FIXATO - no più Date.now()
            </p>
            <p style={{ margin: '5px 0' }}>
              ✅ <strong>Z-Index:</strong> FIXATO - navbar z-10
            </p>
            <p style={{ margin: '5px 0' }}>
              🔍 <strong>Test:</strong> Click sui pulsanti dovrebbe funzionare
            </p>
            <p style={{ margin: '5px 0' }}>
              📊 <strong>Current Count:</strong> {testCount}
            </p>
          </div>
        </div>

        {/* Quick restart guide */}
        <div style={{
          backgroundColor: '#1F2937',
          padding: '15px',
          borderRadius: '10px',
          marginTop: '20px',
          fontSize: '12px',
          color: '#9CA3AF'
        }}>
          <p><strong>🚀 RESTART SERVER:</strong> Se ancora non funziona, riavvia il server completamente.</p>
          <p>L'errore di hydration può persistere in cache fino al restart.</p>
        </div>
      </div>
    </div>
  );
} 