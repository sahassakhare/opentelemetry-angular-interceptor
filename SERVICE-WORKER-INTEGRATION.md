# Service Worker Integration Guide

## OpenTelemetry Trace Context for Service Workers

Complete guide for integrating OpenTelemetry trace context with service workers, enabling observability for offline operations, background sync, and push notifications.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Quick Start](#quick-start)
4. [Core Components](#core-components)
5. [Configuration](#configuration)
6. [Usage Examples](#usage-examples)
7. [Advanced Scenarios](#advanced-scenarios)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

## Overview

Service workers operate in a separate context from your main application, traditionally losing trace correlation for:
- Offline operations
- Background sync
- Push notifications
- Cache operations
- Network request interception

This integration solves these challenges by providing seamless trace context propagation across service worker boundaries.

## Architecture

### Communication Flow

```
Main Thread                     Service Worker
    |                                |
    ├─ postMessage(context) ────────>│
    |                                ├─ Deserialize context
    |                                ├─ Create child span
    |                                ├─ Perform operation
    |                                ├─ Store for offline
    |<──────── postMessage(result) ──┤
    |                                |
```

### Key Components

1. **TraceContextSerializer**: Handles context serialization/deserialization
2. **OfflineTraceStorage**: Persists trace context for offline operations
3. **ServiceWorkerTraceBridge**: Main bridge for communication
4. **ServiceWorkerRegistrationHelper**: Simplified SW setup with tracing

## Quick Start

### 1. Basic Setup

```typescript
import { ServiceWorkerRegistrationHelper } from '@jufab/opentelemetry-angular-interceptor';

@Component({...})
export class AppComponent implements OnInit {
  constructor(
    private swHelper: ServiceWorkerRegistrationHelper
  ) {}

  async ngOnInit() {
    // Register service worker with trace context support
    const { registration, messageChannel } = 
      await this.swHelper.setupCompleteServiceWorkerWithTracing();
    
    console.log('Service Worker ready with trace context support!');
  }
}
```

### 2. Configure in App Module

```typescript
const otelConfig: OpenTelemetryConfig = {
  commonConfig: {
    serviceName: 'my-app'
  },
  serviceWorkerConfig: {
    enabled: true,
    scriptUrl: '/sw.js',
    scope: '/',
    traceContext: {
      enabled: true,
      corsHeaders: ['traceparent', 'tracestate']
    }
  }
};

@NgModule({
  providers: [
    { provide: OTEL_CONFIG, useValue: otelConfig }
  ]
})
export class AppModule {}
```

### 3. The Service Worker is Auto-Generated

The helper automatically generates a service worker with full trace context support. No manual SW coding required!

## Core Components

### TraceContextSerializer

Serializes and deserializes OpenTelemetry span context for cross-context communication:

```typescript
@Injectable()
export class TraceContextSerializer {
  
  // Serialize current span context
  serializeCurrentContext(): SerializedTraceContext | null {
    const activeSpan = trace.getActiveSpan();
    if (!activeSpan) return null;
    
    const spanContext = activeSpan.spanContext();
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags,
      traceState: spanContext.traceState?.serialize()
    };
  }
  
  // Deserialize and create child context
  createChildContext(
    serialized: SerializedTraceContext
  ): SerializedTraceContext {
    return {
      traceId: serialized.traceId,
      spanId: this.generateSpanId(),
      traceFlags: serialized.traceFlags,
      parentSpanId: serialized.spanId
    };
  }
}
```

### OfflineTraceStorage

Manages trace context persistence for offline operations:

```typescript
@Injectable()
export class OfflineTraceStorage {
  
  // Store offline operation with trace context
  async storeOfflineOperation(
    operation: OfflineOperation
  ): Promise<string> {
    const stored = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      traceContext: this.serializer.serializeCurrentContext()
    };
    
    // Store in IndexedDB for persistence
    await this.indexedDBStorage.add('offline-operations', stored);
    
    return stored.id;
  }
  
  // Retrieve operations for replay
  async getOfflineOperations(): Promise<OfflineOperation[]> {
    return await this.indexedDBStorage.getAll('offline-operations');
  }
}
```

### ServiceWorkerTraceBridge

Main service for service worker communication with trace context:

```typescript
@Injectable()
export class ServiceWorkerTraceBridge {
  
  // Post message to SW with trace context
  async postMessageWithContext<T>(
    action: string,
    data: any
  ): Promise<T> {
    const message: TraceContextMessage = {
      action,
      data,
      traceContext: this.serializer.serializeCurrentContext(),
      correlationId: this.generateCorrelationId()
    };
    
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        // Handle response with preserved context
        this.handleResponse(event.data, resolve);
      };
      
      navigator.serviceWorker.controller?.postMessage(
        message,
        [channel.port2]
      );
    });
  }
}
```

## Configuration

### Complete Configuration Options

```typescript
interface ServiceWorkerConfig {
  enabled?: boolean;                    // Enable SW integration
  scriptUrl?: string;                   // SW script URL
  scope?: string;                       // SW scope
  autoRegister?: boolean;              // Auto-register on app init
  
  traceContext?: {
    enabled?: boolean;                  // Enable trace context
    corsHeaders?: string[];             // Headers to propagate
    
    backgroundSync?: {
      enabled?: boolean;                // Enable background sync
      tags?: string[];                  // Sync tags to handle
      retryDelay?: number;              // Retry delay in ms
    };
    
    pushNotifications?: {
      enabled?: boolean;                // Enable push support
      traceNotificationClicks?: boolean; // Trace notification clicks
    };
    
    cacheOperations?: {
      enabled?: boolean;                // Trace cache operations
      traceHeaders?: string[];          // Headers to include
      strategies?: CacheStrategy[];     // Cache strategies
    };
  };
  
  offlineStorage?: {
    maxOperations?: number;             // Max stored operations
    maxAge?: number;                   // Max age in ms
    enableIndexedDB?: boolean;          // Use IndexedDB
    enableLocalStorage?: boolean;       // Use localStorage fallback
    dbName?: string;                   // IndexedDB name
    storeName?: string;                // Store name
  };
}
```

### Example Configuration

```typescript
const config: OpenTelemetryConfig = {
  serviceWorkerConfig: {
    enabled: true,
    scriptUrl: '/sw.js',
    scope: '/',
    autoRegister: true,
    
    traceContext: {
      enabled: true,
      corsHeaders: ['traceparent', 'tracestate', 'x-trace-id'],
      
      backgroundSync: {
        enabled: true,
        tags: ['api-sync', 'user-data-sync'],
        retryDelay: 5000
      },
      
      pushNotifications: {
        enabled: true,
        traceNotificationClicks: true
      },
      
      cacheOperations: {
        enabled: true,
        traceHeaders: ['traceparent'],
        strategies: ['network-first', 'cache-first']
      }
    },
    
    offlineStorage: {
      maxOperations: 1000,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      enableIndexedDB: true,
      enableLocalStorage: true,
      dbName: 'otel-offline',
      storeName: 'operations'
    }
  }
};
```

## Usage Examples

### Offline Operation Handling

```typescript
@Component({...})
export class DataService {
  constructor(
    private swBridge: ServiceWorkerTraceBridge,
    private http: HttpClient
  ) {}
  
  async saveData(data: any) {
    try {
      // Try online first
      return await this.http.post('/api/data', data).toPromise();
    } catch (error) {
      // Fall back to offline with trace context preserved
      const operationId = await this.swBridge.handleOfflineOperation(
        'save-data',
        '/api/data',
        'POST',
        data
      );
      
      console.log(`Offline operation queued: ${operationId}`);
      
      // Register for background sync
      await this.swBridge.registerBackgroundSync('data-sync', {
        operationId,
        priority: 'high'
      });
    }
  }
}
```

### Background Sync with Trace Context

```typescript
@Component({...})
export class SyncService {
  constructor(private swBridge: ServiceWorkerTraceBridge) {}
  
  async scheduleBatchSync() {
    // Create trace context for batch operation
    this.traceContext.withTraceContext('batch-sync', async () => {
      
      // Register background sync with trace context
      const syncId = await this.swBridge.registerBackgroundSync(
        'batch-process',
        {
          items: this.getPendingItems(),
          timestamp: Date.now(),
          priority: 'low'
        }
      );
      
      this.logger.info('Background sync scheduled', { syncId });
    }, {
      'sync.type': 'batch',
      'sync.items': this.getPendingItems().length
    });
  }
}
```

### Push Notification Handling

```typescript
@Component({...})
export class NotificationService {
  constructor(
    private swBridge: ServiceWorkerTraceBridge,
    private swHelper: ServiceWorkerRegistrationHelper
  ) {}
  
  async setupPushNotifications() {
    // Setup with trace context support
    const { registration } = await this.swHelper.setupCompleteServiceWorkerWithTracing();
    
    // Subscribe to push with trace context
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey)
    });
    
    // Notification clicks will maintain trace context
    this.swBridge.onNotificationClick().subscribe(event => {
      this.logger.info('Notification clicked', {
        action: event.action,
        traceId: event.traceContext?.traceId
      });
    });
  }
}
```

### Cache Operations with Trace Context

```typescript
@Component({...})
export class CacheService {
  constructor(private swBridge: ServiceWorkerTraceBridge) {}
  
  async cacheWithTrace(request: string, response: Response) {
    // Cache operation with trace context
    await this.swBridge.cacheWithContext(
      'api-cache',
      request,
      response,
      {
        strategy: 'network-first',
        ttl: 3600000, // 1 hour
        traceHeaders: ['traceparent', 'x-trace-id']
      }
    );
  }
  
  async getCachedWithTrace(request: string) {
    // Retrieve from cache with trace context restoration
    const cached = await this.swBridge.getCachedWithContext(
      'api-cache',
      request
    );
    
    if (cached?.traceContext) {
      this.logger.info('Using cached response', {
        traceId: cached.traceContext.traceId,
        age: Date.now() - cached.timestamp
      });
    }
    
    return cached?.response;
  }
}
```

## Advanced Scenarios

### Custom Service Worker Integration

If you have an existing service worker:

```typescript
// In your existing service worker
importScripts('/otel-sw-trace.js'); // Generated trace handling code

// Initialize trace handling
const traceHandler = new OTELServiceWorkerTraceHandler({
  corsHeaders: ['traceparent', 'tracestate']
});

// Wrap your fetch handler
self.addEventListener('fetch', event => {
  event.respondWith(
    traceHandler.handleFetch(event, async (request) => {
      // Your existing fetch logic
      // Trace context automatically maintained
      return await fetch(request);
    })
  );
});

// Handle messages with trace context
self.addEventListener('message', event => {
  traceHandler.handleMessage(event, async (data) => {
    // Your message handling logic
    // Has access to trace context
  });
});
```

### Cross-Origin Trace Propagation

```typescript
// Configure CORS headers for trace propagation
const config = {
  serviceWorkerConfig: {
    traceContext: {
      corsHeaders: [
        'traceparent',     // W3C Trace Context
        'tracestate',      // W3C Trace State
        'x-b3-traceid',    // Zipkin B3
        'x-b3-spanid',     // Zipkin B3
        'x-trace-id',      // Custom header
      ]
    }
  }
};

// Headers automatically included in cross-origin requests
```

### Trace Context Restoration

```typescript
// Store trace context before page unload
window.addEventListener('beforeunload', () => {
  const context = this.serializer.serializeCurrentContext();
  sessionStorage.setItem('trace-context', JSON.stringify(context));
});

// Restore on page load
window.addEventListener('load', () => {
  const stored = sessionStorage.getItem('trace-context');
  if (stored) {
    const context = JSON.parse(stored);
    this.traceContext.withRestoredContext(context, () => {
      this.logger.info('Restored trace context after reload');
    });
  }
});
```

### Multi-Tab Coordination

```typescript
// Broadcast trace context to other tabs
const broadcast = new BroadcastChannel('trace-context');

// Send context
broadcast.postMessage({
  type: 'trace-update',
  context: this.serializer.serializeCurrentContext()
});

// Receive in other tabs
broadcast.onmessage = (event) => {
  if (event.data.type === 'trace-update') {
    this.traceContext.withRestoredContext(event.data.context, () => {
      this.logger.info('Trace context synchronized from other tab');
    });
  }
};
```

## API Reference

### ServiceWorkerRegistrationHelper

```typescript
class ServiceWorkerRegistrationHelper {
  // Setup SW with complete trace support
  setupCompleteServiceWorkerWithTracing(
    config?: ServiceWorkerConfig
  ): Promise<{
    registration: ServiceWorkerRegistration;
    messageChannel: MessageChannel;
  }>;
  
  // Register existing SW with trace support
  registerExistingServiceWorker(
    scriptUrl: string,
    config?: ServiceWorkerConfig
  ): Promise<ServiceWorkerRegistration>;
  
  // Generate SW script with trace handling
  generateServiceWorkerScript(
    config: ServiceWorkerConfig
  ): string;
}
```

### ServiceWorkerTraceBridge

```typescript
class ServiceWorkerTraceBridge {
  // Post message with trace context
  postMessageWithContext<T>(
    action: string,
    data: any
  ): Promise<T>;
  
  // Handle offline operation
  handleOfflineOperation(
    action: string,
    url: string,
    method: string,
    data: any
  ): Promise<string>;
  
  // Register background sync
  registerBackgroundSync(
    tag: string,
    data?: any
  ): Promise<string>;
  
  // Cache with trace context
  cacheWithContext(
    cacheName: string,
    request: string | Request,
    response: Response,
    options?: CacheOptions
  ): Promise<void>;
  
  // Get statistics
  getStatistics(): ServiceWorkerStats;
}
```

### TraceContextSerializer

```typescript
class TraceContextSerializer {
  // Serialize current context
  serializeCurrentContext(): SerializedTraceContext | null;
  
  // Deserialize context
  deserializeContext(
    serialized: SerializedTraceContext
  ): SpanContext | null;
  
  // Create child context
  createChildContext(
    parent: SerializedTraceContext
  ): SerializedTraceContext;
  
  // Validate context
  isValidTraceContext(
    context: any
  ): context is SerializedTraceContext;
}
```

### OfflineTraceStorage

```typescript
class OfflineTraceStorage {
  // Store offline operation
  storeOfflineOperation(
    operation: OfflineOperation
  ): Promise<string>;
  
  // Get pending operations
  getOfflineOperations(
    filter?: OperationFilter
  ): Promise<OfflineOperation[]>;
  
  // Remove completed operation
  removeOfflineOperation(
    operationId: string
  ): Promise<void>;
  
  // Clean expired operations
  cleanupExpiredOperations(): Promise<number>;
}
```

## Troubleshooting

### Service Worker Not Receiving Trace Context

**Check Registration:**
```typescript
// Verify SW is registered and active
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.ready;
  console.log('SW state:', registration.active?.state);
}
```

**Check Message Channel:**
```typescript
// Ensure message channel is setup
const channel = await this.swBridge.getMessageChannel();
if (!channel) {
  console.error('No message channel to service worker');
}
```

**Enable Debug Logging:**
```typescript
// In service worker
self.addEventListener('message', event => {
  console.log('SW received message:', event.data);
  if (event.data.traceContext) {
    console.log('Trace context:', event.data.traceContext);
  }
});
```

### Offline Operations Not Syncing

**Check Background Sync Support:**
```typescript
if ('sync' in ServiceWorkerRegistration.prototype) {
  console.log('Background sync supported');
} else {
  console.log('Background sync not supported');
}
```

**Verify Sync Registration:**
```typescript
const tags = await registration.sync.getTags();
console.log('Registered sync tags:', tags);
```

**Check Storage:**
```typescript
const operations = await this.offlineStorage.getOfflineOperations();
console.log('Pending operations:', operations.length);
```

### Trace Context Lost After Reload

**Implement Persistence:**
```typescript
// Save before unload
window.addEventListener('beforeunload', () => {
  this.offlineStorage.persistCurrentContext();
});

// Restore on load
ngOnInit() {
  this.offlineStorage.restoreContext();
}
```

### Performance Issues

**Monitor Storage Size:**
```typescript
const stats = await this.offlineStorage.getStorageStats();
if (stats.sizeInMB > 50) {
  await this.offlineStorage.cleanupExpiredOperations();
}
```

**Limit Concurrent Operations:**
```typescript
const config = {
  offlineStorage: {
    maxOperations: 100,  // Limit stored operations
    maxAge: 86400000     // 24 hour expiry
  }
};
```

## Best Practices

1. **Always Configure Limits**: Set reasonable limits for offline storage
2. **Implement Cleanup**: Regularly clean expired operations
3. **Handle Errors Gracefully**: Fallback when SW unavailable
4. **Monitor Performance**: Track storage size and operation count
5. **Test Offline Scenarios**: Verify behavior with network disabled
6. **Use Appropriate Strategies**: Choose right caching strategy per resource
7. **Secure Sensitive Data**: Don't store sensitive data in trace context
8. **Version Your Service Worker**: Include version in SW for updates

## Summary

The Service Worker integration provides:

- **Complete trace correlation** across SW boundaries
- **Offline operation support** with context preservation
- **Background sync** with trace continuity
- **Push notification** correlation
- **Cache operations** with trace headers
- **Automatic setup** with zero configuration
- **Production-ready** error handling and cleanup

This enables full observability for modern Progressive Web Apps with offline capabilities.