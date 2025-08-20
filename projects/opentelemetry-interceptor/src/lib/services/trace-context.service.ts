import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trace, context as otelContext, Span, SpanKind, SpanContext } from '@opentelemetry/api';
import { TraceContextSerializer, SerializedTraceContext } from './trace-context-serializer.service';

/**
 * Enhanced Trace Context Service
 * Provides manual trace context creation for UI interactions and async operations
 */
@Injectable({
  providedIn: 'root'
})
export class TraceContextService {
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private traceSerializer: TraceContextSerializer
  ) {}

  /**
   * Create a manual span for UI interactions
   * This allows logs within UI operations to have trace context
   */
  createUserInteractionSpan(operationName: string, attributes: Record<string, any> = {}): Span | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      // Get the global tracer provider and create a tracer
      const tracerProvider = trace.getTracerProvider();
      console.log('[TraceContextService] TracerProvider available:', !!tracerProvider);
      
      const tracer = trace.getTracer('angular-ui', '1.0.0');
      console.log('[TraceContextService] Tracer obtained:', !!tracer);
      
      // CRITICAL FIX: Start span with root context for UI interactions
      // UI interactions should start new trace roots, not be children of HTTP spans
      const span = tracer.startSpan(operationName, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'interaction.type': 'ui',
          'component.name': 'angular',
          'span.source': 'trace-context-service',
          ...attributes
        }
        // Remove parentContext to start a new trace root
      });

      const spanContext = span.spanContext();
      console.log('[TraceContextService] Span created:', {
        operationName,
        hasSpan: !!span,
        spanId: spanContext.spanId,
        traceId: spanContext.traceId,
        traceFlags: spanContext.traceFlags,
        isValid: trace.isSpanContextValid(spanContext),
        isSampled: (spanContext.traceFlags & 1) === 1
      });

      // Validate span context before returning
      if (!trace.isSpanContextValid(spanContext)) {
        console.warn('[TraceContextService] Created span context is invalid, ending span');
        span.end();
        return null;
      }

      return span;
    } catch (error) {
      console.warn('Failed to create user interaction span:', error);
      return null;
    }
  }

  /**
   * Execute a function within a trace context
   * This ensures any logs within the function have trace correlation
   */
  withTraceContext<T>(
    operationName: string, 
    fn: () => T, 
    attributes: Record<string, any> = {}
  ): T {
    if (!isPlatformBrowser(this.platformId)) {
      return fn();
    }

    const span = this.createUserInteractionSpan(operationName, attributes);
    
    if (!span) {
      return fn();
    }

    try {
      // CRITICAL FIX: Set the span as active in the context
      const activeContext = trace.setSpan(otelContext.active(), span);
      
      console.log('[TraceContextService] Executing with active span context:', {
        operationName,
        spanId: span.spanContext().spanId,
        traceId: span.spanContext().traceId,
        contextSet: !!activeContext
      });
      
      // Execute the function within the span context
      return otelContext.with(activeContext, () => {
        try {
          const result = fn();
          span.setStatus({ code: 1 }); // OK status
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ 
            code: 2, // ERROR status
            message: (error as Error).message 
          });
          throw error;
        }
      });
    } catch (contextError) {
      console.error('[TraceContextService] Failed to execute with context:', contextError);
      return fn();
    } finally {
      // End the span after a brief delay to allow async operations
      setTimeout(() => {
        span.end();
      }, 100);
    }
  }

  /**
   * Execute an async function within a trace context
   */
  async withTraceContextAsync<T>(
    operationName: string, 
    fn: () => Promise<T>, 
    attributes: Record<string, any> = {}
  ): Promise<T> {
    if (!isPlatformBrowser(this.platformId)) {
      return fn();
    }

    const span = this.createUserInteractionSpan(operationName, attributes);
    
    if (!span) {
      return fn();
    }

    try {
      // Execute the async function within the span context
      return await otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
        try {
          const result = await fn();
          span.setStatus({ code: 1 }); // OK status
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ 
            code: 2, // ERROR status
            message: (error as Error).message 
          });
          throw error;
        }
      });
    } finally {
      // End the span after a brief delay to allow async operations
      setTimeout(() => {
        span.end();
      }, 100);
    }
  }

  /**
   * Get current active span information
   * Useful for debugging trace context
   */
  getCurrentSpanInfo(): { hasSpan: boolean; traceId?: string; spanId?: string } {
    if (!isPlatformBrowser(this.platformId)) {
      return { hasSpan: false };
    }

    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        return {
          hasSpan: true,
          traceId: spanContext.traceId,
          spanId: spanContext.spanId
        };
      }
    } catch (error) {
      console.warn('Failed to get current span info:', error);
    }

    return { hasSpan: false };
  }

  /**
   * NEW: Serialize current active trace context for service worker communication
   * This enables trace context propagation across the postMessage API boundary
   */
  serializeActiveTraceContext(): SerializedTraceContext | null {
    return this.traceSerializer.serializeActiveContext();
  }

  /**
   * NEW: Create a child span from serialized trace context
   * Used when receiving trace context from service worker or other sources
   */
  createChildSpanFromSerializedContext(
    serializedContext: SerializedTraceContext,
    operationName: string,
    attributes: Record<string, any> = {}
  ): Span | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      const parentSpanContext = this.traceSerializer.deserializeToSpanContext(serializedContext);
      if (!parentSpanContext) {
        return null;
      }

      const tracer = trace.getTracer('angular-sw', '1.0.0');
      
      // Create child span context
      const childSpanContext = this.traceSerializer.createChildSpanContext(serializedContext);
      if (!childSpanContext) {
        return null;
      }

      // Start span with parent context
      const span = tracer.startSpan(operationName, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'interaction.type': 'service-worker',
          'component.name': 'angular',
          'parent.trace_id': parentSpanContext.traceId,
          'parent.span_id': parentSpanContext.spanId,
          ...attributes
        }
      }, trace.setSpanContext(otelContext.active(), parentSpanContext));

      return span;
    } catch (error) {
      console.warn('Failed to create child span from serialized context:', error);
      return null;
    }
  }

  /**
   * NEW: Execute function with restored trace context from service worker
   * This allows continuing trace context that originated from a service worker operation
   */
  withRestoredTraceContext<T>(
    serializedContext: SerializedTraceContext,
    operationName: string,
    fn: () => T,
    attributes: Record<string, any> = {}
  ): T {
    if (!isPlatformBrowser(this.platformId)) {
      return fn();
    }

    const span = this.createChildSpanFromSerializedContext(serializedContext, operationName, attributes);
    
    if (!span) {
      return fn();
    }

    try {
      return otelContext.with(trace.setSpan(otelContext.active(), span), () => {
        try {
          const result = fn();
          span.setStatus({ code: 1 }); // OK status
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ 
            code: 2, // ERROR status
            message: (error as Error).message 
          });
          throw error;
        }
      });
    } finally {
      setTimeout(() => {
        span.end();
      }, 100);
    }
  }

  /**
   * NEW: Execute async function with restored trace context from service worker
   */
  async withRestoredTraceContextAsync<T>(
    serializedContext: SerializedTraceContext,
    operationName: string,
    fn: () => Promise<T>,
    attributes: Record<string, any> = {}
  ): Promise<T> {
    if (!isPlatformBrowser(this.platformId)) {
      return fn();
    }

    const span = this.createChildSpanFromSerializedContext(serializedContext, operationName, attributes);
    
    if (!span) {
      return fn();
    }

    try {
      return await otelContext.with(trace.setSpan(otelContext.active(), span), async () => {
        try {
          const result = await fn();
          span.setStatus({ code: 1 }); // OK status
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ 
            code: 2, // ERROR status
            message: (error as Error).message 
          });
          throw error;
        }
      });
    } finally {
      setTimeout(() => {
        span.end();
      }, 100);
    }
  }

  /**
   * NEW: Create trace headers for HTTP requests from current context
   * Useful for adding trace context to fetch requests in service workers
   */
  createTraceHeaders(): Record<string, string> {
    const serializedContext = this.serializeActiveTraceContext();
    if (!serializedContext) {
      return {};
    }

    return {
      'traceparent': `00-${serializedContext.traceId}-${serializedContext.spanId}-${serializedContext.traceFlags.toString(16).padStart(2, '0')}`,
      'x-trace-id': serializedContext.traceId,
      'x-span-id': serializedContext.spanId
    };
  }

  /**
   * NEW: Validate and sanitize serialized trace context
   * Ensures trace context is valid before using it
   */
  validateSerializedContext(context: SerializedTraceContext): boolean {
    try {
      const spanContext = this.traceSerializer.deserializeToSpanContext(context);
      return spanContext !== null;
    } catch {
      return false;
    }
  }

  /**
   * NEW: Get trace context correlation ID for debugging
   * Useful for tracking operations across service worker boundaries
   */
  getTraceCorrelationId(): string | null {
    const context = this.serializeActiveTraceContext();
    return context?.correlationId || null;
  }
}