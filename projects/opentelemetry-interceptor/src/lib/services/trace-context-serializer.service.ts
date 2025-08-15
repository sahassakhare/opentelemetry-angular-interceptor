import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trace, context as otelContext, SpanContext, TraceFlags } from '@opentelemetry/api';

/**
 * Interface for serialized trace context
 */
export interface SerializedTraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  isRemote: boolean;
  traceState?: string;
  timestamp: number;
  correlationId: string;
}

/**
 * Service Worker message with trace context
 */
export interface ServiceWorkerMessage {
  type: string;
  data: any;
  traceContext?: SerializedTraceContext;
  messageId: string;
}

/**
 * Service for serializing and deserializing trace context for service worker communication
 * Handles trace context propagation across the postMessage API boundary
 */
@Injectable({
  providedIn: 'root'
})
export class TraceContextSerializer {
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /**
   * Serialize current active trace context for service worker communication
   */
  serializeActiveContext(): SerializedTraceContext | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const activeSpan = trace.getActiveSpan();
      if (!activeSpan) {
        return null;
      }

      const spanContext = activeSpan.spanContext();
      return this.serializeSpanContext(spanContext);
    } catch (error) {
      console.warn('Failed to serialize active trace context:', error);
      return null;
    }
  }

  /**
   * Serialize a specific span context
   */
  serializeSpanContext(spanContext: SpanContext): SerializedTraceContext {
    const correlationId = this.generateCorrelationId();
    
    return {
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      traceFlags: spanContext.traceFlags,
      isRemote: spanContext.isRemote || false,
      traceState: spanContext.traceState?.serialize(),
      timestamp: Date.now(),
      correlationId
    };
  }

  /**
   * Deserialize trace context and create a span context
   */
  deserializeToSpanContext(serialized: SerializedTraceContext): SpanContext | null {
    if (!this.isValidSerializedContext(serialized)) {
      console.warn('Invalid serialized trace context:', serialized);
      return null;
    }

    try {
      const spanContext: SpanContext = {
        traceId: serialized.traceId,
        spanId: serialized.spanId,
        traceFlags: serialized.traceFlags,
        isRemote: true // Always mark as remote when coming from service worker
      };

      // Add trace state if present
      if (serialized.traceState) {
        // Note: We set traceState as undefined here since we can't reconstruct
        // the TraceState object without additional dependencies
        // In a real implementation, you might want to use a TraceState parser
      }

      return spanContext;
    } catch (error) {
      console.warn('Failed to deserialize trace context:', error);
      return null;
    }
  }

  /**
   * Create a service worker message with trace context
   */
  createMessageWithTraceContext(type: string, data: any): ServiceWorkerMessage {
    const traceContext = this.serializeActiveContext();
    const messageId = this.generateMessageId();

    return {
      type,
      data,
      traceContext: traceContext || undefined,
      messageId
    };
  }

  /**
   * Extract trace context from service worker message
   */
  extractTraceContextFromMessage(message: ServiceWorkerMessage): SerializedTraceContext | null {
    if (!message.traceContext) {
      return null;
    }

    return this.isValidSerializedContext(message.traceContext) 
      ? message.traceContext 
      : null;
  }

  /**
   * Create a child span context for service worker operations
   */
  createChildSpanContext(parentContext: SerializedTraceContext): SpanContext | null {
    if (!this.isValidSerializedContext(parentContext)) {
      return null;
    }

    try {
      // Create a new span ID for the child operation
      const childSpanId = this.generateSpanId();
      
      return {
        traceId: parentContext.traceId,
        spanId: childSpanId,
        traceFlags: parentContext.traceFlags,
        isRemote: true
      };
    } catch (error) {
      console.warn('Failed to create child span context:', error);
      return null;
    }
  }

  /**
   * Validate serialized trace context
   */
  private isValidSerializedContext(context: SerializedTraceContext): boolean {
    if (!context) {
      return false;
    }

    // Check required fields
    if (!context.traceId || !context.spanId) {
      return false;
    }

    // Validate trace ID format (32 hex characters)
    if (!/^[0-9a-f]{32}$/.test(context.traceId)) {
      return false;
    }

    // Validate span ID format (16 hex characters)
    if (!/^[0-9a-f]{16}$/.test(context.spanId)) {
      return false;
    }

    // Check trace flags are valid
    if (typeof context.traceFlags !== 'number' || context.traceFlags < 0 || context.traceFlags > 255) {
      return false;
    }

    // Check timestamp is reasonable (not too old)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (context.timestamp && (Date.now() - context.timestamp > maxAge)) {
      console.warn('Trace context is too old, ignoring');
      return false;
    }

    return true;
  }

  /**
   * Generate a unique correlation ID for tracking operations
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a new span ID (16 hex characters)
   */
  private generateSpanId(): string {
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < 8; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Check if trace context has expired
   */
  isContextExpired(context: SerializedTraceContext, maxAgeMs: number = 60000): boolean {
    if (!context.timestamp) {
      return false; // If no timestamp, assume it's still valid
    }

    return (Date.now() - context.timestamp) > maxAgeMs;
  }

  /**
   * Clone and refresh timestamp of trace context
   */
  refreshContext(context: SerializedTraceContext): SerializedTraceContext {
    return {
      ...context,
      timestamp: Date.now()
    };
  }
}