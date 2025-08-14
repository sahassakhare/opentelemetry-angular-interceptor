import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { trace, context as otelContext, Span, SpanKind } from '@opentelemetry/api';

/**
 * Enhanced Trace Context Service
 * Provides manual trace context creation for UI interactions and async operations
 */
@Injectable({
  providedIn: 'root'
})
export class TraceContextService {
  
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
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
      const tracer = trace.getTracer('angular-ui', '1.0.0');
      
      const span = tracer.startSpan(operationName, {
        kind: SpanKind.INTERNAL,
        attributes: {
          'interaction.type': 'ui',
          'component.name': 'angular',
          ...attributes
        }
      });

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
      // Execute the function within the span context
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
}