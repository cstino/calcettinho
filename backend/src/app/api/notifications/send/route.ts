// 🎯 FASE 3.3: REAL-TIME FEATURES - Send Push Notifications API
// Invia push notifications usando web-push library

import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import webPush from 'web-push';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

// Configurazione VAPID per web-push
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@calcettinho.app';

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration for notifications');
}

if (!vapidPublicKey || !vapidPrivateKey) {
  console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
} else {
  webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

// 📤 Interfacce per notification request
interface NotificationRequest {
  type: 'single' | 'broadcast' | 'targeted';
  recipients?: string[]; // user emails o endpoints
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    data?: any;
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
    requireInteraction?: boolean;
    silent?: boolean;
    tag?: string;
    vibrate?: number[];
  };
  options?: {
    scheduleTime?: string; // ISO date per scheduling
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    ttl?: number; // Time to live in seconds
    topic?: string;
  };
}

interface NotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  results: Array<{
    endpoint: string;
    success: boolean;
    error?: string;
  }>;
}

// 📤 POST: Send push notifications
export async function POST(request: NextRequest) {
  try {
    const notificationRequest: NotificationRequest = await request.json();

    console.log(`📤 [NotificationSend] ${notificationRequest.type} notification request`);

    // Validazione
    if (!notificationRequest.notification?.title || !notificationRequest.notification?.body) {
      return NextResponse.json(
        { error: 'Notification title and body are required' },
        { status: 400 }
      );
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: 'VAPID keys not configured on server' },
        { status: 500 }
      );
    }

    // Recupera subscription targets
    const subscriptions = await getTargetSubscriptions(notificationRequest);
    
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'No active subscriptions found for the specified targets',
          sent: 0,
          failed: 0
        }
      );
    }

    console.log(`📡 [NotificationSend] Sending to ${subscriptions.length} subscriptions`);

    // Invia notifiche
    const result = await sendNotifications(subscriptions, notificationRequest);

    // Log risultati
    await logNotificationResults(notificationRequest, result);

    console.log(`✅ [NotificationSend] Completed: ${result.sent} sent, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Notifications sent successfully`,
      ...result
    });

  } catch (error) {
    console.error('❌ [NotificationSend] Send error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during notification send',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 🎯 Recupera subscription targets in base al tipo di richiesta
async function getTargetSubscriptions(request: NotificationRequest) {
  let filterFormula = '{status} = "active"';

  switch (request.type) {
    case 'single':
      if (!request.recipients || request.recipients.length === 0) {
        throw new Error('Recipients required for single notification');
      }
      
      // Assume che recipients siano email
      const emailFilter = request.recipients.map(email => `{user_email} = "${email}"`).join(', ');
      filterFormula = `AND(${filterFormula}, OR(${emailFilter}))`;
      break;

    case 'targeted':
      if (!request.recipients || request.recipients.length === 0) {
        throw new Error('Recipients required for targeted notification');
      }
      
      // Recipients possono essere email o endpoints
      const targetFilters = request.recipients.map(target => {
        if (target.includes('@')) {
          return `{user_email} = "${target}"`;
        } else {
          return `{endpoint} = "${target}"`;
        }
      });
      filterFormula = `AND(${filterFormula}, OR(${targetFilters.join(', ')}))`;
      break;

    case 'broadcast':
      // Nessun filtro aggiuntivo, invia a tutti
      break;

    default:
      throw new Error(`Invalid notification type: ${request.type}`);
  }

  const records = await base('push_subscriptions').select({
    filterByFormula: filterFormula
  }).all();

  return records.map(record => ({
    id: record.id,
    endpoint: record.get('endpoint') as string,
    p256dh: record.get('p256dh_key') as string,
    auth: record.get('auth_key') as string,
    userEmail: record.get('user_email') as string,
    preferences: JSON.parse(record.get('preferences') as string || '{}')
  }));
}

// 📡 Invia notifiche a tutte le subscription
async function sendNotifications(
  subscriptions: any[], 
  request: NotificationRequest
): Promise<NotificationResult> {
  const results: NotificationResult['results'] = [];
  let sent = 0;
  let failed = 0;

  // Prepara payload notifica
  const payload = JSON.stringify({
    title: request.notification.title,
    body: request.notification.body,
    icon: request.notification.icon || '/icons/icon-192x192.png',
    badge: request.notification.badge || '/icons/icon-192x192.png',
    image: request.notification.image,
    data: request.notification.data || {},
    actions: request.notification.actions || [],
    requireInteraction: request.notification.requireInteraction || false,
    silent: request.notification.silent || false,
    tag: request.notification.tag,
    vibrate: request.notification.vibrate
  });

  // Opzioni web-push
  const options: any = {
    vapidDetails: {
      subject: vapidEmail,
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey
    },
    TTL: request.options?.ttl || 3600, // 1 ora default
    urgency: mapPriorityToUrgency(request.options?.priority || 'normal'),
    topic: request.options?.topic
  };

  // Invia in batch per performance
  const batchSize = 10;
  for (let i = 0; i < subscriptions.length; i += batchSize) {
    const batch = subscriptions.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (subscription) => {
      try {
        // Controlla preferenze utente (se disponibili)
        if (!canSendToSubscription(subscription, request)) {
          results.push({
            endpoint: subscription.endpoint,
            success: false,
            error: 'User preferences prevent notification'
          });
          failed++;
          return;
        }

        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        };

        await webPush.sendNotification(pushSubscription, payload, options);
        
        results.push({
          endpoint: subscription.endpoint,
          success: true
        });
        sent++;

        // Aggiorna last_used
        updateSubscriptionActivity(subscription.id);

      } catch (error) {
        console.error(`❌ Send failed for ${subscription.endpoint}:`, error);
        
        let errorMessage = 'Unknown error';
        if (error instanceof webPush.WebPushError) {
          errorMessage = `${error.statusCode}: ${error.body}`;
          
          // Rimuovi subscription se endpoint non valido
          if (error.statusCode === 410) {
            markSubscriptionInactive(subscription.id, 'endpoint_invalid');
          }
        }
        
        results.push({
          endpoint: subscription.endpoint,
          success: false,
          error: errorMessage
        });
        failed++;
      }
    });

    await Promise.all(batchPromises);
    
    // Pausa tra batch per rispettare rate limits
    if (i + batchSize < subscriptions.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { success: true, sent, failed, results };
}

// ✅ Controlla se può inviare notifica a subscription
function canSendToSubscription(subscription: any, request: NotificationRequest): boolean {
  const preferences = subscription.preferences;
  
  if (!preferences?.enabled) {
    return false;
  }

  // Controlla orario se presente
  if (preferences.schedule?.enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const { startTime, endTime } = preferences.schedule;
    
    let withinSchedule = false;
    if (startTime <= endTime) {
      withinSchedule = currentTime >= startTime && currentTime <= endTime;
    } else {
      withinSchedule = currentTime >= startTime || currentTime <= endTime;
    }
    
    if (!withinSchedule) {
      return false;
    }
  }

  // Controlla tipo notifica se presente nelle preferenze
  const notificationType = request.notification.data?.type;
  if (notificationType && preferences.types && preferences.types[notificationType] === false) {
    return false;
  }

  return true;
}

// 🎚️ Mappa priorità a urgency di web-push
function mapPriorityToUrgency(priority: string): 'very-low' | 'low' | 'normal' | 'high' {
  switch (priority) {
    case 'low': return 'low';
    case 'high': return 'high';
    case 'urgent': return 'high';
    default: return 'normal';
  }
}

// 🔄 Aggiorna attività subscription
async function updateSubscriptionActivity(subscriptionId: string): Promise<void> {
  try {
    await base('push_subscriptions').update(subscriptionId, {
      last_used: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`⚠️ Failed to update activity for ${subscriptionId}:`, error);
  }
}

// ❌ Marca subscription come inattiva
async function markSubscriptionInactive(subscriptionId: string, reason: string): Promise<void> {
  try {
    await base('push_subscriptions').update(subscriptionId, {
      status: 'inactive',
      inactive_reason: reason,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.warn(`⚠️ Failed to mark subscription inactive ${subscriptionId}:`, error);
  }
}

// 📋 Log risultati notifica
async function logNotificationResults(
  request: NotificationRequest, 
  result: NotificationResult
): Promise<void> {
  try {
    await base('notification_logs').create({
      type: request.type,
      title: request.notification.title,
      body: request.notification.body,
      sent_count: result.sent,
      failed_count: result.failed,
      total_targets: result.sent + result.failed,
      success_rate: ((result.sent / (result.sent + result.failed)) * 100).toFixed(2),
      sent_at: new Date().toISOString(),
      payload: JSON.stringify(request)
    });
  } catch (error) {
    console.warn('⚠️ Failed to log notification results:', error);
  }
}

// 📊 GET: Notification statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Statistiche generali
    const logs = await base('notification_logs').select({
      filterByFormula: `IS_AFTER({sent_at}, '${cutoffDate.toISOString()}')`,
      sort: [{ field: 'sent_at', direction: 'desc' }]
    }).all();

    const stats = {
      totalNotifications: logs.length,
      totalSent: logs.reduce((sum, log) => sum + (log.get('sent_count') as number || 0), 0),
      totalFailed: logs.reduce((sum, log) => sum + (log.get('failed_count') as number || 0), 0),
      averageSuccessRate: logs.length > 0 ? 
        logs.reduce((sum, log) => sum + parseFloat(log.get('success_rate') as string || '0'), 0) / logs.length : 0,
      recentLogs: logs.slice(0, 10).map(log => ({
        id: log.id,
        type: log.get('type'),
        title: log.get('title'),
        sentCount: log.get('sent_count'),
        failedCount: log.get('failed_count'),
        successRate: log.get('success_rate'),
        sentAt: log.get('sent_at')
      }))
    };

    // Statistiche subscription attive
    const activeSubscriptions = await base('push_subscriptions').select({
      filterByFormula: '{status} = "active"'
    }).all();

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        activeSubscriptions: activeSubscriptions.length,
        period: `${days} days`
      }
    });

  } catch (error) {
    console.error('❌ [NotificationSend] Stats error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during stats retrieval',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 