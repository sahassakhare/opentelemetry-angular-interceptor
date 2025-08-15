import { Injectable, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trace, context as otelContext, Span, SpanKind } from '@opentelemetry/api';
import { TraceContextSerializer, ServiceWorkerMessage, SerializedTraceContext } from './trace-context-serializer.service';
import { OfflineTraceStorage, OfflineOperation, BackgroundSyncOperation } from './offline-trace-storage.service';
import { OpenTelemetryConfig, OTEL_CONFIG, ServiceWorkerConfig } from '../configuration/opentelemetry-config';

/**
 * Service Worker registration result
 */
export interface ServiceWorkerRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

/**
 * Service Worker trace bridge for handling trace context propagation
 * Manages communication between main thread and service worker with trace correlation
 */
@Injectable({
  providedIn: 'root'
})
export class ServiceWorkerTraceBridge {
  
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private messageHandlers = new Map<string, (message: ServiceWorkerMessage) => void>();
  private pendingMessages = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private config: Required<ServiceWorkerConfig>;

  private readonly defaultConfig: Required<ServiceWorkerConfig> = {
    enabled: false,
    scriptUrl: '/sw.js',
    scope: '/',
    registrationOptions: {
      updateViaCache: 'imports'
    },
    traceContext: {
      enabled: true,
      corsHeaders: ['x-trace-id', 'x-span-id', 'traceparent'],
      backgroundSync: {
        enabled: true,
        tags: ['background-sync', 'offline-sync']
      },
      pushNotifications: {
        enabled: true,
        traceNotificationClicks: true
      },
      cacheOperations: {
        enabled: true,
        traceHeaders: ['x-trace-id', 'x-span-id']
      }
    },
    offlineStorage: {
      maxOperations: 100,
      maxAge: 86400000, // 24 hours
      storagePrefix: 'otel-offline',
      enableIndexedDB: true,
      enableLocalStorage: true
    }
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private traceSerializer: TraceContextSerializer,
    private offlineStorage: OfflineTraceStorage,
    @Optional() @Inject(OTEL_CONFIG) private otelConfig?: OpenTelemetryConfig
  ) {
    this.config = { ...this.defaultConfig };
    this.initializeConfig();
    this.initializeServiceWorker();
  }

  /**
   * Register service worker with trace context support
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
    if (!isPlatformBrowser(this.platformId)) {
      return { success: false, error: new Error('Not running in browser') };
    }

    if (!('serviceWorker' in navigator)) {
      return { success: false, error: new Error('Service Worker not supported') };
    }

    try {
      const registration = await navigator.serviceWorker.register(
        this.config.scriptUrl,
        {
          scope: this.config.scope,
          ...this.config.registrationOptions
        }
      );

      this.serviceWorkerRegistration = registration;
      this.setupMessageHandling();
      this.setupServiceWorkerTraceContext();

      return { success: true, registration };
    } catch (error) {
      console.error('Failed to register service worker:', error);
      return { success: false, error: error as Error };
    }
  }

  /**
   * Send message to service worker with trace context
   */
  async sendMessageToServiceWorker(type: string, data: any, timeout: number = 5000): Promise<any> {
    if (!this.serviceWorkerRegistration || !this.config.traceContext.enabled) {
      throw new Error('Service Worker not registered or trace context disabled');
    }

    return this.withTraceContext('sw.message.send', async () => {
      const message = this.traceSerializer.createMessageWithTraceContext(type, data);
      
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.pendingMessages.delete(message.messageId);
          reject(new Error('Service Worker message timeout'));
        }, timeout);

        this.pendingMessages.set(message.messageId, { resolve, reject, timeout: timeoutId });

        // Send message to service worker
        if (this.serviceWorkerRegistration?.active) {
          this.serviceWorkerRegistration.active.postMessage(message);
        } else {
          reject(new Error('Service Worker not active'));
        }
      });
    });
  }

  /**
   * Handle offline operation with trace context
   */
  async handleOfflineOperation(
    type: string,
    url: string,
    method: string,
    data: any,
    headers: Record<string, string> = {}
  ): Promise<string> {
    return this.withTraceContext('offline.operation', async () => {
      const traceContext = this.traceSerializer.serializeActiveContext();
      
      if (!traceContext) {
        throw new Error('No active trace context for offline operation');
      }

      // Add trace headers to the request
      const traceHeaders = this.addTraceHeaders(headers, traceContext);

      const operationId = await this.offlineStorage.storeOfflineOperation({
        type,
        data,
        traceContext,
        url,
        method,
        headers: traceHeaders
      });

      // Notify service worker about offline operation
      if (this.serviceWorkerRegistration?.active) {
        try {
          await this.sendMessageToServiceWorker('offline-operation', {
            operationId,
            type,
            url,
            method,
            data,
            headers: traceHeaders
          });
        } catch (error) {
          console.warn('Failed to notify service worker about offline operation:', error);
        }
      }

      return operationId;
    });
  }

  /**
   * Register for background sync with trace context
   */
  async registerBackgroundSync(tag: string, data: any): Promise<string> {
    if (!this.config.traceContext.backgroundSync.enabled) {
      throw new Error('Background sync trace context disabled');
    }

    return this.withTraceContext('background.sync.register', async () => {
      const traceContext = this.traceSerializer.serializeActiveContext();
      
      if (!traceContext) {
        throw new Error('No active trace context for background sync');
      }

      const operationId = await this.offlineStorage.storeBackgroundSyncOperation({
        tag,
        traceContext,
        payload: data
      });

      // Register background sync with service worker
      if (this.serviceWorkerRegistration) {
        try {
          // Type assertion for sync API which may not be in TypeScript definitions
          await (this.serviceWorkerRegistration as any).sync?.register(tag);
          
          // Send trace context to service worker
          await this.sendMessageToServiceWorker('background-sync-context', {
            tag,
            operationId,
            traceContext
          });
        } catch (error) {
          console.warn('Failed to register background sync:', error);
        }
      }

      return operationId;
    });
  }

  /**
   * Handle push notification with trace context
   */
  async handlePushNotification(notificationData: any): Promise<void> {
    if (!this.config.traceContext.pushNotifications.enabled) {
      return;
    }

    await this.withTraceContext('push.notification.handle', async () => {
      const traceContext = this.traceSerializer.serializeActiveContext();
      
      if (traceContext) {
        // Store trace context for push notification handling
        await this.offlineStorage.storeTraceContext(
          `push_${Date.now()}`,
          traceContext
        );

        // Send trace context to service worker
        await this.sendMessageToServiceWorker('push-notification-context', {
          notificationData,
          traceContext
        });
      }
    });
  }

  /**
   * Handle cache operations with trace context
   */
  async handleCacheOperation(operation: string, request: Request): Promise<void> {
    if (!this.config.traceContext.cacheOperations.enabled) {
      return;
    }

    await this.withTraceContext('cache.operation', async () => {
      const traceContext = this.traceSerializer.serializeActiveContext();
      
      if (traceContext) {
        // Clone request and add trace headers
        const clonedRequest = request.clone();
        const traceHeaders = this.addTraceHeaders({}, traceContext);

        // Send cache operation info to service worker
        await this.sendMessageToServiceWorker('cache-operation', {
          operation,
          url: request.url,
          method: request.method,
          traceHeaders,
          traceContext
        });
      }
    });
  }

  /**
   * Add message handler for service worker responses
   */
  onServiceWorkerMessage(type: string, handler: (message: ServiceWorkerMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Initialize configuration from OpenTelemetry config
   */
  private initializeConfig(): void {
    if (this.otelConfig?.serviceWorkerConfig) {
      // Merge with defaults to ensure all required properties are present
      this.config = this.mergeConfig(this.defaultConfig, this.otelConfig.serviceWorkerConfig);
    }
  }

  /**
   * Merge configurations ensuring all required properties
   */
  private mergeConfig(defaults: Required<ServiceWorkerConfig>, override?: ServiceWorkerConfig): Required<ServiceWorkerConfig> {
    if (!override) return defaults;
    
    return {
      enabled: override.enabled ?? defaults.enabled,
      scriptUrl: override.scriptUrl ?? defaults.scriptUrl,
      scope: override.scope ?? defaults.scope,
      registrationOptions: override.registrationOptions ?? defaults.registrationOptions,
      traceContext: {
        enabled: override.traceContext?.enabled ?? defaults.traceContext.enabled,
        corsHeaders: override.traceContext?.corsHeaders ?? defaults.traceContext.corsHeaders,
        backgroundSync: {
          enabled: override.traceContext?.backgroundSync?.enabled ?? defaults.traceContext.backgroundSync.enabled,
          tags: override.traceContext?.backgroundSync?.tags ?? defaults.traceContext.backgroundSync.tags
        },
        pushNotifications: {
          enabled: override.traceContext?.pushNotifications?.enabled ?? defaults.traceContext.pushNotifications.enabled,
          traceNotificationClicks: override.traceContext?.pushNotifications?.traceNotificationClicks ?? defaults.traceContext.pushNotifications.traceNotificationClicks
        },
        cacheOperations: {
          enabled: override.traceContext?.cacheOperations?.enabled ?? defaults.traceContext.cacheOperations.enabled,
          traceHeaders: override.traceContext?.cacheOperations?.traceHeaders ?? defaults.traceContext.cacheOperations.traceHeaders
        }
      },
      offlineStorage: {
        maxOperations: override.offlineStorage?.maxOperations ?? defaults.offlineStorage?.maxOperations ?? 100,
        maxAge: override.offlineStorage?.maxAge ?? defaults.offlineStorage?.maxAge ?? 86400000,
        storagePrefix: override.offlineStorage?.storagePrefix ?? defaults.offlineStorage?.storagePrefix ?? 'otel-offline',
        enableIndexedDB: override.offlineStorage?.enableIndexedDB ?? defaults.offlineStorage?.enableIndexedDB ?? true,
        enableLocalStorage: override.offlineStorage?.enableLocalStorage ?? defaults.offlineStorage?.enableLocalStorage ?? true
      }
    };
  }

  /**
   * Initialize service worker if enabled
   */
  private async initializeServiceWorker(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !this.config.enabled) {
      return;
    }

    try {
      await this.registerServiceWorker();
    } catch (error) {
      console.error('Failed to initialize service worker:', error);
    }
  }

  /**
   * Setup message handling between main thread and service worker
   */
  private setupMessageHandling(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      const message = event.data as ServiceWorkerMessage;
      
      if (message.messageId && this.pendingMessages.has(message.messageId)) {
        // Handle response to a pending message
        const pending = this.pendingMessages.get(message.messageId)!;
        clearTimeout(pending.timeout);
        this.pendingMessages.delete(message.messageId);
        pending.resolve(message.data);
      } else if (message.type && this.messageHandlers.has(message.type)) {
        // Handle registered message type
        const handler = this.messageHandlers.get(message.type)!;
        handler(message);
      }
    });
  }

  /**
   * Setup service worker with trace context handling
   */
  private setupServiceWorkerTraceContext(): void {
    if (!this.config.traceContext.enabled) {
      return;
    }

    // Send initial configuration to service worker
    this.sendMessageToServiceWorker('trace-context-config', {
      corsHeaders: this.config.traceContext.corsHeaders,
      backgroundSync: this.config.traceContext.backgroundSync,
      pushNotifications: this.config.traceContext.pushNotifications,
      cacheOperations: this.config.traceContext.cacheOperations
    }).catch(error => {
      console.warn('Failed to send trace context config to service worker:', error);
    });
  }

  /**
   * Add trace headers to request headers
   */
  private addTraceHeaders(headers: Record<string, string>, traceContext: SerializedTraceContext): Record<string, string> {
    const result = { ...headers };

    // Add W3C trace context header
    result['traceparent'] = `00-${traceContext.traceId}-${traceContext.spanId}-${traceContext.traceFlags.toString(16).padStart(2, '0')}`;

    // Add custom trace headers
    result['x-trace-id'] = traceContext.traceId;
    result['x-span-id'] = traceContext.spanId;

    if (traceContext.traceState) {
      result['tracestate'] = traceContext.traceState;
    }

    return result;
  }

  /**
   * Execute function within trace context
   */
  private async withTraceContext<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    if (!isPlatformBrowser(this.platformId)) {
      return fn();
    }

    const tracer = trace.getTracer('service-worker-bridge', '1.0.0');
    const span = tracer.startSpan(operationName, {
      kind: SpanKind.INTERNAL,
      attributes: {
        'sw.operation': operationName,
        'component': 'service-worker-bridge'
      }
    });

    try {
      return await otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
        try {
          const result = await fn();
          span.setStatus({ code: 1 }); // OK
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ 
            code: 2, // ERROR
            message: (error as Error).message 
          });
          throw error;
        }
      });
    } finally {
      span.end();
    }
  }
}