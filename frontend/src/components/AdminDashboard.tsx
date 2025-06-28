// 🎯 FASE 4.2: PERFORMANCE ANALYTICS & MONITORING - Admin Dashboard
// Dashboard completo per monitoraggio PWA e performance analytics

'use client';

import React, { useState, useEffect } from 'react';
import { PerformanceMonitor, PerformanceMetrics, PerformanceAlert, AlertSeverity } from '../utils/performanceMonitor';
import { OfflineStatsCalculator, GlobalStats, PlayerStats } from '../utils/offlineStatsCalculator';
import { OfflineMatchManager } from '../utils/offlineMatchManager';
import { SmartCache } from '../utils/smartCache';

interface AdminDashboardProps {
  className?: string;
}

interface DashboardTab {
  id: string;
  label: string;
  icon: string;
}

const DASHBOARD_TABS: DashboardTab[] = [
  { id: 'overview', label: 'Panoramica', icon: '📊' },
  { id: 'performance', label: 'Performance', icon: '⚡' },
  { id: 'cache', label: 'Cache', icon: '🗄️' },
  { id: 'realtime', label: 'Real-Time', icon: '📡' },
  { id: 'users', label: 'Utenti', icon: '👥' },
  { id: 'matches', label: 'Partite', icon: '⚽' },
  { id: 'alerts', label: 'Avvisi', icon: '⚠️' }
];

// 📱 AdminDashboard Component
export default function AdminDashboard({ className = '' }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Managers
  const performanceMonitor = PerformanceMonitor.getInstance();
  const statsCalculator = OfflineStatsCalculator.getInstance();
  const matchManager = OfflineMatchManager.getInstance();

  // 🔄 Data loading
  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh ogni 30 secondi
    const interval = setInterval(loadDashboardData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load performance metrics
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      setMetrics(currentMetrics);

      // Load global stats
      const stats = await statsCalculator.getGlobalStats();
      setGlobalStats(stats);

      // Load alerts
      const currentAlerts = performanceMonitor.getAlerts();
      setAlerts(currentAlerts);

    } catch (error) {
      console.error('❌ [AdminDashboard] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🎨 Rendering helpers
  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* PWA Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Stato PWA</p>
            <p className="text-2xl font-bold text-green-600">
              {metrics?.pwaMetrics.serviceWorkerActive ? 'Attiva' : 'Inattiva'}
            </p>
          </div>
          <div className="text-3xl">📱</div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Service Worker:</span>
            <span className={metrics?.pwaMetrics.serviceWorkerActive ? 'text-green-600' : 'text-red-600'}>
              {metrics?.pwaMetrics.serviceWorkerActive ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Push Notifications:</span>
            <span className={metrics?.pwaMetrics.pushNotificationsEnabled ? 'text-green-600' : 'text-yellow-600'}>
              {metrics?.pwaMetrics.pushNotificationsEnabled ? '✅' : '⚠️'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Offline Capable:</span>
            <span className={metrics?.pwaMetrics.offlineCapable ? 'text-green-600' : 'text-red-600'}>
              {metrics?.pwaMetrics.offlineCapable ? '✅' : '❌'}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Score */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Core Web Vitals</p>
            <p className="text-2xl font-bold text-blue-600">
              {getPerformanceScore()}
            </p>
          </div>
          <div className="text-3xl">⚡</div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>LCP:</span>
            <span className={getLCPColor()}>
              {(metrics?.pageLoad.lcp || 0).toFixed(0)}ms
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>FID:</span>
            <span className={getFIDColor()}>
              {(metrics?.pageLoad.fid || 0).toFixed(0)}ms
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span>CLS:</span>
            <span className={getCLSColor()}>
              {(metrics?.pageLoad.cls || 0).toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      {/* Cache Efficiency */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Cache Hit Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {(metrics?.cacheEfficiency.overallHitRate || 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-3xl">🗄️</div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Storage Used:</span>
            <span>{formatBytes(metrics?.cacheEfficiency.totalStorageUsed || 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Cache Size:</span>
            <span>{metrics?.cacheEfficiency.cacheSize || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Evictions:</span>
            <span>{metrics?.cacheEfficiency.evictionCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Avvisi Attivi</p>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter(a => !a.resolved).length}
            </p>
          </div>
          <div className="text-3xl">⚠️</div>
        </div>
        <div className="mt-4">
          {alerts.filter(a => !a.resolved).slice(0, 3).map(alert => (
            <div key={alert.id} className="flex items-center space-x-2 text-sm mb-1">
              <span className={`w-2 h-2 rounded-full ${getAlertColor(alert.severity)}`}></span>
              <span className="truncate">{alert.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      {/* Core Web Vitals Chart */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Core Web Vitals</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className={`text-4xl font-bold ${getLCPColor()}`}>
              {(metrics?.pageLoad.lcp || 0).toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-500 mt-1">Largest Contentful Paint</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${getLCPColor().includes('green') ? 'bg-green-500' : 
                  getLCPColor().includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((metrics?.pageLoad.lcp || 0) / 4000 * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-4xl font-bold ${getFIDColor()}`}>
              {(metrics?.pageLoad.fid || 0).toFixed(0)}ms
            </div>
            <div className="text-sm text-gray-500 mt-1">First Input Delay</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${getFIDColor().includes('green') ? 'bg-green-500' : 
                  getFIDColor().includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((metrics?.pageLoad.fid || 0) / 300 * 100, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div className="text-center">
            <div className={`text-4xl font-bold ${getCLSColor()}`}>
              {(metrics?.pageLoad.cls || 0).toFixed(3)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Cumulative Layout Shift</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${getCLSColor().includes('green') ? 'bg-green-500' : 
                  getCLSColor().includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min((metrics?.pageLoad.cls || 0) / 0.25 * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Load Metrics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Metriche di Caricamento Pagina</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">TTFB</p>
            <p className="text-2xl font-bold">{(metrics?.pageLoad.ttfb || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">DOM Content Loaded</p>
            <p className="text-2xl font-bold">{(metrics?.pageLoad.domContentLoaded || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Load Complete</p>
            <p className="text-2xl font-bold">{(metrics?.pageLoad.loadComplete || 0).toFixed(0)}ms</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Resources</p>
            <p className="text-2xl font-bold">{metrics?.pageLoad.resourceCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Network Performance */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Performance di Rete</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Connection Type</p>
            <p className="text-lg font-semibold">{metrics?.networkPerformance.connectionType || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Effective Type</p>
            <p className="text-lg font-semibold">{metrics?.networkPerformance.effectiveType || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Downlink</p>
            <p className="text-lg font-semibold">{(metrics?.networkPerformance.downlink || 0).toFixed(1)} Mbps</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">RTT</p>
            <p className="text-lg font-semibold">{metrics?.networkPerformance.rtt || 0}ms</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCacheTab = () => (
    <div className="space-y-6">
      {/* Cache Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Panoramica Cache</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Hit Rate Generale</p>
            <p className="text-3xl font-bold text-green-600">
              {(metrics?.cacheEfficiency.overallHitRate || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Dimensione Cache</p>
            <p className="text-2xl font-bold">{metrics?.cacheEfficiency.cacheSize || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Evictions</p>
            <p className="text-2xl font-bold text-orange-600">{metrics?.cacheEfficiency.evictionCount || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Compression Ratio</p>
            <p className="text-2xl font-bold text-blue-600">
              {(metrics?.cacheEfficiency.compressionRatio || 0).toFixed(2)}x
            </p>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Utilizzo Storage</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">IndexedDB</span>
              <span className="text-sm text-gray-500">
                {formatBytes(metrics?.cacheEfficiency.indexedDBUsage || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${getStoragePercentage('indexedDB')}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">LocalStorage</span>
              <span className="text-sm text-gray-500">
                {formatBytes(metrics?.cacheEfficiency.localStorageUsage || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${getStoragePercentage('localStorage')}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Cache API</span>
              <span className="text-sm text-gray-500">
                {formatBytes(metrics?.cacheEfficiency.cacheAPIUsage || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${getStoragePercentage('cacheAPI')}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cache Performance */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Cache</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Tempo Medio Retrieval</p>
            <p className="text-2xl font-bold">
              {(metrics?.cacheEfficiency.cacheRetrievalTime || 0).toFixed(1)}ms
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tempo Medio Storage</p>
            <p className="text-2xl font-bold">
              {(metrics?.cacheEfficiency.cacheStorageTime || 0).toFixed(1)}ms
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRealTimeTab = () => (
    <div className="space-y-6">
      {/* Real-Time Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Stato Real-Time</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">WebSocket Status</p>
            <p className={`text-lg font-semibold ${
              metrics?.realTimeMetrics.webSocketStatus === 'connected' ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics?.realTimeMetrics.webSocketStatus || 'disconnected'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Connection Uptime</p>
            <p className="text-lg font-semibold">
              {formatDuration(metrics?.realTimeMetrics.connectionUptime || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Reconnections</p>
            <p className="text-lg font-semibold text-orange-600">
              {metrics?.realTimeMetrics.reconnectionCount || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Latency</p>
            <p className="text-lg font-semibold">
              {(metrics?.realTimeMetrics.averageLatency || 0).toFixed(0)}ms
            </p>
          </div>
        </div>
      </div>

      {/* Message Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Statistiche Messaggi</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Messaggi Inviati</p>
            <p className="text-3xl font-bold text-blue-600">
              {metrics?.realTimeMetrics.messagesSent || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Messaggi Ricevuti</p>
            <p className="text-3xl font-bold text-green-600">
              {metrics?.realTimeMetrics.messagesReceived || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Subscription Status</p>
            <p className={`text-lg font-semibold ${
              metrics?.realTimeMetrics.subscriptionSuccess ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics?.realTimeMetrics.subscriptionSuccess ? 'Active' : 'Inactive'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Notifications Sent</p>
            <p className="text-2xl font-bold">{metrics?.realTimeMetrics.notificationsSent || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Engagement Rate</p>
            <p className="text-2xl font-bold text-purple-600">
              {(metrics?.realTimeMetrics.notificationEngagementRate || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      {/* User Experience Overview */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Panoramica Esperienza Utente</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Session Duration</p>
            <p className="text-2xl font-bold">
              {formatDuration(metrics?.userExperience.averageSessionLength || 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Interactions</p>
            <p className="text-2xl font-bold">{metrics?.userExperience.totalInteractions || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Page Views</p>
            <p className="text-2xl font-bold">{metrics?.userExperience.pageViewsPerSession || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Error Count</p>
            <p className="text-2xl font-bold text-red-600">{metrics?.userExperience.errorCount || 0}</p>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Risorse di Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">JS Heap Used</p>
            <p className="text-xl font-bold">
              {formatBytes(metrics?.systemResources.jsHeapSizeUsed || 0)}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min(
                    ((metrics?.systemResources.jsHeapSizeUsed || 0) / 
                     (metrics?.systemResources.jsHeapSizeLimit || 1)) * 100, 
                    100
                  )}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Storage Used</p>
            <p className="text-xl font-bold">
              {formatBytes(metrics?.systemResources.storageUsage || 0)}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min(
                    ((metrics?.systemResources.storageUsage || 0) / 
                     (metrics?.systemResources.storageQuota || 1)) * 100, 
                    100
                  )}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Long Tasks</p>
            <p className="text-xl font-bold text-orange-600">
              {metrics?.systemResources.longTaskCount || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Device Information */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Informazioni Dispositivo</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Device Type:</span>
            <span className="ml-2">{metrics?.systemResources.deviceType || 'Unknown'}</span>
          </div>
          <div>
            <span className="font-medium">Platform:</span>
            <span className="ml-2">{metrics?.systemResources.platform || 'Unknown'}</span>
          </div>
          <div>
            <span className="font-medium">Screen Resolution:</span>
            <span className="ml-2">{metrics?.systemResources.screenResolution || 'Unknown'}</span>
          </div>
          <div>
            <span className="font-medium">Battery Level:</span>
            <span className="ml-2">
              {metrics?.systemResources.batteryLevel ? 
                `${(metrics.systemResources.batteryLevel * 100).toFixed(0)}%` : 'Unknown'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMatchesTab = () => (
    <div className="space-y-6">
      {/* Global Stats */}
      {globalStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Statistiche Globali Partite</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Partite Totali</p>
              <p className="text-3xl font-bold text-blue-600">{globalStats.totalMatches}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Goal Totali</p>
              <p className="text-3xl font-bold text-green-600">{globalStats.totalGoals}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Giocatori Attivi</p>
              <p className="text-3xl font-bold text-purple-600">{globalStats.totalPlayers}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Media Goal/Partita</p>
              <p className="text-3xl font-bold text-orange-600">
                {globalStats.averageGoalsPerMatch.toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Performers */}
      {globalStats && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">🥇 Top Scorers</h4>
              {globalStats.topScorers.slice(0, 5).map((entry, index) => (
                <div key={entry.email} className="flex justify-between items-center py-1">
                  <span className="text-sm">{index + 1}. {entry.name}</span>
                  <span className="font-bold text-green-600">{entry.value}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-3">🎯 Top Assists</h4>
              {globalStats.topAssisters.slice(0, 5).map((entry, index) => (
                <div key={entry.email} className="flex justify-between items-center py-1">
                  <span className="text-sm">{index + 1}. {entry.name}</span>
                  <span className="font-bold text-blue-600">{entry.value}</span>
                </div>
              ))}
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-3">⭐ Top Rated</h4>
              {globalStats.topRated.slice(0, 5).map((entry, index) => (
                <div key={entry.email} className="flex justify-between items-center py-1">
                  <span className="text-sm">{index + 1}. {entry.name}</span>
                  <span className="font-bold text-purple-600">{entry.value.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAlertsTab = () => (
    <div className="space-y-6">
      {/* Active Alerts */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Avvisi Attivi</h3>
        {alerts.filter(alert => !alert.resolved).length > 0 ? (
          <div className="space-y-3">
            {alerts.filter(alert => !alert.resolved).map(alert => (
              <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${getAlertBackgroundColor(alert.severity)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${getAlertDotColor(alert.severity)}`}></span>
                      <span className="font-medium">{alert.metric}</span>
                      <span className="text-sm text-gray-500">{alert.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Valore: {alert.value} | Soglia: {alert.threshold}
                    </p>
                  </div>
                  <button
                    onClick={() => performanceMonitor.resolveAlert(alert.id)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Risolvi
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Nessun avviso attivo 🎉</p>
        )}
      </div>

      {/* Alert History */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Cronologia Avvisi</h3>
        {alerts.length > 0 ? (
          <div className="space-y-2">
            {alerts.slice(-10).reverse().map(alert => (
              <div key={alert.id} className="flex justify-between items-center py-2 border-b">
                <div className="flex items-center space-x-3">
                  <span className={`inline-block w-2 h-2 rounded-full ${getAlertDotColor(alert.severity)}`}></span>
                  <span className="text-sm">{alert.description}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  {alert.resolved && <span className="text-green-600">✅</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Nessun avviso nella cronologia</p>
        )}
      </div>
    </div>
  );

  // 🎨 Helper functions
  const getPerformanceScore = (): string => {
    if (!metrics) return 'N/A';
    
    const lcpScore = metrics.pageLoad.lcp < 2500 ? 100 : metrics.pageLoad.lcp < 4000 ? 50 : 0;
    const fidScore = metrics.pageLoad.fid < 100 ? 100 : metrics.pageLoad.fid < 300 ? 50 : 0;
    const clsScore = metrics.pageLoad.cls < 0.1 ? 100 : metrics.pageLoad.cls < 0.25 ? 50 : 0;
    
    const averageScore = (lcpScore + fidScore + clsScore) / 3;
    return averageScore.toFixed(0);
  };

  const getLCPColor = (): string => {
    const lcp = metrics?.pageLoad.lcp || 0;
    if (lcp < 2500) return 'text-green-600';
    if (lcp < 4000) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFIDColor = (): string => {
    const fid = metrics?.pageLoad.fid || 0;
    if (fid < 100) return 'text-green-600';
    if (fid < 300) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCLSColor = (): string => {
    const cls = metrics?.pageLoad.cls || 0;
    if (cls < 0.1) return 'text-green-600';
    if (cls < 0.25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.LOW: return 'bg-blue-500';
      case AlertSeverity.MEDIUM: return 'bg-yellow-500';
      case AlertSeverity.HIGH: return 'bg-orange-500';
      case AlertSeverity.CRITICAL: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertBackgroundColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.LOW: return 'border-blue-500 bg-blue-50';
      case AlertSeverity.MEDIUM: return 'border-yellow-500 bg-yellow-50';
      case AlertSeverity.HIGH: return 'border-orange-500 bg-orange-50';
      case AlertSeverity.CRITICAL: return 'border-red-500 bg-red-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getAlertDotColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case AlertSeverity.LOW: return 'bg-blue-500';
      case AlertSeverity.MEDIUM: return 'bg-yellow-500';
      case AlertSeverity.HIGH: return 'bg-orange-500';
      case AlertSeverity.CRITICAL: return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const getStoragePercentage = (type: 'indexedDB' | 'localStorage' | 'cacheAPI'): number => {
    if (!metrics) return 0;
    
    const total = metrics.cacheEfficiency.totalStorageUsed;
    if (total === 0) return 0;
    
    let usage = 0;
    switch (type) {
      case 'indexedDB': usage = metrics.cacheEfficiency.indexedDBUsage; break;
      case 'localStorage': usage = metrics.cacheEfficiency.localStorageUsage; break;
      case 'cacheAPI': usage = metrics.cacheEfficiency.cacheAPIUsage; break;
    }
    
    return (usage / total) * 100;
  };

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Caricamento dati...</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview': return renderOverviewTab();
      case 'performance': return renderPerformanceTab();
      case 'cache': return renderCacheTab();
      case 'realtime': return renderRealTimeTab();
      case 'users': return renderUsersTab();
      case 'matches': return renderMatchesTab();
      case 'alerts': return renderAlertsTab();
      default: return renderOverviewTab();
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin PWA</h1>
              <p className="text-sm text-gray-500">
                Monitoraggio performance e analytics • Ultimo aggiornamento: {
                  metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : 'N/A'
                }
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? '🔄' : '🔄'} Aggiorna
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {DASHBOARD_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
} 