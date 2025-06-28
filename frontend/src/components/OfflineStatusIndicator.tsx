'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConflictData {
  id: string;
  type: string;
  localData: any;
  serverData: any;
  timestamp: number;
  status: 'PENDING' | 'RESOLVED';
}

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(0);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [currentConflict, setCurrentConflict] = useState<ConflictData | null>(null);

  useEffect(() => {
    // Network status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Conflict listeners
    const handleConflict = (event: CustomEvent) => {
      const conflict = event.detail;
      setConflicts(prev => [...prev, conflict]);
      setCurrentConflict(conflict);
      setShowConflictModal(true);
    };

    window.addEventListener('offline-conflict', handleConflict as EventListener);
    window.addEventListener('data-conflict', handleConflict as EventListener);

    // Load existing conflicts
    const storedConflicts = JSON.parse(localStorage.getItem('calcettinho_conflicts') || '[]');
    const dataConflicts = JSON.parse(localStorage.getItem('calcettinho_data_conflicts') || '[]');
    setConflicts([...storedConflicts, ...dataConflicts]);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-conflict', handleConflict as EventListener);
      window.removeEventListener('data-conflict', handleConflict as EventListener);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (queueCount > 0) return 'bg-yellow-500';
    if (conflicts.filter(c => c.status === 'PENDING').length > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (queueCount > 0) return `Sincronizzazione ${queueCount}`;
    if (conflicts.filter(c => c.status === 'PENDING').length > 0) return 'Conflitti';
    return 'Online';
  };

  const resolveConflict = (conflictId: string, resolution: 'LOCAL' | 'SERVER' | 'MERGE') => {
    if (!currentConflict) return;

    // Update conflict status
    const updatedConflicts = conflicts.map(c => 
      c.id === conflictId ? { ...c, status: 'RESOLVED' as const } : c
    );
    setConflicts(updatedConflicts);

    // Store resolution
    localStorage.setItem('calcettinho_conflicts', 
      JSON.stringify(updatedConflicts.filter(c => c.type !== 'data'))
    );
    localStorage.setItem('calcettinho_data_conflicts', 
      JSON.stringify(updatedConflicts.filter(c => c.type === 'data'))
    );

    console.log(`Conflict ${conflictId} resolved with ${resolution}`);
    
    setShowConflictModal(false);
    setCurrentConflict(null);
  };

  const pendingConflicts = conflicts.filter(c => c.status === 'PENDING');

  return (
    <>
      {/* Status Indicator */}
      <motion.div
        className="fixed top-4 right-4 z-50"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-800/90 backdrop-blur-sm border border-gray-600/50 cursor-pointer transition-all duration-200 hover:bg-gray-700/90"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`}></div>
          <span className="text-white text-sm font-medium">🌐</span>
          <span className="text-white text-sm">{getStatusText()}</span>
          
          {queueCount > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
              {queueCount}
            </span>
          )}
          
          {pendingConflicts.length > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {pendingConflicts.length}
            </span>
          )}
        </div>

        {/* Details Panel */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              className="absolute top-12 right-0 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-600/50 rounded-lg p-4 shadow-xl"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                🌐 Stato Connessione
              </h3>

              {/* Connection Status */}
              <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-300 mb-2">Stato:</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
                  <span className="text-white text-sm">{isOnline ? 'Connesso' : 'Disconnesso'}</span>
                </div>
              </div>

              {/* Queue Status */}
              <div className="mb-4 p-3 bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-300 mb-2">Coda Offline:</div>
                <div className="text-white">
                  {queueCount > 0 ? `${queueCount} azioni in coda` : 'Nessuna azione in coda'}
                </div>
              </div>

              {/* Conflicts Alert */}
              {pendingConflicts.length > 0 && (
                <div className="p-3 bg-orange-900/30 border border-orange-500/50 rounded-lg">
                  <div className="text-orange-400 text-sm font-medium mb-2">
                    ⚠️ {pendingConflicts.length} Conflitto{pendingConflicts.length > 1 ? 'i' : ''} da Risolvere
                  </div>
                  <button
                    onClick={() => {
                      setCurrentConflict(pendingConflicts[0]);
                      setShowConflictModal(true);
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 rounded transition-colors"
                  >
                    Risolvi Conflitti
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Conflict Resolution Modal */}
      <AnimatePresence>
        {showConflictModal && currentConflict && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white font-runtime">
                    🔀 Risolvi Conflitto
                  </h2>
                  <button
                    onClick={() => setShowConflictModal(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                    <h3 className="text-lg font-bold text-white mb-2">Tipo Conflitto:</h3>
                    <p className="text-gray-300">{currentConflict.type}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
                      <h4 className="text-blue-400 font-bold mb-2">📱 Dati Locali</h4>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-32">
                        {JSON.stringify(currentConflict.localData, null, 2)}
                      </pre>
                    </div>

                    <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4">
                      <h4 className="text-green-400 font-bold mb-2">🌐 Dati Server</h4>
                      <pre className="text-xs text-gray-300 overflow-auto max-h-32">
                        {JSON.stringify(currentConflict.serverData, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => resolveConflict(currentConflict.id, 'LOCAL')}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    📱 Usa Dati Locali
                  </button>
                  <button
                    onClick={() => resolveConflict(currentConflict.id, 'SERVER')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    🌐 Usa Dati Server
                  </button>
                  <button
                    onClick={() => resolveConflict(currentConflict.id, 'MERGE')}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    🔀 Merge Automatico
                  </button>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                  Conflitto rilevato: {new Date(currentConflict.timestamp).toLocaleString()}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 