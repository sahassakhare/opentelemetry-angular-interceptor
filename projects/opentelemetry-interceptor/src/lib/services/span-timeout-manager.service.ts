import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { OTEL_CONFIG, OpenTelemetryConfig, SpanTimeoutConfig } from '../configuration/opentelemetry-config';


/**
 * Span types for timeout management
 */
export enum SpanType {
  HTTP = 'http',
  UI = 'ui',
  MANUAL = 'manual'
}

/**
 * Internal span tracking information
 */
interface SpanTrackingInfo {
  span: Span;
  type: SpanType;
  startTime: number;
  timeoutMs: number;
  timeoutId: NodeJS.Timeout;
  operationName: string;
  attributes: Record<string, any>;
}

/**
 * Memory usage statistics
 */
export interface MemoryStats {
  activeSpansCount: number;
  totalSpansCreated: number;
  totalSpansCompleted: number;
  totalSpansTimedOut: number;
  leakedSpansDetected: number;
  memoryUsageBytes?: number;
}

/**
 * SpanTimeoutManager Service
 * 
 * Provides comprehensive span timeout mechanism to prevent memory leaks
 * from unclosed spans in long-running applications.
 * 
 * Features:
 * - Configurable TTL for different span types (HTTP, UI, Manual)
 * - Automatic span cleanup after timeout
 * - Memory usage monitoring and leak detection
 * - WeakMap-based tracking to avoid memory retention
 * - Graceful span ending with timeout status
 */
@Injectable({
  providedIn: 'root'
})
export class SpanTimeoutManager {
  private readonly config: SpanTimeoutConfig;
  private readonly activeSpans = new WeakMap<Span, SpanTrackingInfo>();
  private readonly spanRegistry = new Map<string, SpanTrackingInfo>();
  private leakDetectionTimer?: NodeJS.Timeout;
  private stats: MemoryStats = {
    activeSpansCount: 0,
    totalSpansCreated: 0,
    totalSpansCompleted: 0,
    totalSpansTimedOut: 0,
    leakedSpansDetected: 0
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject(OTEL_CONFIG) private otelConfig?: OpenTelemetryConfig
  ) {
    this.config = this.initializeConfig();
    this.startLeakDetection();
  }

  /**
   * Initialize timeout configuration from OpenTelemetry config
   */
  private initializeConfig(): SpanTimeoutConfig {
    const defaultConfig: SpanTimeoutConfig = {
      httpTimeoutMs: 30000,    // 30 seconds for HTTP spans
      uiTimeoutMs: 10000,      // 10 seconds for UI spans
      manualTimeoutMs: 60000,  // 60 seconds for manual spans
      enabled: true,
      leakDetectionIntervalMs: 300000, // 5 minutes - increased to reduce overhead
      memoryMonitoring: true,
      maxActiveSpans: 1000
    };

    // Merge with configuration from otelConfig.spanTimeout if available
    const configFromOtel = this.otelConfig?.spanTimeout || {};
    return { ...defaultConfig, ...configFromOtel };
  }

  /**
   * Register a span for timeout management
   */
  trackSpan(
    span: Span, 
    type: SpanType = SpanType.MANUAL, 
    operationName: string = 'unknown',
    customTimeoutMs?: number,
    attributes: Record<string, any> = {}
  ): void {
    if (!isPlatformBrowser(this.platformId) || !this.config.enabled) {
      return;
    }

    // Check if we've exceeded maximum active spans
    if (this.stats.activeSpansCount >= (this.config.maxActiveSpans || 1000)) {
      console.warn(`[SpanTimeoutManager] Maximum active spans (${this.config.maxActiveSpans}) exceeded. Span tracking skipped.`);
      return;
    }

    try {
      const timeoutMs = customTimeoutMs || this.getTimeoutForType(type);
      const spanId = this.generateSpanId(span, operationName);
      
      const timeoutId = setTimeout(() => {
        this.handleSpanTimeout(spanId);
      }, timeoutMs);

      const trackingInfo: SpanTrackingInfo = {
        span,
        type,
        startTime: Date.now(),
        timeoutMs,
        timeoutId,
        operationName,
        attributes
      };

      // Use WeakMap for automatic cleanup when span is GC'd
      this.activeSpans.set(span, trackingInfo);
      
      // Use Map with generated ID for timeout management
      this.spanRegistry.set(spanId, trackingInfo);

      this.stats.activeSpansCount++;
      this.stats.totalSpansCreated++;

      // Add timeout tracking attributes to the span
      span.setAttributes({
        'span.timeout.enabled': true,
        'span.timeout.type': type,
        'span.timeout.ms': timeoutMs,
        'span.timeout.operation': operationName,
        ...attributes
      });

    } catch (error) {
      console.warn('[SpanTimeoutManager] Failed to track span:', error);
    }
  }

  /**
   * Unregister a span when it completes normally
   */
  untrackSpan(span: Span): void {
    if (!isPlatformBrowser(this.platformId) || !this.config.enabled) {
      return;
    }

    try {
      const trackingInfo = this.activeSpans.get(span);
      if (trackingInfo) {
        // Clear the timeout
        clearTimeout(trackingInfo.timeoutId);
        
        // Remove from tracking
        this.activeSpans.delete(span);
        const spanId = this.generateSpanId(span, trackingInfo.operationName);
        this.spanRegistry.delete(spanId);
        
        this.stats.activeSpansCount = Math.max(0, this.stats.activeSpansCount - 1);
        this.stats.totalSpansCompleted++;
      }
    } catch (error) {
      console.warn('[SpanTimeoutManager] Failed to untrack span:', error);
    }
  }

  /**
   * Handle span timeout
   */
  private handleSpanTimeout(spanId: string): void {
    try {
      const trackingInfo = this.spanRegistry.get(spanId);
      if (!trackingInfo) {
        return;
      }

      const { span, type, operationName, startTime, timeoutMs } = trackingInfo;
      const duration = Date.now() - startTime;

      // Set timeout status and end the span
      span.setAttributes({
        'span.timeout.occurred': true,
        'span.timeout.duration_ms': duration,
        'span.timeout.configured_ms': timeoutMs
      });

      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `Span timed out after ${timeoutMs}ms`
      });

      span.addEvent('span.timeout', {
        'timeout.type': type,
        'timeout.duration_ms': duration,
        'timeout.configured_ms': timeoutMs,
        'operation.name': operationName
      });

      span.end();

      // Clean up tracking
      this.activeSpans.delete(span);
      this.spanRegistry.delete(spanId);

      this.stats.activeSpansCount = Math.max(0, this.stats.activeSpansCount - 1);
      this.stats.totalSpansTimedOut++;

      console.warn(`[SpanTimeoutManager] Span timeout: ${operationName} (${type}) after ${duration}ms`);

    } catch (error) {
      console.error('[SpanTimeoutManager] Error handling span timeout:', error);
    }
  }

  /**
   * Get timeout duration for span type
   */
  private getTimeoutForType(type: SpanType): number {
    switch (type) {
      case SpanType.HTTP:
        return this.config.httpTimeoutMs || 30000;
      case SpanType.UI:
        return this.config.uiTimeoutMs || 10000;
      case SpanType.MANUAL:
        return this.config.manualTimeoutMs || 60000;
      default:
        return this.config.manualTimeoutMs || 60000;
    }
  }

  /**
   * Generate a unique ID for span tracking
   */
  private generateSpanId(span: Span, operationName: string): string {
    try {
      const spanContext = span.spanContext();
      return `${spanContext.traceId}-${spanContext.spanId}-${operationName}`;
    } catch {
      // Fallback to timestamp-based ID if span context is not available
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${operationName}`;
    }
  }

  /**
   * Start periodic leak detection
   */
  private startLeakDetection(): void {
    if (!isPlatformBrowser(this.platformId) || !this.config.enabled) {
      return;
    }

    const interval = this.config.leakDetectionIntervalMs || 300000; // Default to 5 minutes
    
    this.leakDetectionTimer = setInterval(() => {
      this.performLeakDetection();
    }, interval);
  }

  /**
   * Perform leak detection and cleanup
   */
  private performLeakDetection(): void {
    try {
      const now = Date.now();
      const stalenessThreshold = 5 * 60 * 1000; // 5 minutes
      let leakedCount = 0;

      // Check for stale spans that should have been cleaned up
      for (const [spanId, trackingInfo] of this.spanRegistry.entries()) {
        const age = now - trackingInfo.startTime;
        
        // If span is older than staleness threshold beyond its timeout, it's likely leaked
        if (age > (trackingInfo.timeoutMs + stalenessThreshold)) {
          console.warn(`[SpanTimeoutManager] Detected leaked span: ${trackingInfo.operationName} (age: ${age}ms)`);
          
          // Force cleanup
          clearTimeout(trackingInfo.timeoutId);
          this.spanRegistry.delete(spanId);
          this.activeSpans.delete(trackingInfo.span);
          leakedCount++;
        }
      }

      if (leakedCount > 0) {
        this.stats.leakedSpansDetected += leakedCount;
        this.stats.activeSpansCount = Math.max(0, this.stats.activeSpansCount - leakedCount);
      }

      // Update memory statistics
      if (this.config.memoryMonitoring && (performance as any)?.memory) {
        this.stats.memoryUsageBytes = (performance as any).memory.usedJSHeapSize;
      }

    } catch (error) {
      console.error('[SpanTimeoutManager] Error during leak detection:', error);
    }
  }

  /**
   * Get current memory and span statistics
   */
  getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.stats = {
      activeSpansCount: this.spanRegistry.size,
      totalSpansCreated: 0,
      totalSpansCompleted: 0,
      totalSpansTimedOut: 0,
      leakedSpansDetected: 0
    };
  }

  /**
   * Update timeout for a specific span type
   */
  updateTimeout(type: SpanType, timeoutMs: number): void {
    switch (type) {
      case SpanType.HTTP:
        this.config.httpTimeoutMs = timeoutMs;
        break;
      case SpanType.UI:
        this.config.uiTimeoutMs = timeoutMs;
        break;
      case SpanType.MANUAL:
        this.config.manualTimeoutMs = timeoutMs;
        break;
    }
  }

  /**
   * Enable or disable timeout management
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled && this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = undefined;
    } else if (enabled && !this.leakDetectionTimer) {
      this.startLeakDetection();
    }
  }

  /**
   * Cleanup on service destruction
   */
  ngOnDestroy(): void {
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
    }

    // Clear all active timeouts
    for (const trackingInfo of this.spanRegistry.values()) {
      clearTimeout(trackingInfo.timeoutId);
    }

    this.spanRegistry.clear();
  }
}