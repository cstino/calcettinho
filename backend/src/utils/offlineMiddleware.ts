/**
 * 🔄 OFFLINE MIDDLEWARE
 * Gestisce richieste offline-aware con conflict resolution e batch support
 */

import { NextRequest, NextResponse } from 'next/server';

interface OfflineHeaders {
  isOfflineRequest: boolean;
  actionId?: string;
  originalTimestamp?: number;
  syncPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  conflictResolution?: 'OVERWRITE' | 'MERGE' | 'USER_CHOICE';
  batchRequest?: boolean;
  networkType?: string;
  lastSync?: number;
}

interface ConflictData {
  field: string;
  localValue: any;
  serverValue: any;
  timestamp: number;
}

interface BatchResult {
  success: boolean;
  actionId: string;
  operation: string;
  data?: any;
  error?: string;
  conflicts?: ConflictData[];
}

class OfflineMiddleware {
  
  /**
   * 🔍 Analizza headers offline-aware
   */
  static parseOfflineHeaders(request: NextRequest): OfflineHeaders {
    const headers = request.headers;
    
    return {
      isOfflineRequest: headers.get('X-Offline-Action') === 'true',
      actionId: headers.get('X-Action-ID') || undefined,
      originalTimestamp: headers.get('X-Original-Timestamp') ? 
        parseInt(headers.get('X-Original-Timestamp')!) : undefined,
      syncPriority: (headers.get('X-Sync-Priority') as any) || 'MEDIUM',
      conflictResolution: (headers.get('X-Conflict-Resolution') as any) || 'MERGE',
      batchRequest: headers.get('X-Batch-Request') === 'true',
      networkType: headers.get('X-Network-Type') || 'unknown',
      lastSync: headers.get('X-Last-Sync') ? 
        parseInt(headers.get('X-Last-Sync')!) : undefined
    };
  }

  /**
   * 📊 Crea response headers per offline support
   */
  static createOfflineHeaders(data?: any): Record<string, string> {
    const now = Date.now();
    
    return {
      'X-Server-Timestamp': now.toString(),
      'X-Supports-Offline': 'true',
      'X-Supports-Batch': 'true',
      'X-Supports-Delta-Sync': 'true',
      'X-Max-Batch-Size': '50',
      'Cache-Control': 'no-cache, must-revalidate',
      'Last-Modified': new Date(now).toUTCString(),
      ...(data?.etag && { 'ETag': data.etag }),
      ...(data?.version && { 'X-Data-Version': data.version.toString() })
    };
  }

  /**
   * 🔍 Detecta conflitti di dati
   */
  static detectConflicts(
    localData: any, 
    serverData: any, 
    originalTimestamp?: number
  ): ConflictData[] {
    const conflicts: ConflictData[] = [];
    
    if (!serverData || !localData) return conflicts;

    // Verifica timestamp-based conflicts
    if (originalTimestamp && serverData.updatedAt) {
      const serverUpdateTime = new Date(serverData.updatedAt).getTime();
      if (serverUpdateTime > originalTimestamp) {
        // Dati server più recenti - possibile conflitto
        
        // Compara campi specifici
        const fieldsToCheck = ['voteType', 'motm_vote', 'overall', 'gol', 'assistenze'];
        
        fieldsToCheck.forEach(field => {
          if (localData[field] !== undefined && 
              serverData[field] !== undefined && 
              localData[field] !== serverData[field]) {
            conflicts.push({
              field,
              localValue: localData[field],
              serverValue: serverData[field],
              timestamp: serverUpdateTime
            });
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * 🔀 Risolve conflitti automaticamente
   */
  static resolveConflicts(
    conflicts: ConflictData[],
    localData: any,
    serverData: any,
    strategy: 'OVERWRITE' | 'MERGE' | 'USER_CHOICE' = 'MERGE'
  ): { resolved: any; needsUserChoice: boolean } {
    
    if (conflicts.length === 0) {
      return { resolved: localData, needsUserChoice: false };
    }

    switch (strategy) {
      case 'OVERWRITE':
        // Usa sempre dati locali
        return { resolved: localData, needsUserChoice: false };

      case 'MERGE':
        // Merge intelligente
        const merged = { ...serverData };
        
        conflicts.forEach(conflict => {
          // Logica di merge per campo
          switch (conflict.field) {
            case 'voteType':
              // Per voti, prendi quello con timestamp più recente
              merged[conflict.field] = localData[conflict.field];
              break;
              
            case 'overall':
            case 'gol':
            case 'assistenze':
              // Per stats numeriche, prendi il valore maggiore
              merged[conflict.field] = Math.max(
                localData[conflict.field] || 0,
                serverData[conflict.field] || 0
              );
              break;
              
            default:
              // Default: prendi valore locale
              merged[conflict.field] = localData[conflict.field];
          }
        });
        
        return { resolved: merged, needsUserChoice: false };

      case 'USER_CHOICE':
        // Richiede intervento utente
        return { resolved: serverData, needsUserChoice: true };

      default:
        return { resolved: localData, needsUserChoice: false };
    }
  }

  /**
   * 📦 Processa batch request
   */
  static async processBatchRequest(
    actions: Array<{
      id: string;
      type: string;
      endpoint: string;
      method: string;
      data: any;
      timestamp: number;
    }>,
    baseProcessor: (action: any) => Promise<any>
  ): Promise<BatchResult[]> {
    
    const results: BatchResult[] = [];
    const maxBatchSize = 50;
    
    // Limita dimensione batch
    const limitedActions = actions.slice(0, maxBatchSize);
    
    // Ordina per priorità e timestamp
    const sortedActions = limitedActions.sort((a, b) => {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aPriority = (a as any).priority || 'MEDIUM';
      const bPriority = (b as any).priority || 'MEDIUM';
      
      const priorityDiff = priorityOrder[aPriority as keyof typeof priorityOrder] - 
                          priorityOrder[bPriority as keyof typeof priorityOrder];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Se stessa priorità, ordina per timestamp
      return a.timestamp - b.timestamp;
    });

    // Processa azioni in sequenza
    for (const action of sortedActions) {
      try {
        console.log(`🔄 Processing batch action: ${action.type} - ${action.id}`);
        
        const result = await baseProcessor(action);
        
        results.push({
          success: true,
          actionId: action.id,
          operation: action.type,
          data: result
        });
        
      } catch (error: any) {
        console.error(`❌ Batch action failed: ${action.id}`, error);
        
        results.push({
          success: false,
          actionId: action.id,
          operation: action.type,
          error: error.message || 'Unknown error'
        });
      }
      
      // Piccola pausa tra azioni per non sovraccaricare
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return results;
  }

  /**
   * 🔄 Delta sync - restituisce solo dati modificati
   */
  static createDeltaResponse(
    fullData: any[],
    lastSync?: number,
    timestampField: string = 'updatedAt'
  ): { data: any[]; isPartial: boolean; nextSync: number } {
    
    const now = Date.now();
    
    if (!lastSync || !Array.isArray(fullData)) {
      // Prima sync o dati non validi - restituisci tutto
      return {
        data: fullData,
        isPartial: false,
        nextSync: now
      };
    }

    // Filtra solo dati modificati dopo lastSync
    const modifiedData = fullData.filter(item => {
      const itemTimestamp = item[timestampField] ? 
        new Date(item[timestampField]).getTime() : 0;
      return itemTimestamp > lastSync;
    });

    return {
      data: modifiedData,
      isPartial: true,
      nextSync: now
    };
  }

  /**
   * 📈 Crea response finale con supporto offline
   */
  static createOfflineResponse(
    data: any,
    offlineHeaders: OfflineHeaders,
    options: {
      conflicts?: ConflictData[];
      needsUserChoice?: boolean;
      batchResults?: BatchResult[];
      deltaSync?: boolean;
      isPartial?: boolean;
    } = {}
  ): NextResponse {
    
    const responseData = {
      success: true,
      data,
      timestamp: Date.now(),
      ...(options.conflicts && { conflicts: options.conflicts }),
      ...(options.needsUserChoice && { needsUserChoice: true }),
      ...(options.batchResults && { batchResults: options.batchResults }),
      ...(options.deltaSync && { deltaSync: true }),
      ...(options.isPartial && { partial: true }),
      metadata: {
        offlineRequest: offlineHeaders.isOfflineRequest,
        actionId: offlineHeaders.actionId,
        originalTimestamp: offlineHeaders.originalTimestamp,
        syncPriority: offlineHeaders.syncPriority,
        networkType: offlineHeaders.networkType
      }
    };

    const response = NextResponse.json(responseData);
    
    // Aggiungi headers offline
    const headers = this.createOfflineHeaders(data);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    // Headers CORS
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Offline-Action, X-Action-ID, X-Original-Timestamp, X-Sync-Priority, X-Conflict-Resolution, X-Batch-Request, X-Network-Type, X-Last-Sync');
    response.headers.set('Access-Control-Expose-Headers', 'X-Server-Timestamp, X-Supports-Offline, X-Supports-Batch, X-Data-Version, Last-Modified, ETag');

    // Status codes specifici per conflitti
    if (options.conflicts && options.conflicts.length > 0) {
      if (options.needsUserChoice) {
        // 409 Conflict - richiede intervento utente
        return NextResponse.json(responseData, { 
          status: 409,
          headers: response.headers 
        });
      }
    }

    return response;
  }

  /**
   * 🎯 Helper per OPTIONS requests (CORS preflight)
   */
  static handleCORSPreflight(): NextResponse {
    const response = new NextResponse(null, { status: 200 });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Offline-Action, X-Action-ID, X-Original-Timestamp, X-Sync-Priority, X-Conflict-Resolution, X-Batch-Request, X-Network-Type, X-Last-Sync');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
    
    return response;
  }
}

export default OfflineMiddleware;
export type { OfflineHeaders, ConflictData, BatchResult }; 