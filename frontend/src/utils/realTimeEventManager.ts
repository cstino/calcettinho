// 🎯 FASE 3.3: REAL-TIME FEATURES - Real-Time Event Manager
// Integra WebSocket e Push Notifications per eventi live dell'app

import { WebSocketManager, WebSocketEventType, ConnectionStatus } from './webSocketManager';
import { PushNotificationManager, NotificationType } from './pushNotificationManager';

// 🎯 Tipi di eventi real-time dell'app
export enum AppEventType {
  // Voting Events
  VOTING_SESSION_STARTED = 'voting_session_started',
  VOTE_RECEIVED = 'vote_received',
  VOTING_PROGRESS_UPDATE = 'voting_progress_update',
  VOTING_SESSION_ENDED = 'voting_session_ended',
  
  // Match Events
  MATCH_CREATED = 'match_created',
  MATCH_TEAM_UPDATED = 'match_team_updated',
  MATCH_STARTED = 'match_started',
  MATCH_GOAL_SCORED = 'match_goal_scored',
  MATCH_ENDED = 'match_ended',
  
  // Player Events
  PLAYER_JOINED_MATCH = 'player_joined_match',
  PLAYER_LEFT_MATCH = 'player_left_match',
  PLAYER_STATS_CHANGED = 'player_stats_changed',
  AWARD_GRANTED = 'award_granted',
  
  // System Events
  USER_PRESENCE_CHANGED = 'user_presence_changed',
  SYNC_STATUS_CHANGED = 'sync_status_changed',
  APP_UPDATE_AVAILABLE = 'app_update_available'
}

// 📊 Interfacce per eventi
export interface AppEvent {
  type: AppEventType;
  data: any;
  timestamp: string;
  source: 'websocket' | 'push' | 'local';
  priority: 'low' | 'medium' | 'high' | 'critical';
  matchId?: string;
  userId?: string;
}

export interface EventSubscription {
  eventType: AppEventType;
  callback: (event: AppEvent) => void;
  options?: {
    once?: boolean;
    priority?: number;
    filter?: (event: AppEvent) => boolean;
  };
}

export interface RealTimeConfig {
  enableWebSocket: boolean;
  enablePushNotifications: boolean;
  autoReconnect: boolean;
  syncOnReconnect: boolean;
  notificationSettings: {
    showForBackground: boolean;
    showForForeground: boolean;
    vibrate: boolean;
    sound: boolean;
  };
}

// 📱 RealTimeEventManager - Gestione centralizzata eventi real-time
export class RealTimeEventManager {
  private static instance: RealTimeEventManager;
  private webSocketManager: WebSocketManager;
  private pushNotificationManager: PushNotificationManager;
  private eventSubscriptions = new Map<AppEventType, Set<EventSubscription>>();
  private eventHistory: AppEvent[] = [];
  private config: RealTimeConfig;
  private isAppInForeground = true;
  private currentUserEmail?: string;
  private activeMatchId?: string;

  // 🔧 Configurazione default
  private static readonly DEFAULT_CONFIG: RealTimeConfig = {
    enableWebSocket: true,
    enablePushNotifications: true,
    autoReconnect: true,
    syncOnReconnect: true,
    notificationSettings: {
      showForBackground: true,
      showForForeground: false,
      vibrate: true,
      sound: true
    }
  };

  private constructor(config?: Partial<RealTimeConfig>) {
    this.config = { ...RealTimeEventManager.DEFAULT_CONFIG, ...config };
    
    // Inizializza managers
    this.webSocketManager = WebSocketManager.getInstance();
    this.pushNotificationManager = PushNotificationManager.getInstance();
    
    // Setup event listeners
    this.initializeWebSocketListeners();
    this.initializeVisibilityAPI();
    this.initializeServiceWorkerMessageListener();
    
    console.log('🚀 [RealTimeEventManager] Initialized');
  }

  static getInstance(config?: Partial<RealTimeConfig>): RealTimeEventManager {
    if (!this.instance) {
      this.instance = new RealTimeEventManager(config);
    }
    return this.instance;
  }

  // 🔧 Inizializzazione WebSocket listeners
  private initializeWebSocketListeners(): void {
    // Map WebSocket events to App events
    const eventMappings: Record<WebSocketEventType, AppEventType> = {
      [WebSocketEventType.VOTE_SUBMITTED]: AppEventType.VOTE_RECEIVED,
      [WebSocketEventType.VOTE_PROGRESS]: AppEventType.VOTING_PROGRESS_UPDATE,
      [WebSocketEventType.VOTING_COMPLETED]: AppEventType.VOTING_SESSION_ENDED,
      [WebSocketEventType.MATCH_CREATED]: AppEventType.MATCH_CREATED,
      [WebSocketEventType.MATCH_STARTED]: AppEventType.MATCH_STARTED,
      [WebSocketEventType.MATCH_UPDATED]: AppEventType.MATCH_TEAM_UPDATED,
      [WebSocketEventType.MATCH_ENDED]: AppEventType.MATCH_ENDED,
      [WebSocketEventType.PLAYER_JOINED]: AppEventType.PLAYER_JOINED_MATCH,
      [WebSocketEventType.PLAYER_LEFT]: AppEventType.PLAYER_LEFT_MATCH,
      [WebSocketEventType.PLAYER_STATS_UPDATED]: AppEventType.PLAYER_STATS_CHANGED,
      [WebSocketEventType.AWARD_GRANTED]: AppEventType.AWARD_GRANTED,
      [WebSocketEventType.USER_ONLINE]: AppEventType.USER_PRESENCE_CHANGED,
      [WebSocketEventType.USER_OFFLINE]: AppEventType.USER_PRESENCE_CHANGED,
      [WebSocketEventType.SYNC_STATUS]: AppEventType.SYNC_STATUS_CHANGED
    };

    // Registra listeners per tutti gli eventi mappati
    Object.entries(eventMappings).forEach(([wsEvent, appEvent]) => {
      this.webSocketManager.on(wsEvent as WebSocketEventType, (data, message) => {
        this.handleEvent({
          type: appEvent,
          data,
          timestamp: message.timestamp,
          source: 'websocket',
          priority: this.mapWebSocketPriorityToApp(message.priority),
          matchId: message.matchId,
          userId: message.userId
        });
      });
    });
  }

  // 👁️ Inizializzazione Page Visibility API
  private initializeVisibilityAPI(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isAppInForeground = !document.hidden;
        
        console.log(`👁️ [RealTimeEventManager] App visibility: ${this.isAppInForeground ? 'foreground' : 'background'}`);
        
        // Sync quando l'app torna in foreground
        if (this.isAppInForeground && this.config.syncOnReconnect) {
          this.syncOnForeground();
        }
      });
    }
  }

  // 💬 Listener per messaggi Service Worker (push notifications)
  private initializeServiceWorkerMessageListener(): void {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'notification_received') {
          this.handleEvent({
            type: this.mapNotificationTypeToAppEvent(event.data.notificationType),
            data: event.data.payload,
            timestamp: new Date().toISOString(),
            source: 'push',
            priority: 'medium'
          });
        }
      });
    }
  }

  // 🎯 Gestione eventi centralizata
  private handleEvent(event: AppEvent): void {
    console.log(`🎯 [RealTimeEventManager] Handling ${event.type} from ${event.source}`);

    // Aggiungi alla history
    this.addToEventHistory(event);

    // Gestisci event-specific logic
    this.processEventLogic(event);

    // Emetti agli subscribers
    this.emitToSubscribers(event);

    // Gestisci notifiche se app in background
    if (!this.isAppInForeground && this.shouldShowNotification(event)) {
      this.handleBackgroundNotification(event);
    }
  }

  // 🧠 Logica specifica per tipo di evento
  private processEventLogic(event: AppEvent): void {
    switch (event.type) {
      case AppEventType.VOTING_SESSION_STARTED:
        this.activeMatchId = event.matchId;
        // Auto-subscribe to match events
        if (event.matchId) {
          this.subscribeToMatchEvents(event.matchId);
        }
        break;

      case AppEventType.MATCH_CREATED:
        // Notify if user email in participants
        if (this.currentUserEmail && event.data?.participants?.includes(this.currentUserEmail)) {
          this.showLocalNotification(
            NotificationType.MATCH_CREATED,
            {
              title: '⚽ Nuova partita!',
              body: `Sei stato invitato alla partita ${event.data.matchName || event.matchId}`,
              data: { matchId: event.matchId }
            }
          );
        }
        break;

      case AppEventType.VOTE_RECEIVED:
        // Aggiorna progress locale se stesso match
        if (event.matchId === this.activeMatchId) {
          this.updateVotingProgress(event.data);
        }
        break;

      case AppEventType.AWARD_GRANTED:
        // Show celebratory notification
        if (event.data?.playerEmail === this.currentUserEmail) {
          this.showLocalNotification(
            NotificationType.AWARD_RECEIVED,
            {
              title: '🏅 Complimenti!',
              body: `Hai ricevuto il premio: ${event.data.awardType}`,
              requireInteraction: true
            }
          );
        }
        break;

      case AppEventType.SYNC_STATUS_CHANGED:
        // Handle connection status changes
        this.handleConnectionStatusChange(event.data.status);
        break;
    }
  }

  // 📢 Emetti evento agli subscribers
  private emitToSubscribers(event: AppEvent): void {
    const subscribers = this.eventSubscriptions.get(event.type);
    if (!subscribers || subscribers.size === 0) return;

    const subscribersToRemove = new Set<EventSubscription>();

    subscribers.forEach(subscription => {
      try {
        // Applica filtro se presente
        if (subscription.options?.filter && !subscription.options.filter(event)) {
          return;
        }

        // Chiama callback
        subscription.callback(event);

        // Rimuovi se once
        if (subscription.options?.once) {
          subscribersToRemove.add(subscription);
        }

      } catch (error) {
        console.error(`❌ [RealTimeEventManager] Subscription callback error for ${event.type}:`, error);
      }
    });

    // Rimuovi subscription once
    subscribersToRemove.forEach(sub => {
      subscribers.delete(sub);
    });
  }

  // 🔔 Gestisci notifiche background
  private handleBackgroundNotification(event: AppEvent): void {
    if (!this.config.notificationSettings.showForBackground) return;

    const notificationType = this.mapAppEventToNotificationType(event.type);
    if (!notificationType) return;

    const notificationData = this.buildNotificationFromEvent(event, notificationType);
    this.showLocalNotification(notificationType, notificationData);
  }

  // 🔔 Mostra notifica locale
  private showLocalNotification(
    type: NotificationType,
    customData?: any
  ): void {
    if (this.isAppInForeground && !this.config.notificationSettings.showForForeground) {
      return;
    }

    this.pushNotificationManager.showNotification(type, customData);
  }

  // 📝 Subscription management
  subscribe(
    eventType: AppEventType,
    callback: (event: AppEvent) => void,
    options?: EventSubscription['options']
  ): () => void {
    if (!this.eventSubscriptions.has(eventType)) {
      this.eventSubscriptions.set(eventType, new Set());
    }

    const subscription: EventSubscription = {
      eventType,
      callback,
      options
    };

    this.eventSubscriptions.get(eventType)!.add(subscription);

    console.log(`👂 [RealTimeEventManager] Subscribed to ${eventType}`);

    // Return unsubscribe function
    return () => {
      this.eventSubscriptions.get(eventType)?.delete(subscription);
    };
  }

  // 📤 Invio eventi
  async sendEvent(
    type: AppEventType,
    data: any,
    options?: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      matchId?: string;
      broadcast?: boolean;
    }
  ): Promise<boolean> {
    const event: AppEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
      source: 'local',
      priority: options?.priority || 'medium',
      matchId: options?.matchId,
      userId: this.currentUserEmail
    };

    // Invia via WebSocket se connesso
    if (this.config.enableWebSocket) {
      const wsEventType = this.mapAppEventToWebSocket(type);
      if (wsEventType) {
        const success = await this.webSocketManager.send(
          wsEventType,
          data,
          {
            priority: options?.priority,
            matchId: options?.matchId,
            userId: this.currentUserEmail
          }
        );

        if (success) {
          console.log(`📤 [RealTimeEventManager] Sent ${type} via WebSocket`);
          return true;
        }
      }
    }

    // Fallback: gestisci localmente
    this.handleEvent(event);
    return true;
  }

  // 🎯 Subscribe a eventi specifici match
  subscribeToMatchEvents(matchId: string): void {
    this.activeMatchId = matchId;
    
    // Subscribe a tutti gli eventi match-related
    const matchEvents = [
      AppEventType.VOTING_SESSION_STARTED,
      AppEventType.VOTE_RECEIVED,
      AppEventType.VOTING_PROGRESS_UPDATE,
      AppEventType.VOTING_SESSION_ENDED,
      AppEventType.MATCH_STARTED,
      AppEventType.MATCH_ENDED,
      AppEventType.PLAYER_JOINED_MATCH,
      AppEventType.PLAYER_LEFT_MATCH
    ];

    matchEvents.forEach(eventType => {
      this.subscribe(eventType, (event) => {
        if (event.matchId === matchId) {
          console.log(`🎯 [RealTimeEventManager] Match event ${eventType} for ${matchId}`);
          // Event è già stato processato, questo è solo per logging
        }
      }, {
        filter: (event) => event.matchId === matchId
      });
    });

    console.log(`🎯 [RealTimeEventManager] Subscribed to match events for ${matchId}`);
  }

  // 👤 Imposta utente corrente
  setCurrentUser(email: string): void {
    this.currentUserEmail = email;
    console.log(`👤 [RealTimeEventManager] Set current user: ${email}`);
  }

  // 📊 Statistics and utilities
  getEventHistory(limit?: number): AppEvent[] {
    return limit ? this.eventHistory.slice(-limit) : [...this.eventHistory];
  }

  getConnectionStatus(): {
    webSocket: ConnectionStatus;
    pushNotifications: boolean;
    isOnline: boolean;
  } {
    return {
      webSocket: this.webSocketManager.getStatus(),
      pushNotifications: this.pushNotificationManager.getStatus().subscribed,
      isOnline: navigator.onLine
    };
  }

  // 🔄 Sync quando app torna in foreground
  private async syncOnForeground(): Promise<void> {
    console.log('🔄 [RealTimeEventManager] Syncing on foreground return');
    
    // Riconnetti WebSocket se disconnesso
    if (this.webSocketManager.getStatus() === ConnectionStatus.DISCONNECTED) {
      await this.webSocketManager.reconnect();
    }

    // TODO: Trigger data sync se necessario
    // Questo dovrebbe integrarsi con DataSyncManager
  }

  // 🧠 Helper methods per mapping
  private mapWebSocketPriorityToApp(priority: string): AppEvent['priority'] {
    switch (priority) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private mapAppEventToWebSocket(appEvent: AppEventType): WebSocketEventType | null {
    const mapping: Partial<Record<AppEventType, WebSocketEventType>> = {
      [AppEventType.VOTE_RECEIVED]: WebSocketEventType.VOTE_SUBMITTED,
      [AppEventType.MATCH_CREATED]: WebSocketEventType.MATCH_CREATED,
      [AppEventType.MATCH_STARTED]: WebSocketEventType.MATCH_STARTED,
      [AppEventType.MATCH_ENDED]: WebSocketEventType.MATCH_ENDED,
      [AppEventType.PLAYER_JOINED_MATCH]: WebSocketEventType.PLAYER_JOINED,
      [AppEventType.PLAYER_LEFT_MATCH]: WebSocketEventType.PLAYER_LEFT
    };
    
    return mapping[appEvent] || null;
  }

  private mapAppEventToNotificationType(appEvent: AppEventType): NotificationType | null {
    const mapping: Partial<Record<AppEventType, NotificationType>> = {
      [AppEventType.VOTING_SESSION_STARTED]: NotificationType.VOTE_REMINDER,
      [AppEventType.VOTING_SESSION_ENDED]: NotificationType.VOTING_COMPLETED,
      [AppEventType.MATCH_CREATED]: NotificationType.MATCH_CREATED,
      [AppEventType.MATCH_STARTED]: NotificationType.MATCH_STARTING,
      [AppEventType.MATCH_ENDED]: NotificationType.MATCH_RESULT,
      [AppEventType.AWARD_GRANTED]: NotificationType.AWARD_RECEIVED
    };
    
    return mapping[appEvent] || null;
  }

  private mapNotificationTypeToAppEvent(notType: NotificationType): AppEventType {
    const mapping: Record<NotificationType, AppEventType> = {
      [NotificationType.VOTE_REMINDER]: AppEventType.VOTING_SESSION_STARTED,
      [NotificationType.VOTING_COMPLETED]: AppEventType.VOTING_SESSION_ENDED,
      [NotificationType.MATCH_CREATED]: AppEventType.MATCH_CREATED,
      [NotificationType.MATCH_STARTING]: AppEventType.MATCH_STARTED,
      [NotificationType.MATCH_RESULT]: AppEventType.MATCH_ENDED,
      [NotificationType.AWARD_RECEIVED]: AppEventType.AWARD_GRANTED,
      [NotificationType.STATS_UPDATE]: AppEventType.PLAYER_STATS_CHANGED,
      [NotificationType.MOTM_ANNOUNCEMENT]: AppEventType.AWARD_GRANTED,
      [NotificationType.SYSTEM_UPDATE]: AppEventType.APP_UPDATE_AVAILABLE
    };
    
    return mapping[notType] || AppEventType.SYNC_STATUS_CHANGED;
  }

  private shouldShowNotification(event: AppEvent): boolean {
    // Non mostrare notifiche per eventi a bassa priorità
    if (event.priority === 'low') return false;
    
    // Non mostrare se da local source
    if (event.source === 'local') return false;
    
    // Non mostrare sync status changes
    if (event.type === AppEventType.SYNC_STATUS_CHANGED) return false;
    
    return true;
  }

  private buildNotificationFromEvent(event: AppEvent, type: NotificationType): any {
    return {
      title: this.getEventTitle(event),
      body: this.getEventBody(event),
      data: { ...event.data, appEventType: event.type }
    };
  }

  private getEventTitle(event: AppEvent): string {
    switch (event.type) {
      case AppEventType.VOTE_RECEIVED:
        return '🗳️ Nuovo voto ricevuto';
      case AppEventType.MATCH_CREATED:
        return '⚽ Nuova partita creata';
      case AppEventType.MATCH_STARTED:
        return '🏃‍♂️ Partita iniziata';
      case AppEventType.AWARD_GRANTED:
        return '🏅 Premio ricevuto';
      default:
        return '📱 Calcettinho';
    }
  }

  private getEventBody(event: AppEvent): string {
    switch (event.type) {
      case AppEventType.VOTE_RECEIVED:
        return `Ricevuto voto da ${event.data?.voterName || 'un giocatore'}`;
      case AppEventType.MATCH_CREATED:
        return `Nuova partita: ${event.data?.matchName || 'Match'} creata`;
      case AppEventType.MATCH_STARTED:
        return 'La tua partita è iniziata!';
      case AppEventType.AWARD_GRANTED:
        return `Hai ricevuto: ${event.data?.awardType || 'un premio'}`;
      default:
        return 'Hai un nuovo aggiornamento';
    }
  }

  private addToEventHistory(event: AppEvent): void {
    this.eventHistory.push(event);
    
    // Mantieni solo gli ultimi 100 eventi
    if (this.eventHistory.length > 100) {
      this.eventHistory = this.eventHistory.slice(-100);
    }
  }

  private updateVotingProgress(data: any): void {
    // TODO: Aggiorna progress UI se necessario
    console.log('📊 [RealTimeEventManager] Voting progress updated:', data);
  }

  private handleConnectionStatusChange(status: ConnectionStatus): void {
    console.log(`🔄 [RealTimeEventManager] Connection status changed: ${status}`);
    
    if (status === ConnectionStatus.CONNECTED && this.config.syncOnReconnect) {
      this.syncOnForeground();
    }
  }

  // 🧹 Cleanup
  destroy(): void {
    this.eventSubscriptions.clear();
    this.eventHistory = [];
    this.webSocketManager.disconnect();
    console.log('🧹 [RealTimeEventManager] Destroyed');
  }
} 