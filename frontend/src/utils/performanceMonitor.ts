// 🎯 FASE 4.2: PERFORMANCE ANALYTICS & MONITORING - Performance Monitor
// Monitora performance PWA, cache efficiency, real-time metrics e user analytics

import { SmartCache } from './smartCache';
import { ConnectionStatus } from './webSocketManager';

// 📊 Interfacce per performance monitoring
export interface PerformanceMetrics {
  // Page Performance
  pageLoad: PageLoadMetrics;
  
  // Cache Performance
  cacheEfficiency: CacheEfficiencyMetrics;
  
  // Network Performance
  networkPerformance: NetworkPerformanceMetrics;
  
  // Real-Time Performance
  realTimeMetrics: RealTimeMetrics;
  
  // PWA Performance
  pwaMetrics: PWAMetrics;
  
  // User Experience
  userExperience: UserExperienceMetrics;
  
  // System Resources
  systemResources: SystemResourceMetrics;
  
  timestamp: string;
  sessionId: string;
}

export interface PageLoadMetrics {
  // Core Web Vitals
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  
  // Navigation Timing
  domContentLoaded: number;
  loadComplete: number;
  ttfb: number; // Time to First Byte
  
  // Resource Loading
  totalResourceSize: number;
  resourceCount: number;
  criticalResourceLoadTime: number;
  
  // Page Specific
  pageUrl: string;
  pageType: string;
  isInitialLoad: boolean;
}

export interface CacheEfficiencyMetrics {
  // Hit Rates
  overallHitRate: number;
  strategyCacheHits: Map<string, number>;
  strategyCacheMisses: Map<string, number>;
  
  // Storage Usage
  totalStorageUsed: number;
  indexedDBUsage: number;
  localStorageUsage: number;
  cacheAPIUsage: number;
  
  // Performance Impact
  cacheRetrievalTime: number;
  cacheStorageTime: number;
  
  // Efficiency Metrics
  compressionRatio: number;
  evictionCount: number;
  cacheSize: number;
  
  // Strategy Performance
  strategyPerformance: Map<string, StrategyPerformance>;
}

export interface StrategyPerformance {
  name: string;
  hitRate: number;
  averageRetrievalTime: number;
  storageEfficiency: number;
  errorRate: number;
}

export interface NetworkPerformanceMetrics {
  // Connection Quality
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
  
  // Request Performance
  apiRequestCount: number;
  averageApiResponseTime: number;
  failedRequestCount: number;
  retryCount: number;
  
  // Offline Behavior
  offlineDuration: number;
  offlineActionCount: number;
  syncSuccessRate: number;
  
  // Bandwidth Usage
  totalDataTransferred: number;
  compressionSavings: number;
}

export interface RealTimeMetrics {
  // WebSocket Performance
  webSocketStatus: ConnectionStatus;
  connectionUptime: number;
  reconnectionCount: number;
  messagesSent: number;
  messagesReceived: number;
  averageLatency: number;
  
  // Push Notifications
  notificationsSent: number;
  notificationsDelivered: number;
  notificationEngagementRate: number;
  subscriptionSuccess: boolean;
  
  // Event Processing
  eventsProcessed: number;
  eventProcessingLatency: number;
  eventQueueSize: number;
}

export interface PWAMetrics {
  // Installation
  isInstalled: boolean;
  installPromptShown: boolean;
  installAccepted: boolean;
  installSource: string;
  
  // App Shell
  appShellLoadTime: number;
  serviceWorkerActive: boolean;
  serviceWorkerUpdateAvailable: boolean;
  
  // Manifest
  manifestScore: number;
  manifestErrors: string[];
  
  // Capabilities
  offlineCapable: boolean;
  pushNotificationsEnabled: boolean;
  backgroundSyncEnabled: boolean;
  
  // Usage Patterns
  sessionDuration: number;
  pagesVisited: number;
  actionsPerformed: number;
  
  // Performance Score
  lighthouseScore?: LighthouseMetrics;
}

export interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  timestamp: string;
}

export interface UserExperienceMetrics {
  // Interaction
  totalInteractions: number;
  averageInteractionToNextPaint: number;
  
  // Navigation
  navigationCount: number;
  averageNavigationTime: number;
  backButtonUsage: number;
  
  // Feature Usage
  featureUsage: Map<string, number>;
  offlineFeatureUsage: number;
  realTimeFeatureUsage: number;
  
  // Error Experience
  errorCount: number;
  errorRecoveryTime: number;
  userReportedIssues: number;
  
  // Satisfaction Indicators
  bounceRate: number;
  averageSessionLength: number;
  pageViewsPerSession: number;
}

export interface SystemResourceMetrics {
  // Memory Usage
  jsHeapSizeUsed: number;
  jsHeapSizeTotal: number;
  jsHeapSizeLimit: number;
  
  // CPU Performance
  averageFrameTime: number;
  frameDropCount: number;
  longTaskCount: number;
  
  // Battery (if available)
  batteryLevel?: number;
  batteryCharging?: boolean;
  
  // Device Info
  deviceType: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  
  // Storage Quotas
  storageQuota: number;
  storageUsage: number;
  storageQuotaExceeded: boolean;
}

export interface PerformanceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  metric: string;
  value: number;
  threshold: number;
  description: string;
  timestamp: string;
  resolved: boolean;
  actions?: string[];
}

export enum AlertType {
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  CACHE_MISS_HIGH = 'cache_miss_high',
  NETWORK_SLOW = 'network_slow',
  MEMORY_HIGH = 'memory_high',
  ERROR_RATE_HIGH = 'error_rate_high',
  OFFLINE_DURATION_LONG = 'offline_duration_long',
  REAL_TIME_DISCONNECTED = 'real_time_disconnected'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface PerformanceConfig {
  // Monitoring Settings
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of sessions to monitor
  reportingInterval: number; // milliseconds
  
  // Thresholds
  thresholds: {
    lcpThreshold: number;
    fidThreshold: number;
    clsThreshold: number;
    cacheHitRateThreshold: number;
    errorRateThreshold: number;
    memoryThreshold: number;
  };
  
  // Collection Settings
  collectUserTiming: boolean;
  collectResourceTiming: boolean;
  collectNavigationTiming: boolean;
  collectRealTimeMetrics: boolean;
  
  // Privacy Settings
  anonymizeData: boolean;
  excludePersonalData: boolean;
}

// 📱 PerformanceMonitor - Sistema completo monitoring performance
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private cache: SmartCache;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private sessionId: string;
  private startTime: number;
  private isMonitoring = false;
  private observers: PerformanceObserver[] = [];
  private reportingTimer?: NodeJS.Timeout;

  // 🔧 Default configuration
  private static readonly DEFAULT_CONFIG: PerformanceConfig = {
    enabled: true,
    sampleRate: 0.1, // Monitor 10% of sessions
    reportingInterval: 60000, // 1 minute
    thresholds: {
      lcpThreshold: 2500, // 2.5s
      fidThreshold: 100,  // 100ms
      clsThreshold: 0.1,  // 0.1
      cacheHitRateThreshold: 80, // 80%
      errorRateThreshold: 5,     // 5%
      memoryThreshold: 50 * 1024 * 1024 // 50MB
    },
    collectUserTiming: true,
    collectResourceTiming: true,
    collectNavigationTiming: true,
    collectRealTimeMetrics: true,
    anonymizeData: true,
    excludePersonalData: true
  };

  private constructor(config?: Partial<PerformanceConfig>) {
    this.config = { ...PerformanceMonitor.DEFAULT_CONFIG, ...config };
    this.cache = SmartCache.getInstance();
    this.sessionId = this.generateSessionId();
    this.startTime = typeof window !== 'undefined' ? performance.now() : 0;
    this.metrics = this.initializeMetrics();

    // Start monitoring se abilitato e nella sample rate (solo nel browser)
    if (typeof window !== 'undefined' && this.config.enabled && Math.random() < this.config.sampleRate) {
      this.startMonitoring();
    }
  }

  static getInstance(config?: Partial<PerformanceConfig>): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor(config);
    }
    return this.instance;
  }

  // 🚀 Avvio monitoring
  async startMonitoring(): Promise<void> {
    if (typeof window === 'undefined' || this.isMonitoring) return;

    try {
      console.log('🚀 [PerformanceMonitor] Starting performance monitoring');

      // Setup Performance Observers
      this.setupPerformanceObservers();

      // Setup periodic reporting
      this.setupPeriodicReporting();

      // Setup event listeners
      this.setupEventListeners();

      // Initial metrics collection
      await this.collectInitialMetrics();

      this.isMonitoring = true;
      console.log('✅ [PerformanceMonitor] Performance monitoring started');

    } catch (error) {
      console.error('❌ [PerformanceMonitor] Failed to start monitoring:', error);
    }
  }

  // 📊 Raccolta metriche
  async collectCurrentMetrics(): Promise<PerformanceMetrics> {
    const now = performance.now();

    // Update all metric categories
    this.metrics.pageLoad = await this.collectPageLoadMetrics();
    this.metrics.cacheEfficiency = await this.collectCacheMetrics();
    this.metrics.networkPerformance = await this.collectNetworkMetrics();
    this.metrics.realTimeMetrics = await this.collectRealTimeMetrics();
    this.metrics.pwaMetrics = await this.collectPWAMetrics();
    this.metrics.userExperience = await this.collectUserExperienceMetrics();
    this.metrics.systemResources = await this.collectSystemResourceMetrics();
    this.metrics.timestamp = new Date().toISOString();

    // Check for alerts
    this.checkPerformanceAlerts();

    return { ...this.metrics };
  }

  // 📄 Page Load Metrics
  private async collectPageLoadMetrics(): Promise<PageLoadMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    let fcp = 0;
    let lcp = 0;
    
    // First Contentful Paint
    const fcpEntry = paint.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) fcp = fcpEntry.startTime;

    // Largest Contentful Paint (from observer)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      lcp = lcpEntries[lcpEntries.length - 1].startTime;
    }

    // Resource metrics
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const totalResourceSize = resources.reduce((sum, res) => sum + (res.transferSize || 0), 0);
    const criticalResources = resources.filter(res => 
      res.name.includes('.css') || res.name.includes('.js')
    );
    const criticalResourceLoadTime = criticalResources.length > 0 ? 
      Math.max(...criticalResources.map(res => res.responseEnd)) : 0;

    return {
      fcp,
      lcp,
      fid: 0, // Will be updated by observer
      cls: 0, // Will be updated by observer
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.navigationStart : 0,
      loadComplete: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
      ttfb: navigation ? navigation.responseStart - navigation.navigationStart : 0,
      totalResourceSize,
      resourceCount: resources.length,
      criticalResourceLoadTime,
      pageUrl: window.location.href,
      pageType: this.getPageType(),
      isInitialLoad: navigation ? navigation.type === 'navigate' : false
    };
  }

  // 🗄️ Cache Metrics
  private async collectCacheMetrics(): Promise<CacheEfficiencyMetrics> {
    const cacheStats = await this.cache.getStats();
    
    // Calculate hit rates
    const strategyCacheHits = new Map<string, number>();
    const strategyCacheMisses = new Map<string, number>();
    const strategyPerformance = new Map<string, StrategyPerformance>();

    // Get storage usage
    let indexedDBUsage = 0;
    let localStorageUsage = 0;
    let cacheAPIUsage = 0;

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      indexedDBUsage = estimate.usage || 0;
    }

    // LocalStorage usage (approximation)
    try {
      const localStorageSize = JSON.stringify(localStorage).length;
      localStorageUsage = localStorageSize;
    } catch (error) {
      // localStorage access denied
    }

    // Cache API usage (approximation)
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          cacheAPIUsage += requests.length * 1024; // Rough estimate
        }
      } catch (error) {
        // Cache API access denied
      }
    }

    return {
      overallHitRate: cacheStats.hitRate || 0,
      strategyCacheHits,
      strategyCacheMisses,
      totalStorageUsed: indexedDBUsage + localStorageUsage + cacheAPIUsage,
      indexedDBUsage,
      localStorageUsage,
      cacheAPIUsage,
      cacheRetrievalTime: cacheStats.averageRetrievalTime || 0,
      cacheStorageTime: cacheStats.averageStorageTime || 0,
      compressionRatio: cacheStats.compressionRatio || 0,
      evictionCount: cacheStats.evictionCount || 0,
      cacheSize: cacheStats.size || 0,
      strategyPerformance
    };
  }

  // 🌐 Network Metrics
  private async collectNetworkMetrics(): Promise<NetworkPerformanceMetrics> {
    let connectionType = 'unknown';
    let effectiveType = 'unknown';
    let downlink = 0;
    let rtt = 0;

    // Network Information API (solo nel browser)
    if (typeof window !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      connectionType = connection.type || 'unknown';
      effectiveType = connection.effectiveType || 'unknown';
      downlink = connection.downlink || 0;
      rtt = connection.rtt || 0;
    }

    // Get API performance data from Resource Timing
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const apiRequests = resources.filter(res => 
      res.name.includes('/api/') || res.name.includes('api.')
    );

    const averageApiResponseTime = apiRequests.length > 0 ? 
      apiRequests.reduce((sum, req) => sum + req.duration, 0) / apiRequests.length : 0;

    const totalDataTransferred = resources.reduce((sum, res) => sum + (res.transferSize || 0), 0);

    return {
      connectionType,
      effectiveType,
      downlink,
      rtt,
      apiRequestCount: apiRequests.length,
      averageApiResponseTime,
      failedRequestCount: 0, // Would be tracked separately
      retryCount: 0,         // Would be tracked separately
      offlineDuration: 0,    // Would be tracked separately
      offlineActionCount: 0, // Would be tracked separately
      syncSuccessRate: 100,  // Would be tracked separately
      totalDataTransferred,
      compressionSavings: 0  // Would be calculated based on compression
    };
  }

  // 📡 Real-Time Metrics
  private async collectRealTimeMetrics(): Promise<RealTimeMetrics> {
    // These would be updated by WebSocket and Push managers
    return {
      webSocketStatus: ConnectionStatus.DISCONNECTED,
      connectionUptime: 0,
      reconnectionCount: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      notificationsSent: 0,
      notificationsDelivered: 0,
      notificationEngagementRate: 0,
      subscriptionSuccess: false,
      eventsProcessed: 0,
      eventProcessingLatency: 0,
      eventQueueSize: 0
    };
  }

  // 📱 PWA Metrics
  private async collectPWAMetrics(): Promise<PWAMetrics> {
    let isInstalled = false;
    let serviceWorkerActive = false;
    let serviceWorkerUpdateAvailable = false;

    if (typeof window !== 'undefined') {
      // Check PWA installation
      if ('getInstalledRelatedApps' in navigator) {
        try {
          const relatedApps = await (navigator as any).getInstalledRelatedApps();
          isInstalled = relatedApps.length > 0;
        } catch (error) {
          // API not supported or denied
        }
      }

      // Check Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          serviceWorkerActive = !!registration.active;
          serviceWorkerUpdateAvailable = !!registration.waiting;
        }
      }
    }

    // Check manifest
    const manifestScore = await this.calculateManifestScore();

    return {
      isInstalled,
      installPromptShown: false, // Would be tracked separately
      installAccepted: false,    // Would be tracked separately
      installSource: 'browser',
      appShellLoadTime: this.metrics.pageLoad?.domContentLoaded || 0,
      serviceWorkerActive,
      serviceWorkerUpdateAvailable,
      manifestScore: manifestScore.score,
      manifestErrors: manifestScore.errors,
      offlineCapable: serviceWorkerActive,
      pushNotificationsEnabled: typeof window !== 'undefined' ? Notification.permission === 'granted' : false,
      backgroundSyncEnabled: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      sessionDuration: typeof window !== 'undefined' ? performance.now() - this.startTime : 0,
      pagesVisited: 1, // Would be tracked separately
      actionsPerformed: 0 // Would be tracked separately
    };
  }

  // 👤 User Experience Metrics
  private async collectUserExperienceMetrics(): Promise<UserExperienceMetrics> {
    return {
      totalInteractions: 0,     // Would be tracked with event listeners
      averageInteractionToNextPaint: 0,
      navigationCount: 0,       // Would be tracked separately
      averageNavigationTime: 0,
      backButtonUsage: 0,
      featureUsage: new Map(),
      offlineFeatureUsage: 0,
      realTimeFeatureUsage: 0,
      errorCount: 0,            // Would be tracked with error handlers
      errorRecoveryTime: 0,
      userReportedIssues: 0,
      bounceRate: 0,
      averageSessionLength: performance.now() - this.startTime,
      pageViewsPerSession: 1
    };
  }

  // 💻 System Resource Metrics
  private async collectSystemResourceMetrics(): Promise<SystemResourceMetrics> {
    let jsHeapSizeUsed = 0;
    let jsHeapSizeTotal = 0;
    let jsHeapSizeLimit = 0;
    let storageQuota = 0;
    let storageUsage = 0;
    let batteryLevel: number | undefined;
    let batteryCharging: boolean | undefined;

    if (typeof window !== 'undefined') {
      // Memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        jsHeapSizeUsed = memory.usedJSHeapSize || 0;
        jsHeapSizeTotal = memory.totalJSHeapSize || 0;
        jsHeapSizeLimit = memory.jsHeapSizeLimit || 0;
      }

      // Storage quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        storageQuota = estimate.quota || 0;
        storageUsage = estimate.usage || 0;
      }

      // Battery API
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          batteryLevel = battery.level;
          batteryCharging = battery.charging;
        } catch (error) {
          // Battery API not supported
        }
      }
    }

    return {
      jsHeapSizeUsed,
      jsHeapSizeTotal,
      jsHeapSizeLimit,
      averageFrameTime: 0,      // Would be calculated from frame timing
      frameDropCount: 0,        // Would be tracked separately
      longTaskCount: 0,         // Would be tracked with Long Task API
      batteryLevel,
      batteryCharging,
      deviceType: this.getDeviceType(),
      platform: typeof window !== 'undefined' ? navigator.platform : 'unknown',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
      screenResolution: typeof window !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
      storageQuota,
      storageUsage,
      storageQuotaExceeded: storageUsage > storageQuota * 0.9
    };
  }

  // 🔧 Setup methods
  private setupPerformanceObservers(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          this.metrics.pageLoad.lcp = entries[entries.length - 1].startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported');
    }

    // First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.pageLoad.fid = entry.processingStart - entry.startTime;
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported');
    }

    // Cumulative Layout Shift
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.pageLoad.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported');
    }

    // Long Tasks
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(() => {
          this.metrics.systemResources.longTaskCount++;
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (error) {
      console.warn('Long Task observer not supported');
    }
  }

  private setupPeriodicReporting(): void {
    this.reportingTimer = setInterval(async () => {
      await this.collectCurrentMetrics();
      await this.reportMetrics();
    }, this.config.reportingInterval);
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseMonitoring();
      } else {
        this.resumeMonitoring();
      }
    });

    // Unload event
    window.addEventListener('beforeunload', () => {
      this.stopMonitoring();
    });
  }

  // 📊 Analysis methods
  private checkPerformanceAlerts(): void {
    const metrics = this.metrics;

    // Core Web Vitals alerts
    if (metrics.pageLoad.lcp > this.config.thresholds.lcpThreshold) {
      this.createAlert(AlertType.PERFORMANCE_DEGRADATION, AlertSeverity.HIGH, 
        'LCP', metrics.pageLoad.lcp, this.config.thresholds.lcpThreshold,
        'Largest Contentful Paint is above threshold');
    }

    if (metrics.pageLoad.fid > this.config.thresholds.fidThreshold) {
      this.createAlert(AlertType.PERFORMANCE_DEGRADATION, AlertSeverity.MEDIUM,
        'FID', metrics.pageLoad.fid, this.config.thresholds.fidThreshold,
        'First Input Delay is above threshold');
    }

    if (metrics.pageLoad.cls > this.config.thresholds.clsThreshold) {
      this.createAlert(AlertType.PERFORMANCE_DEGRADATION, AlertSeverity.MEDIUM,
        'CLS', metrics.pageLoad.cls, this.config.thresholds.clsThreshold,
        'Cumulative Layout Shift is above threshold');
    }

    // Cache efficiency alerts
    if (metrics.cacheEfficiency.overallHitRate < this.config.thresholds.cacheHitRateThreshold) {
      this.createAlert(AlertType.CACHE_MISS_HIGH, AlertSeverity.MEDIUM,
        'Cache Hit Rate', metrics.cacheEfficiency.overallHitRate, this.config.thresholds.cacheHitRateThreshold,
        'Cache hit rate is below expected threshold');
    }

    // Memory alerts
    if (metrics.systemResources.jsHeapSizeUsed > this.config.thresholds.memoryThreshold) {
      this.createAlert(AlertType.MEMORY_HIGH, AlertSeverity.HIGH,
        'JS Heap Size', metrics.systemResources.jsHeapSizeUsed, this.config.thresholds.memoryThreshold,
        'JavaScript heap size is approaching limit');
    }
  }

  private createAlert(type: AlertType, severity: AlertSeverity, metric: string, 
                     value: number, threshold: number, description: string): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      metric,
      value,
      threshold,
      description,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    console.warn(`⚠️ [PerformanceMonitor] Performance Alert: ${description}`, alert);
  }

  // 📤 Reporting
  private async reportMetrics(): Promise<void> {
    if (!this.config.enabled) return;

    try {
      const metricsToReport = this.config.anonymizeData ? 
        this.anonymizeMetrics(this.metrics) : this.metrics;

      // Store locally
      await this.cache.set('performance_metrics', metricsToReport, { ttl: 24 * 60 * 60 * 1000 });

      // Send to analytics endpoint (if configured)
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.onLine) {
        await this.sendMetricsToServer(metricsToReport);
      }

    } catch (error) {
      console.warn('⚠️ [PerformanceMonitor] Failed to report metrics:', error);
    }
  }

  private async sendMetricsToServer(metrics: PerformanceMetrics): Promise<void> {
    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metrics)
      });
    } catch (error) {
      console.warn('⚠️ [PerformanceMonitor] Failed to send metrics to server:', error);
    }
  }

  // 🔒 Privacy methods
  private anonymizeMetrics(metrics: PerformanceMetrics): PerformanceMetrics {
    const anonymized = { ...metrics };
    
    if (this.config.excludePersonalData) {
      // Remove personally identifiable information
      anonymized.pageLoad.pageUrl = this.anonymizeUrl(metrics.pageLoad.pageUrl);
      anonymized.systemResources.userAgent = this.anonymizeUserAgent(metrics.systemResources.userAgent);
    }

    return anonymized;
  }

  private anonymizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch {
      return '[anonymized]';
    }
  }

  private anonymizeUserAgent(userAgent: string): string {
    // Remove version numbers and specific identifiers
    return userAgent
      .replace(/\d+\.\d+\.\d+/g, 'x.x.x')
      .replace(/Chrome\/\d+/g, 'Chrome/x')
      .replace(/Safari\/\d+/g, 'Safari/x');
  }

  // 🛠️ Utility methods
  private initializeMetrics(): PerformanceMetrics {
    return {
      pageLoad: {
        fcp: 0, lcp: 0, fid: 0, cls: 0,
        domContentLoaded: 0, loadComplete: 0, ttfb: 0,
        totalResourceSize: 0, resourceCount: 0, criticalResourceLoadTime: 0,
        pageUrl: '', pageType: '', isInitialLoad: false
      },
      cacheEfficiency: {
        overallHitRate: 0, strategyCacheHits: new Map(), strategyCacheMisses: new Map(),
        totalStorageUsed: 0, indexedDBUsage: 0, localStorageUsage: 0, cacheAPIUsage: 0,
        cacheRetrievalTime: 0, cacheStorageTime: 0, compressionRatio: 0,
        evictionCount: 0, cacheSize: 0, strategyPerformance: new Map()
      },
      networkPerformance: {
        connectionType: '', effectiveType: '', downlink: 0, rtt: 0,
        apiRequestCount: 0, averageApiResponseTime: 0, failedRequestCount: 0, retryCount: 0,
        offlineDuration: 0, offlineActionCount: 0, syncSuccessRate: 0,
        totalDataTransferred: 0, compressionSavings: 0
      },
      realTimeMetrics: {
        webSocketStatus: ConnectionStatus.DISCONNECTED, connectionUptime: 0, reconnectionCount: 0,
        messagesSent: 0, messagesReceived: 0, averageLatency: 0,
        notificationsSent: 0, notificationsDelivered: 0, notificationEngagementRate: 0, subscriptionSuccess: false,
        eventsProcessed: 0, eventProcessingLatency: 0, eventQueueSize: 0
      },
      pwaMetrics: {
        isInstalled: false, installPromptShown: false, installAccepted: false, installSource: '',
        appShellLoadTime: 0, serviceWorkerActive: false, serviceWorkerUpdateAvailable: false,
        manifestScore: 0, manifestErrors: [], offlineCapable: false,
        pushNotificationsEnabled: false, backgroundSyncEnabled: false,
        sessionDuration: 0, pagesVisited: 0, actionsPerformed: 0
      },
      userExperience: {
        totalInteractions: 0, averageInteractionToNextPaint: 0,
        navigationCount: 0, averageNavigationTime: 0, backButtonUsage: 0,
        featureUsage: new Map(), offlineFeatureUsage: 0, realTimeFeatureUsage: 0,
        errorCount: 0, errorRecoveryTime: 0, userReportedIssues: 0,
        bounceRate: 0, averageSessionLength: 0, pageViewsPerSession: 0
      },
      systemResources: {
        jsHeapSizeUsed: 0, jsHeapSizeTotal: 0, jsHeapSizeLimit: 0,
        averageFrameTime: 0, frameDropCount: 0, longTaskCount: 0,
        deviceType: '', platform: '', userAgent: '', screenResolution: '',
        storageQuota: 0, storageUsage: 0, storageQuotaExceeded: false
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPageType(): string {
    const path = window.location.pathname;
    if (path === '/') return 'home';
    if (path.includes('/players')) return 'players';
    if (path.includes('/matches')) return 'matches';
    if (path.includes('/stats')) return 'stats';
    if (path.includes('/profile')) return 'profile';
    return 'other';
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
          const userAgent = typeof window !== 'undefined' && typeof navigator !== 'undefined' ? navigator.userAgent : 'server-side';
    if (/Mobi|Android/i.test(userAgent)) return 'mobile';
    if (/Tablet|iPad/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  private async calculateManifestScore(): Promise<{ score: number; errors: string[] }> {
    const errors: string[] = [];
    let score = 0;

    try {
      const manifestResponse = await fetch('/manifest.json');
      const manifest = await manifestResponse.json();

      // Check required fields
      if (manifest.name || manifest.short_name) score += 20;
      else errors.push('Missing name or short_name');

      if (manifest.start_url) score += 15;
      else errors.push('Missing start_url');

      if (manifest.display) score += 10;
      else errors.push('Missing display mode');

      if (manifest.icons && manifest.icons.length > 0) score += 25;
      else errors.push('Missing icons');

      if (manifest.theme_color) score += 10;
      if (manifest.background_color) score += 10;
      if (manifest.shortcuts) score += 10;

    } catch (error) {
      errors.push('Failed to load manifest.json');
    }

    return { score, errors };
  }

  private async collectInitialMetrics(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Wait for page to be fully loaded
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
      });
    }

    // Collect initial metrics
    await this.collectCurrentMetrics();
  }

  // 🔄 Control methods
  pauseMonitoring(): void {
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }
  }

  resumeMonitoring(): void {
    if (this.isMonitoring) {
      this.setupPeriodicReporting();
    }
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    if (this.reportingTimer) {
      clearInterval(this.reportingTimer);
    }

    this.observers.forEach(observer => {
      observer.disconnect();
    });
    this.observers = [];

    // Final metrics collection
    this.collectCurrentMetrics();
    this.reportMetrics();
  }

  // 📊 Public API
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 