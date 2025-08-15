import { Injectable, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TraceContextSerializer, ServiceWorkerMessage } from './trace-context-serializer.service';
import { OfflineTraceStorage } from './offline-trace-storage.service';

/**
 * Service Worker script template for trace context support
 */
export const SERVICE_WORKER_SCRIPT_TEMPLATE = `
// OpenTelemetry Service Worker Script with Trace Context Support
// Auto-generated template - customize as needed

const CACHE_NAME = 'otel-cache-v1';
const TRACE_CONTEXT_STORE = 'otel-trace-contexts';

// Store for trace contexts
let traceContexts = new Map();
let config = null;

// Message handling
self.addEventListener('message', (event) => {
  const message = event.data;
  
  switch (message.type) {
    case 'trace-context-config':
      config = message.data;
      console.log('Service Worker: Trace context config received', config);
      break;
      
    case 'offline-operation':
      handleOfflineOperation(message);
      break;
      
    case 'background-sync-context':
      handleBackgroundSyncContext(message);
      break;
      
    case 'push-notification-context':
      handlePushNotificationContext(message);
      break;
      
    case 'cache-operation':
      handleCacheOperation(message);
      break;
      
    default:
      console.log('Service Worker: Unknown message type', message.type);
  }
  
  // Send response back to main thread
  if (message.messageId) {
    event.ports[0]?.postMessage({
      type: 'response',
      messageId: message.messageId,
      data: { status: 'received' }
    });
  }
});

// Fetch event with trace context propagation
self.addEventListener('fetch', (event) => {
  if (!config?.cacheOperations?.enabled) {
    return;
  }
  
  const request = event.request;
  
  // Add trace headers to outgoing requests
  if (shouldAddTraceHeaders(request.url)) {
    const traceContext = getTraceContextForRequest(request);
    if (traceContext) {
      const modifiedRequest = addTraceHeadersToRequest(request, traceContext);
      event.respondWith(fetch(modifiedRequest));
      return;
    }
  }
  
  // Default fetch handling
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (!config?.backgroundSync?.enabled) {
    return;
  }
  
  const tag = event.tag;
  console.log('Service Worker: Background sync triggered for tag', tag);
  
  if (config.backgroundSync.tags.includes(tag)) {
    event.waitUntil(handleBackgroundSync(tag));
  }
});

// Push event with trace context
self.addEventListener('push', (event) => {
  if (!config?.pushNotifications?.enabled) {
    return;
  }
  
  const data = event.data ? event.data.json() : {};
  console.log('Service Worker: Push event received', data);
  
  event.waitUntil(handlePushEvent(data));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  if (!config?.pushNotifications?.traceNotificationClicks) {
    return;
  }
  
  console.log('Service Worker: Notification click', event.notification);
  
  event.notification.close();
  event.waitUntil(handleNotificationClick(event));
});

// Helper functions
function handleOfflineOperation(message) {
  const { operationId, type, url, method, data, headers } = message.data;
  const traceContext = message.traceContext;
  
  console.log('Service Worker: Handling offline operation', operationId, type);
  
  // Store the operation with trace context
  traceContexts.set(operationId, traceContext);
  
  // Attempt to execute the operation
  executeOfflineOperation(operationId, type, url, method, data, headers, traceContext);
}

function handleBackgroundSyncContext(message) {
  const { tag, operationId, traceContext } = message.data;
  
  console.log('Service Worker: Background sync context received', tag, operationId);
  
  // Store trace context for background sync
  traceContexts.set(\`sync_\${tag}\`, traceContext);
  traceContexts.set(operationId, traceContext);
}

function handlePushNotificationContext(message) {
  const { notificationData, traceContext } = message.data;
  
  console.log('Service Worker: Push notification context received');
  
  // Store trace context for push notification
  const contextKey = \`push_\${Date.now()}\`;
  traceContexts.set(contextKey, traceContext);
}

function handleCacheOperation(message) {
  const { operation, url, method, traceHeaders, traceContext } = message.data;
  
  console.log('Service Worker: Cache operation', operation, url);
  
  // Store trace context for cache operations
  const urlKey = new URL(url).pathname;
  traceContexts.set(\`cache_\${urlKey}\`, traceContext);
}

async function executeOfflineOperation(operationId, type, url, method, data, headers, traceContext) {
  try {
    // Add trace headers
    const requestHeaders = new Headers(headers);
    addTraceHeaders(requestHeaders, traceContext);
    
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (response.ok) {
      console.log('Service Worker: Offline operation successful', operationId);
      // Clean up trace context
      traceContexts.delete(operationId);
    } else {
      console.error('Service Worker: Offline operation failed', operationId, response.status);
    }
  } catch (error) {
    console.error('Service Worker: Offline operation error', operationId, error);
  }
}

async function handleBackgroundSync(tag) {
  const traceContext = traceContexts.get(\`sync_\${tag}\`);
  
  if (traceContext) {
    console.log('Service Worker: Background sync with trace context', tag);
    
    // Execute background sync operations with trace context
    // This is where you would implement your specific background sync logic
    
    // Clean up after successful sync
    traceContexts.delete(\`sync_\${tag}\`);
  }
}

async function handlePushEvent(data) {
  // Find relevant trace context
  const contextKey = findPushTraceContext(data);
  const traceContext = contextKey ? traceContexts.get(contextKey) : null;
  
  if (traceContext) {
    console.log('Service Worker: Push event with trace context');
  }
  
  // Show notification (customize as needed)
  const title = data.title || 'Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    data: { ...data, traceContext }
  };
  
  await self.registration.showNotification(title, options);
}

async function handleNotificationClick(event) {
  const notificationData = event.notification.data;
  const traceContext = notificationData?.traceContext;
  
  if (traceContext) {
    console.log('Service Worker: Notification click with trace context');
  }
  
  // Handle notification click (customize as needed)
  const url = notificationData?.url || '/';
  
  const clientList = await clients.matchAll({ type: 'window' });
  const client = clientList.find(c => c.url === url);
  
  if (client) {
    await client.focus();
  } else {
    await clients.openWindow(url);
  }
}

function shouldAddTraceHeaders(url) {
  if (!config?.corsHeaders) {
    return false;
  }
  
  // Only add trace headers to same-origin requests or configured CORS URLs
  try {
    const requestUrl = new URL(url);
    const currentUrl = new URL(self.location.href);
    
    return requestUrl.origin === currentUrl.origin;
  } catch {
    return false;
  }
}

function getTraceContextForRequest(request) {
  // Try to find trace context based on URL or other criteria
  const url = new URL(request.url);
  const urlKey = url.pathname;
  
  return traceContexts.get(\`cache_\${urlKey}\`) || null;
}

function addTraceHeadersToRequest(request, traceContext) {
  const headers = new Headers(request.headers);
  addTraceHeaders(headers, traceContext);
  
  return new Request(request, { headers });
}

function addTraceHeaders(headers, traceContext) {
  if (!traceContext || !config?.corsHeaders) {
    return;
  }
  
  // Add W3C trace context header
  const traceparent = \`00-\${traceContext.traceId}-\${traceContext.spanId}-\${traceContext.traceFlags.toString(16).padStart(2, '0')}\`;
  headers.set('traceparent', traceparent);
  
  // Add custom headers if configured
  config.corsHeaders.forEach(header => {
    switch (header) {
      case 'x-trace-id':
        headers.set('x-trace-id', traceContext.traceId);
        break;
      case 'x-span-id':
        headers.set('x-span-id', traceContext.spanId);
        break;
    }
  });
  
  if (traceContext.traceState) {
    headers.set('tracestate', traceContext.traceState);
  }
}

function findPushTraceContext(data) {
  // Logic to find the appropriate trace context for push notifications
  // This could be based on user ID, notification type, etc.
  
  for (const [key, context] of traceContexts.entries()) {
    if (key.startsWith('push_')) {
      // Simple time-based matching - in practice you'd want more sophisticated logic
      const contextAge = Date.now() - context.timestamp;
      if (contextAge < 5 * 60 * 1000) { // 5 minutes
        return key;
      }
    }
  }
  
  return null;
}

console.log('Service Worker: OpenTelemetry trace context support loaded');
`;

/**
 * Service Worker registration helper with trace context support
 */
@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerRegistrationHelper {
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private traceSerializer: TraceContextSerializer,
    private offlineStorage: OfflineTraceStorage
  ) {}

  /**
   * Generate a service worker script with trace context support
   */
  generateServiceWorkerScript(customScript?: string): string {
    const baseScript = SERVICE_WORKER_SCRIPT_TEMPLATE;
    
    if (customScript) {
      return baseScript + '\n\n// Custom Service Worker Code\n' + customScript;
    }
    
    return baseScript;
  }

  /**
   * Create and register a service worker with trace context support
   */
  async createAndRegisterServiceWorker(
    customScript?: string,
    options: {
      scope?: string;
      updateViaCache?: ServiceWorkerUpdateViaCache;
    } = {}
  ): Promise<ServiceWorkerRegistration> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Service Worker registration only available in browser');
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported in this browser');
    }

    try {
      // Generate service worker script
      const script = this.generateServiceWorkerScript(customScript);
      
      // Create blob URL for the service worker script
      const blob = new Blob([script], { type: 'application/javascript' });
      const scriptUrl = URL.createObjectURL(blob);

      // Register the service worker
      const registration = await navigator.serviceWorker.register(scriptUrl, {
        scope: options.scope || '/',
        updateViaCache: options.updateViaCache || 'imports'
      });

      console.log('Service Worker registered successfully:', registration);
      
      // Clean up blob URL after registration
      setTimeout(() => URL.revokeObjectURL(scriptUrl), 1000);

      return registration;
    } catch (error) {
      console.error('Failed to register service worker:', error);
      throw error;
    }
  }

  /**
   * Register a pre-existing service worker script with trace context messaging
   */
  async registerExistingServiceWorker(
    scriptUrl: string,
    options: {
      scope?: string;
      updateViaCache?: ServiceWorkerUpdateViaCache;
    } = {}
  ): Promise<ServiceWorkerRegistration> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Service Worker registration only available in browser');
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported in this browser');
    }

    try {
      const registration = await navigator.serviceWorker.register(scriptUrl, {
        scope: options.scope || '/',
        updateViaCache: options.updateViaCache || 'imports'
      });

      console.log('Existing Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Failed to register existing service worker:', error);
      throw error;
    }
  }

  /**
   * Setup message channel for trace context communication
   */
  setupTraceContextMessaging(registration: ServiceWorkerRegistration): MessageChannel {
    const messageChannel = new MessageChannel();
    
    // Setup message handling on port1
    messageChannel.port1.onmessage = (event) => {
      const message = event.data as ServiceWorkerMessage;
      this.handleServiceWorkerMessage(message);
    };

    // Send port2 to service worker for communication
    if (registration.active) {
      registration.active.postMessage({
        type: 'init-message-channel'
      }, [messageChannel.port2]);
    }

    return messageChannel;
  }

  /**
   * Send trace context configuration to service worker
   */
  async sendTraceContextConfig(
    registration: ServiceWorkerRegistration,
    config: {
      corsHeaders: string[];
      backgroundSync: { enabled: boolean; tags: string[] };
      pushNotifications: { enabled: boolean; traceNotificationClicks: boolean };
      cacheOperations: { enabled: boolean; traceHeaders: string[] };
    }
  ): Promise<void> {
    if (!registration.active) {
      throw new Error('Service Worker not active');
    }

    const message = this.traceSerializer.createMessageWithTraceContext('trace-context-config', config);
    
    registration.active.postMessage(message);
  }

  /**
   * Install event listeners for service worker lifecycle
   */
  setupServiceWorkerListeners(registration: ServiceWorkerRegistration): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Listen for service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('New service worker available, consider showing update notification');
          }
        });
      }
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed, reloading page');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const message = event.data as ServiceWorkerMessage;
      this.handleServiceWorkerMessage(message);
    });
  }

  /**
   * Create a complete service worker setup with trace context
   */
  async setupCompleteServiceWorkerWithTracing(
    customScript?: string,
    config?: {
      scope?: string;
      corsHeaders?: string[];
      backgroundSyncTags?: string[];
      enablePushNotifications?: boolean;
      enableCacheTracing?: boolean;
    }
  ): Promise<{
    registration: ServiceWorkerRegistration;
    messageChannel: MessageChannel;
  }> {
    try {
      // Register service worker
      const registration = await this.createAndRegisterServiceWorker(customScript, {
        scope: config?.scope
      });

      // Setup message channel
      const messageChannel = this.setupTraceContextMessaging(registration);

      // Setup lifecycle listeners
      this.setupServiceWorkerListeners(registration);

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Send configuration
      await this.sendTraceContextConfig(registration, {
        corsHeaders: config?.corsHeaders || ['x-trace-id', 'x-span-id', 'traceparent'],
        backgroundSync: {
          enabled: true,
          tags: config?.backgroundSyncTags || ['background-sync', 'offline-sync']
        },
        pushNotifications: {
          enabled: config?.enablePushNotifications ?? true,
          traceNotificationClicks: true
        },
        cacheOperations: {
          enabled: config?.enableCacheTracing ?? true,
          traceHeaders: ['x-trace-id', 'x-span-id']
        }
      });

      return { registration, messageChannel };
    } catch (error) {
      console.error('Failed to setup complete service worker with tracing:', error);
      throw error;
    }
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    console.log('Received message from service worker:', message);
    
    // Extract and handle trace context if present
    if (message.traceContext) {
      const spanContext = this.traceSerializer.deserializeToSpanContext(message.traceContext);
      if (spanContext) {
        console.log('Service worker message includes trace context:', spanContext);
      }
    }

    // Handle specific message types
    switch (message.type) {
      case 'offline-operation-completed':
        this.handleOfflineOperationCompleted(message);
        break;
      case 'background-sync-completed':
        this.handleBackgroundSyncCompleted(message);
        break;
      case 'cache-operation-completed':
        this.handleCacheOperationCompleted(message);
        break;
      default:
        console.log('Unknown message type from service worker:', message.type);
    }
  }

  /**
   * Handle offline operation completion
   */
  private async handleOfflineOperationCompleted(message: ServiceWorkerMessage): Promise<void> {
    const { operationId, success, error } = message.data;
    
    if (success) {
      await this.offlineStorage.removeOfflineOperation(operationId);
      console.log('Offline operation completed successfully:', operationId);
    } else {
      console.error('Offline operation failed:', operationId, error);
    }
  }

  /**
   * Handle background sync completion
   */
  private async handleBackgroundSyncCompleted(message: ServiceWorkerMessage): Promise<void> {
    const { tag, operationId, success } = message.data;
    
    if (success && operationId) {
      await this.offlineStorage.updateBackgroundSyncStatus(operationId, 'completed');
      console.log('Background sync completed successfully:', tag, operationId);
    } else {
      console.error('Background sync failed:', tag, operationId);
      if (operationId) {
        await this.offlineStorage.updateBackgroundSyncStatus(operationId, 'failed');
      }
    }
  }

  /**
   * Handle cache operation completion
   */
  private handleCacheOperationCompleted(message: ServiceWorkerMessage): void {
    const { operation, url, success } = message.data;
    console.log('Cache operation completed:', operation, url, success ? 'success' : 'failed');
  }
}