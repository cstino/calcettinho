// 🎯 FASE 3.3: REAL-TIME FEATURES - Push Notification Subscription API
// Gestisce subscription/unsubscription push notifications

import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;

if (!apiKey || !baseId) {
  throw new Error('Missing Airtable configuration for notifications');
}

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: apiKey
});

const base = Airtable.base(baseId);

interface PushSubscriptionData {
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

interface NotificationPreferences {
  enabled: boolean;
  types: Record<string, boolean>;
  schedule: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  sound: boolean;
  vibration: boolean;
}

// 📝 POST: Subscribe a push notifications
export async function POST(request: NextRequest) {
  try {
    const subscriptionData: PushSubscriptionData = await request.json();

    console.log('📝 [Notifications] New subscription request');

    // Validazione dati
    if (!subscriptionData.endpoint || !subscriptionData.keys?.p256dh || !subscriptionData.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data: missing endpoint or keys' },
        { status: 400 }
      );
    }

    // Controlla se subscription già esiste
    const existingRecords = await base('push_subscriptions').select({
      filterByFormula: `{endpoint} = "${subscriptionData.endpoint}"`
    }).all();

    if (existingRecords.length > 0) {
      // Aggiorna subscription esistente
      const existingRecord = existingRecords[0];
      
      await base('push_subscriptions').update(existingRecord.id, {
        p256dh_key: subscriptionData.keys.p256dh,
        auth_key: subscriptionData.keys.auth,
        user_email: subscriptionData.userEmail || '',
        preferences: JSON.stringify(subscriptionData.preferences),
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active'
      });

      console.log('✅ [Notifications] Updated existing subscription');

      return NextResponse.json({
        success: true,
        message: 'Subscription updated successfully',
        subscriptionId: existingRecord.id
      });
    }

    // Crea nuova subscription
    const record = await base('push_subscriptions').create({
      endpoint: subscriptionData.endpoint,
      p256dh_key: subscriptionData.keys.p256dh,
      auth_key: subscriptionData.keys.auth,
      user_email: subscriptionData.userEmail || '',
      preferences: JSON.stringify(subscriptionData.preferences),
      created_at: subscriptionData.createdAt,
      last_used: new Date().toISOString(),
      status: 'active'
    });

    console.log('✅ [Notifications] Created new subscription:', record.id);

    return NextResponse.json({
      success: true,
      message: 'Subscription created successfully',
      subscriptionId: record.id
    });

  } catch (error) {
    console.error('❌ [Notifications] Subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 🗑️ DELETE: Unsubscribe from push notifications  
export async function DELETE(request: NextRequest) {
  try {
    const { endpoint } = await request.json();

    console.log('🗑️ [Notifications] Unsubscribe request for:', endpoint);

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required for unsubscribe' },
        { status: 400 }
      );
    }

    // Trova subscription esistente
    const existingRecords = await base('push_subscriptions').select({
      filterByFormula: `{endpoint} = "${endpoint}"`
    }).all();

    if (existingRecords.length === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Soft delete: marca come inattiva
    const record = existingRecords[0];
    await base('push_subscriptions').update(record.id, {
      status: 'inactive',
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('✅ [Notifications] Subscription deactivated:', record.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });

  } catch (error) {
    console.error('❌ [Notifications] Unsubscribe error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during unsubscribe',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// 📊 GET: Get subscription status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const userEmail = searchParams.get('userEmail');

    console.log('📊 [Notifications] Status request');

    let filterFormula = '';
    
    if (endpoint) {
      filterFormula = `{endpoint} = "${endpoint}"`;
    } else if (userEmail) {
      filterFormula = `{user_email} = "${userEmail}"`;
    } else {
      return NextResponse.json(
        { error: 'Either endpoint or userEmail parameter is required' },
        { status: 400 }
      );
    }

    const records = await base('push_subscriptions').select({
      filterByFormula: `AND(${filterFormula}, {status} = "active")`
    }).all();

    const subscriptions = records.map(record => ({
      id: record.id,
      endpoint: record.get('endpoint'),
      userEmail: record.get('user_email'),
      preferences: JSON.parse(record.get('preferences') as string || '{}'),
      createdAt: record.get('created_at'),
      lastUsed: record.get('last_used')
    }));

    return NextResponse.json({
      success: true,
      subscriptions,
      count: subscriptions.length
    });

  } catch (error) {
    console.error('❌ [Notifications] Status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during status check',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 