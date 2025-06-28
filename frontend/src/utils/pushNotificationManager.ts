// 🎯 FASE 3.3: REAL-TIME FEATURES - Push Notification Manager
// Gestisce push notifications complete con template e subscription management

export enum NotificationType {
  VOTE_REMINDER = 'vote_reminder',
  VOTING_COMPLETED = 'voting_completed',
  MATCH_CREATED = 'match_created',
  MATCH_STARTING = 'match_starting',
  MATCH_RESULT = 'match_result',
  AWARD_RECEIVED = 'award_received',
  STATS_UPDATE = 'stats_update',
  MOTM_ANNOUNCEMENT = 'motm_announcement',
  SYSTEM_UPDATE = 'system_update'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  actions?: NotificationAction[];
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userEmail?: string;
  preferences: NotificationPreferences;
  createdAt: string;
  lastUsed?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  types: Partial<Record<NotificationType, boolean>>;
  schedule: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string;   // HH:mm
  };
  sound: boolean;
  vibration: boolean;
}

// 📱 PushNotificationManager - Sistema completo push notifications
export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;
  private preferences: NotificationPreferences;
  private vapidPublicKey: string;

  // 🔧 Configurazione VAPID
  private static readonly DEFAULT_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
    'BEl62iUYgUivxIkv69yViEuiBIa40HcCWKkGzMy4d0Ql6iBCm7nXEE1A5m3sXaQ4e9jCUEYAOOh1gIfMHyPdECM';

  // 📋 Template notifiche predefiniti
  private static readonly NOTIFICATION_TEMPLATES: Record<NotificationType, Partial<NotificationTemplate>> = {
    [NotificationType.VOTE_REMINDER]: {
      title: '⚽ Tempo di votare!',
      body: 'Ricordati di votare per la partita appena finita',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      actions: [
        { action: 'vote', title: 'Vota ora', icon: '/icons/vote.png' },
        { action: 'dismiss', title: 'Più tardi' }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200]
    },
    [NotificationType.VOTING_COMPLETED]: {
      title: '🗳️ Votazioni chiuse',
      body: 'Le votazioni sono terminate. Guarda i risultati!',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'view_results', title: 'Vedi risultati' },
        { action: 'dismiss', title: 'Chiudi' }
      ]
    },
    [NotificationType.MATCH_CREATED]: {
      title: '⚽ Nuova partita creata!',
      body: 'È stata creata una nuova partita. Vuoi partecipare?',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'join_match', title: 'Partecipa' },
        { action: 'view_match', title: 'Visualizza' }
      ],
      vibrate: [100, 50, 100, 50, 100]
    },
    [NotificationType.MATCH_STARTING]: {
      title: '🏃‍♂️ Partita in corso!',
      body: 'La tua partita sta per iniziare. Preparati!',
      icon: '/icons/icon-192x192.png',
      requireInteraction: true,
      vibrate: [300, 200, 300]
    },
    [NotificationType.MATCH_RESULT]: {
      title: '🏆 Risultato partita',
      body: 'La partita è terminata! Controlla il risultato',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'view_result', title: 'Vedi risultato' },
        { action: 'vote', title: 'Vota giocatori' }
      ]
    },
    [NotificationType.AWARD_RECEIVED]: {
      title: '🏅 Complimenti!',
      body: 'Hai ricevuto un nuovo premio!',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'view_award', title: 'Visualizza premio' },
        { action: 'share', title: 'Condividi' }
      ],
      requireInteraction: true,
      vibrate: [500, 300, 500, 300, 500]
    },
    [NotificationType.STATS_UPDATE]: {
      title: '📊 Statistiche aggiornate',
      body: 'Le tue statistiche sono state aggiornate',
      icon: '/icons/icon-192x192.png'
    },
    [NotificationType.MOTM_ANNOUNCEMENT]: {
      title: '⭐ Man of the Match!',
      body: 'È stato assegnato il Man of the Match!',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'congratulate', title: 'Congratulati' },
        { action: 'view_profile', title: 'Vedi profilo' }
      ],
      requireInteraction: true
    },
    [NotificationType.SYSTEM_UPDATE]: {
      title: '🔄 Aggiornamento disponibile',
      body: 'È disponibile una nuova versione dell\'app',
      icon: '/icons/icon-192x192.png',
      actions: [
        { action: 'update', title: 'Aggiorna' },
        { action: 'later', title: 'Più tardi' }
      ]
    }
  };

  // 🔧 Preferenze di default
  private static readonly DEFAULT_PREFERENCES: NotificationPreferences = {
    enabled: false,
    types: {
      [NotificationType.VOTE_REMINDER]: true,
      [NotificationType.VOTING_COMPLETED]: true,
      [NotificationType.MATCH_CREATED]: true,
      [NotificationType.MATCH_STARTING]: true,
      [NotificationType.MATCH_RESULT]: true,
      [NotificationType.AWARD_RECEIVED]: true,
      [NotificationType.STATS_UPDATE]: false,
      [NotificationType.MOTM_ANNOUNCEMENT]: true,
      [NotificationType.SYSTEM_UPDATE]: true
    },
    schedule: {
      enabled: true,
      startTime: '08:00',
      endTime: '22:00'
    },
    sound: true,
    vibration: true
  };

  private constructor() {
    this.vapidPublicKey = PushNotificationManager.DEFAULT_VAPID_KEY;
    this.preferences = this.loadPreferences();
    
    if (typeof window !== 'undefined') {
      this.initializeServiceWorker();
    }
  }

  static getInstance(): PushNotificationManager {
    if (!this.instance) {
      this.instance = new PushNotificationManager();
    }
    return this.instance;
  }

  // 🔧 Inizializzazione Service Worker
  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
        console.log('✅ [PushNotification] Service Worker ready');
        
        // Controlla subscription esistente
        await this.checkExistingSubscription();
        
      } catch (error) {
        console.error('❌ [PushNotification] Service Worker initialization error:', error);
      }
    }
  }

  // 🔍 Controlla support push notifications
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // 📝 Richiesta permessi
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('⚠️ [PushNotification] Push notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log(`🔔 [PushNotification] Permission status: ${permission}`);
      
      if (permission === 'granted') {
        this.preferences.enabled = true;
        this.savePreferences();
      }
      
      return permission;
    } catch (error) {
      console.error('❌ [PushNotification] Permission request error:', error);
      return 'denied';
    }
  }

  // 📡 Subscription management
  async subscribe(userEmail?: string): Promise<boolean> {
    if (!this.registration) {
      console.error('❌ [PushNotification] Service Worker not ready');
      return false;
    }

    if (Notification.permission !== 'granted') {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    try {
      // Controlla subscription esistente
      let subscription = await this.registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Crea nuova subscription
        subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
      }

      this.subscription = subscription;
      
      // Salva subscription sul server
      const success = await this.saveSubscriptionToServer(subscription, userEmail);
      
      if (success) {
        console.log('✅ [PushNotification] Successfully subscribed');
        return true;
      }
      
      return false;

    } catch (error) {
      console.error('❌ [PushNotification] Subscription error:', error);
      return false;
    }
  }

  // 🗑️ Unsubscribe
  async unsubscribe(): Promise<boolean> {
    try {
      if (this.subscription) {
        const success = await this.subscription.unsubscribe();
        if (success) {
          // Rimuovi dal server
          await this.removeSubscriptionFromServer();
          this.subscription = null;
          console.log('✅ [PushNotification] Successfully unsubscribed');
        }
        return success;
      }
      return true;
    } catch (error) {
      console.error('❌ [PushNotification] Unsubscribe error:', error);
      return false;
    }
  }

  // 📤 Invio notifica locale
  async showNotification(
    type: NotificationType,
    customData?: Partial<NotificationTemplate>
  ): Promise<boolean> {
    if (!this.canShowNotification(type)) {
      return false;
    }

    try {
      const template = this.buildNotificationTemplate(type, customData);
      
      if (this.registration) {
        // Service Worker notification
        await this.registration.showNotification(template.title, {
          body: template.body,
          icon: template.icon,
          badge: template.badge,
          image: template.image,
          actions: template.actions,
          data: template.data,
          tag: template.tag || type,
          requireInteraction: template.requireInteraction,
          silent: template.silent,
          vibrate: this.preferences.vibration ? template.vibrate : undefined
        });
      } else {
        // Fallback notification
        new Notification(template.title, {
          body: template.body,
          icon: template.icon,
          data: template.data,
          tag: template.tag || type,
          requireInteraction: template.requireInteraction,
          silent: template.silent
        });
      }

      console.log(`📢 [PushNotification] Shown notification: ${type}`);
      return true;

    } catch (error) {
      console.error(`❌ [PushNotification] Show notification error for ${type}:`, error);
      return false;
    }
  }

  // 🎨 Costruisce template notifica
  private buildNotificationTemplate(
    type: NotificationType,
    customData?: Partial<NotificationTemplate>
  ): NotificationTemplate {
    const baseTemplate = PushNotificationManager.NOTIFICATION_TEMPLATES[type];
    
    return {
      type,
      title: customData?.title || baseTemplate.title || 'Calcettinho',
      body: customData?.body || baseTemplate.body || 'Hai una nuova notifica',
      icon: customData?.icon || baseTemplate.icon || '/icons/icon-192x192.png',
      badge: customData?.badge || baseTemplate.badge || '/icons/icon-192x192.png',
      image: customData?.image || baseTemplate.image,
      actions: customData?.actions || baseTemplate.actions,
      data: { ...baseTemplate.data, ...customData?.data, type },
      tag: customData?.tag || baseTemplate.tag,
      requireInteraction: customData?.requireInteraction ?? baseTemplate.requireInteraction,
      silent: customData?.silent ?? baseTemplate.silent,
      vibrate: customData?.vibrate || baseTemplate.vibrate
    };
  }

  // ✅ Controlla se può mostrare notifica
  private canShowNotification(type: NotificationType): boolean {
    // Controllo permessi
    if (Notification.permission !== 'granted') {
      return false;
    }

    // Controllo preferenze globali
    if (!this.preferences.enabled) {
      return false;
    }

    // Controllo preferenze specifiche tipo
    if (this.preferences.types[type] === false) {
      return false;
    }

    // Controllo orario (se abilitato)
    if (this.preferences.schedule.enabled && !this.isWithinSchedule()) {
      return false;
    }

    return true;
  }

  // 🕐 Controlla se è nell'orario consentito
  private isWithinSchedule(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = this.preferences.schedule;
    
    // Gestisce caso che supera mezzanotte
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // 💾 Salva subscription sul server
  private async saveSubscriptionToServer(
    subscription: PushSubscription,
    userEmail?: string
  ): Promise<boolean> {
    try {
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        },
        userEmail,
        preferences: this.preferences,
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });

      return response.ok;

    } catch (error) {
      console.error('❌ [PushNotification] Save subscription error:', error);
      return false;
    }
  }

  // 🗑️ Rimuovi subscription dal server
  private async removeSubscriptionFromServer(): Promise<boolean> {
    try {
      if (!this.subscription) return true;

      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        })
      });

      return response.ok;

    } catch (error) {
      console.error('❌ [PushNotification] Remove subscription error:', error);
      return false;
    }
  }

  // 🔍 Controlla subscription esistente
  private async checkExistingSubscription(): Promise<void> {
    if (!this.registration) return;

    try {
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (this.subscription) {
        console.log('✅ [PushNotification] Found existing subscription');
        // Aggiorna ultima attività
        await this.updateSubscriptionActivity();
      }
    } catch (error) {
      console.error('❌ [PushNotification] Check subscription error:', error);
    }
  }

  // 🔄 Aggiorna attività subscription
  private async updateSubscriptionActivity(): Promise<void> {
    if (!this.subscription) return;

    try {
      await fetch('/api/notifications/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
          lastUsed: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('⚠️ [PushNotification] Update activity error:', error);
    }
  }

  // 🔧 Utility per VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  }

  // 💾 Gestione preferenze
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
    
    // Aggiorna preferenze sul server se sottoscritto
    if (this.subscription) {
      this.updateServerPreferences();
    }
  }

  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem('notification_preferences');
      if (stored) {
        return { ...PushNotificationManager.DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('⚠️ [PushNotification] Load preferences error:', error);
    }
    
    return { ...PushNotificationManager.DEFAULT_PREFERENCES };
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('⚠️ [PushNotification] Save preferences error:', error);
    }
  }

  private async updateServerPreferences(): Promise<void> {
    if (!this.subscription) return;

    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint,
          preferences: this.preferences
        })
      });
    } catch (error) {
      console.warn('⚠️ [PushNotification] Update server preferences error:', error);
    }
  }

  // 📊 Stato e statistiche
  getStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
    preferences: NotificationPreferences;
  } {
    return {
      supported: this.isSupported(),
      permission: Notification.permission,
      subscribed: !!this.subscription,
      preferences: this.preferences
    };
  }

  // 🧪 Test notifica
  async testNotification(): Promise<boolean> {
    return await this.showNotification(NotificationType.SYSTEM_UPDATE, {
      title: '🧪 Test Notifica',
      body: 'Questa è una notifica di test per verificare il funzionamento',
      requireInteraction: false
    });
  }
} 