// 🎯 FASE 3.3: REAL-TIME FEATURES - WebSocket Manager
// Gestisce connessioni WebSocket per sync real-time e eventi live

export enum WebSocketEventType {
  // Votazioni real-time
  VOTE_SUBMITTED = 'vote_submitted',
  VOTE_PROGRESS = 'vote_progress',
  VOTING_COMPLETED = 'voting_completed',
  
  // Match events
  MATCH_CREATED = 'match_created',
  MATCH_STARTED = 'match_started',
  MATCH_UPDATED = 'match_updated',
  MATCH_ENDED = 'match_ended',
  
  // Player updates
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_STATS_UPDATED = 'player_stats_updated',
  
  // Sistema
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  SYNC_STATUS = 'sync_status',
  
  // Notifiche
  NOTIFICATION_RECEIVED = 'notification_received',
  AWARD_GRANTED = 'award_granted'
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface WebSocketMessage {
  type: WebSocketEventType;
  data: any;
  timestamp: string;
  userId?: string;
  matchId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  messageBufferSize: number;
  enableAutoReconnect: boolean;
}

// 📱 WebSocketManager - Gestione completa connessioni real-time
export class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  private reconnectAttempts = 0;
  private messageQueue: WebSocketMessage[] = [];
  private eventListeners = new Map<WebSocketEventType, Set<Function>>();
  private heartbeatTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private messageBuffer: WebSocketMessage[] = [];
  private lastHeartbeat?: Date;

  // 🔧 Configurazione default
  private static readonly DEFAULT_CONFIG: WebSocketConfig = {
    url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    maxReconnectAttempts: 10,
    reconnectInterval: 2000,
    heartbeatInterval: 30000, // 30 secondi
    messageBufferSize: 100,
    enableAutoReconnect: true
  };

  private constructor(config?: Partial<WebSocketConfig>) {
    this.config = { ...WebSocketManager.DEFAULT_CONFIG, ...config };
    
    // Auto-connect se nel browser
    if (typeof window !== 'undefined') {
      this.connect();
    }
  }

  static getInstance(config?: Partial<WebSocketConfig>): WebSocketManager {
    if (!this.instance) {
      this.instance = new WebSocketManager(config);
    }
    return this.instance;
  }

  // 🔌 Connessione WebSocket
  async connect(): Promise<boolean> {
    if (this.status === ConnectionStatus.CONNECTING || this.status === ConnectionStatus.CONNECTED) {
      return true;
    }

    try {
      this.status = ConnectionStatus.CONNECTING;
      this.notifyStatusChange();

      console.log(`🔌 [WebSocket] Connecting to ${this.config.url}`);

      this.socket = new WebSocket(this.config.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 10000); // 10 secondi timeout

        this.socket!.onopen = (event) => {
          clearTimeout(timeout);
          this.handleOpen(event);
          resolve(true);
        };

        this.socket!.onerror = (event) => {
          clearTimeout(timeout);
          this.handleError(event);
          resolve(false);
        };
      });

    } catch (error) {
      console.error('❌ [WebSocket] Connection error:', error);
      this.status = ConnectionStatus.ERROR;
      this.notifyStatusChange();
      return false;
    }
  }

  // 📤 Invio messaggio con retry e buffer
  async send(type: WebSocketEventType, data: any, options?: {
    priority?: 'low' | 'medium' | 'high' | 'critical';
    requireConnection?: boolean;
    userId?: string;
    matchId?: string;
  }): Promise<boolean> {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
      priority: options?.priority || 'medium',
      userId: options?.userId,
      matchId: options?.matchId
    };

    // Se connesso, invia immediatamente
    if (this.status === ConnectionStatus.CONNECTED && this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
        console.log(`📤 [WebSocket] Sent ${type}:`, data);
        return true;
      } catch (error) {
        console.error(`❌ [WebSocket] Send error for ${type}:`, error);
      }
    }

    // Altrimenti metti in coda (se non richiede connessione obbligatoria)
    if (!options?.requireConnection) {
      this.queueMessage(message);
      
      // Prova a riconnettere se disconnesso
      if (this.status === ConnectionStatus.DISCONNECTED && this.config.enableAutoReconnect) {
        this.connect();
      }
      
      return true;
    }

    return false;
  }

  // 👂 Listener per eventi specifici
  on(eventType: WebSocketEventType, callback: (data: any, message: WebSocketMessage) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(callback);

    console.log(`👂 [WebSocket] Added listener for ${eventType}`);

    // Ritorna funzione per rimuovere listener
    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  // 📢 Rimuovi tutti i listener per un evento
  off(eventType: WebSocketEventType): void {
    this.eventListeners.delete(eventType);
    console.log(`🔇 [WebSocket] Removed all listeners for ${eventType}`);
  }

  // 🔗 Gestione apertura connessione
  private handleOpen(event: Event): void {
    console.log('✅ [WebSocket] Connected successfully');
    
    this.status = ConnectionStatus.CONNECTED;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = new Date();
    
    // Avvia heartbeat
    this.startHeartbeat();
    
    // Invia messaggi in coda
    this.flushMessageQueue();
    
    // Notifica stato
    this.notifyStatusChange();
    
    // Autenticazione (se necessaria)
    this.authenticate();
  }

  // 📨 Gestione messaggi ricevuti
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      console.log(`📨 [WebSocket] Received ${message.type}:`, message.data);

      // Aggiorna buffer messaggi
      this.addToMessageBuffer(message);

      // Gestione messaggi di sistema
      if (message.type === 'heartbeat') {
        this.lastHeartbeat = new Date();
        return;
      }

      // Emetti evento ai listener
      this.emitEvent(message.type, message.data, message);

    } catch (error) {
      console.error('❌ [WebSocket] Message parsing error:', error);
    }
  }

  // 🔒 Gestione chiusura connessione
  private handleClose(event: CloseEvent): void {
    console.log(`🔒 [WebSocket] Connection closed (${event.code}): ${event.reason}`);
    
    this.status = ConnectionStatus.DISCONNECTED;
    this.stopHeartbeat();
    this.notifyStatusChange();

    // Auto-reconnect se abilitato
    if (this.config.enableAutoReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  // ⚠️ Gestione errori
  private handleError(event: Event): void {
    console.error('⚠️ [WebSocket] Connection error:', event);
    
    this.status = ConnectionStatus.ERROR;
    this.notifyStatusChange();
  }

  // 🔄 Programma riconnessione
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    this.status = ConnectionStatus.RECONNECTING;
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 secondi
    );

    console.log(`🔄 [WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);

    this.notifyStatusChange();
  }

  // 💓 Heartbeat per mantenere connessione
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  // 🔐 Autenticazione (se necessaria)
  private authenticate(): void {
    // Invia token di autenticazione se disponibile
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.send(WebSocketEventType.USER_ONLINE, {
        token,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }, { priority: 'high', requireConnection: true });
    }
  }

  // 📋 Gestione coda messaggi
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Mantieni dimensione coda limitata
    if (this.messageQueue.length > this.config.messageBufferSize) {
      // Rimuovi messaggi meno prioritari prima
      this.messageQueue.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
      this.messageQueue = this.messageQueue.slice(0, this.config.messageBufferSize);
    }

    console.log(`📋 [WebSocket] Queued message ${message.type} (${this.messageQueue.length} in queue)`);
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 [WebSocket] Flushing ${this.messageQueue.length} queued messages`);

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        try {
          this.socket.send(JSON.stringify(message));
        } catch (error) {
          console.error(`❌ [WebSocket] Error flushing message ${message.type}:`, error);
          this.queueMessage(message); // Rimetti in coda
        }
      }
    });
  }

  // 🎯 Emissione eventi
  private emitEvent(type: WebSocketEventType, data: any, message: WebSocketMessage): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data, message);
        } catch (error) {
          console.error(`❌ [WebSocket] Listener error for ${type}:`, error);
        }
      });
    }
  }

  // 📦 Buffer messaggi ricevuti
  private addToMessageBuffer(message: WebSocketMessage): void {
    this.messageBuffer.push(message);
    
    if (this.messageBuffer.length > this.config.messageBufferSize) {
      this.messageBuffer.shift(); // Rimuovi il più vecchio
    }
  }

  // 📊 Stato e statistiche
  getStatus(): ConnectionStatus {
    return this.status;
  }

  getStats(): {
    status: ConnectionStatus;
    reconnectAttempts: number;
    queuedMessages: number;
    bufferedMessages: number;
    lastHeartbeat?: Date;
    uptime?: number;
  } {
    return {
      status: this.status,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      bufferedMessages: this.messageBuffer.length,
      lastHeartbeat: this.lastHeartbeat,
      uptime: this.lastHeartbeat ? Date.now() - this.lastHeartbeat.getTime() : undefined
    };
  }

  // 🔔 Notifica cambio stato
  private notifyStatusChange(): void {
    this.emitEvent(WebSocketEventType.SYNC_STATUS, {
      status: this.status,
      timestamp: new Date().toISOString(),
      stats: this.getStats()
    }, {
      type: WebSocketEventType.SYNC_STATUS,
      data: { status: this.status },
      timestamp: new Date().toISOString(),
      priority: 'medium'
    });
  }

  // 🧹 Cleanup e disconnessione
  disconnect(): void {
    this.config.enableAutoReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, 'Manual disconnect');
      this.socket = null;
    }
    
    this.status = ConnectionStatus.DISCONNECTED;
    this.notifyStatusChange();
    
    console.log('👋 [WebSocket] Disconnected manually');
  }

  // 🔄 Riconnessione manuale
  reconnect(): Promise<boolean> {
    this.disconnect();
    this.config.enableAutoReconnect = true;
    this.reconnectAttempts = 0;
    return this.connect();
  }
} 