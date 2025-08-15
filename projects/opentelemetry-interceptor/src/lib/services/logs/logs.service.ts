import { Injectable, Inject, Optional, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerProvider, Logger, LogRecord, SeverityNumber } from '@opentelemetry/api-logs';
import { trace, context as otelContext, SpanStatusCode } from '@opentelemetry/api';
import { OTEL_LOGS_CONFIG, OTEL_LOGS_PROVIDER, LogsConfig } from '../../configuration/opentelemetry-config';

export interface LogContext {
  trace_id?: string;
  span_id?: string;
  trace_flags?: string;
}

/**
 * Rate limiting bucket for sliding window
 */
interface RateLimitBucket {
  count: number;
  timestamps: number[];
  lastAccessed: number;
}

/**
 * Memory usage statistics for rate limiting
 */
interface MemoryStats {
  totalBuckets: number;
  totalTimestamps: number;
  estimatedMemoryMB: number;
  oldestBucket: number;
  newestBucket: number;
}

@Injectable({
  providedIn: 'root'
})
export class OpenTelemetryLogsService implements OnDestroy {
  private logger!: Logger;
  private config: LogsConfig;
  private rateLimitBuckets = new Map<string, RateLimitBucket>();
  private cleanupInterval: any;
  private memoryPressureThreshold: number;
  private maxBucketsPerLevel: number;
  private slidingWindowMs: number;
  private cleanupIntervalMs: number;
  private severityMap: Record<string, SeverityNumber> = {
    debug: SeverityNumber.DEBUG,
    info: SeverityNumber.INFO,
    warn: SeverityNumber.WARN,
    error: SeverityNumber.ERROR
  };

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(OTEL_LOGS_CONFIG) @Optional() config: LogsConfig | null,
    @Inject(OTEL_LOGS_PROVIDER) @Optional() private loggerProvider: LoggerProvider | null
  ) {
    this.config = config || { enabled: true };
    
    // Initialize rate limiting configuration with defaults
    this.memoryPressureThreshold = this.config.rateLimit?.memoryThresholdMB || 100;
    this.maxBucketsPerLevel = this.config.rateLimit?.maxBucketsPerLevel || 100;
    this.slidingWindowMs = this.config.rateLimit?.slidingWindowMs || 60000; // 1 minute
    this.cleanupIntervalMs = this.config.rateLimit?.cleanupIntervalMs || 300000; // 5 minutes
    
    // console.log('[LOGS-SERVICE] Constructor called with:', {
    //   isPlatformBrowser: isPlatformBrowser(this.platformId),
    //   configEnabled: this.config.enabled,
    //   loggerProviderExists: !!this.loggerProvider,
    //   config: this.config
    // });
    
    if (isPlatformBrowser(this.platformId) && this.config.enabled && this.loggerProvider) {
      this.logger = this.loggerProvider.getLogger('angular-app', '1.0.0');
      // console.log('[LOGS-SERVICE] Logger created successfully');
      // TEMPORARILY DISABLED: Console bridge can cause infinite loops with devtools
      // this.initializeConsoleBridge();
      // Delay initialization to avoid startup performance impact
      setTimeout(() => {
        this.initializeRateLimitCleanup();
      }, 10000); // Initialize after 10 seconds
    } else {
      // console.warn('[LOGS-SERVICE] Logger NOT created - missing requirements:', {
      //   isPlatformBrowser: isPlatformBrowser(this.platformId),
      //   configEnabled: this.config.enabled,
      //   loggerProviderExists: !!this.loggerProvider
      // });
    }
  }

  /**
   * Get current trace context from active span
   * Enhanced with Angular Zone fallback for better context retrieval
   */
  private getTraceContext(): LogContext {
    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }

    try {
      // Primary: Try to get active span from OTEL context
      let activeSpan = trace.getActiveSpan();
      console.log('[LOGS-SERVICE] Checking for active span:', !!activeSpan);
      
      // Fallback 1: Check global storage from HTTP interceptor
      if (!activeSpan) {
        const globalContext = (globalThis as any);
        if (globalContext.__otelActiveSpans && globalContext.__otelActiveSpans.size > 0) {
          // Get the most recent span (latest timestamp)
          let latestSpan = null;
          let latestTimestamp = 0;
          
          for (const [, spanData] of globalContext.__otelActiveSpans) {
            if (spanData.timestamp > latestTimestamp) {
              latestTimestamp = spanData.timestamp;
              latestSpan = spanData.span;
            }
          }
          
          if (latestSpan) {
            activeSpan = latestSpan;
            console.log('[LOGS-SERVICE] Found span from global storage:', !!activeSpan);
          }
        }
      }
      
      // Fallback 2: Check window storage
      if (!activeSpan && typeof window !== 'undefined' && (window as any).__otelCurrentSpan) {
        activeSpan = (window as any).__otelCurrentSpan;
        console.log('[LOGS-SERVICE] Found span from window storage:', !!activeSpan);
      }
      
      // Fallback 3: Check Angular Zone for preserved OTEL context
      if (!activeSpan && typeof window !== 'undefined' && (window as any).Zone) {
        const currentZone = (window as any).Zone.current;
        if (currentZone && currentZone._otelActiveSpan) {
          activeSpan = currentZone._otelActiveSpan;
          console.log('[LOGS-SERVICE] Found span from Angular Zone:', !!activeSpan);
        }
      }
      
      // Fallback 4: Check all contexts in the current context chain
      if (!activeSpan) {
        const activeContext = otelContext.active();
        activeSpan = trace.getSpan(activeContext);
        console.log('[LOGS-SERVICE] Trying getSpan from active context:', !!activeSpan);
      }
      
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        console.log('[LOGS-SERVICE] Found active span:', {
          traceId: spanContext.traceId,
          spanId: spanContext.spanId,
          traceFlags: spanContext.traceFlags,
          source: activeSpan === trace.getActiveSpan() ? 'otel-direct' : 'fallback'
        });
        return {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
          trace_flags: spanContext.traceFlags.toString()
        };
      } else {
        console.log('[LOGS-SERVICE] No active span found - logs will not have trace correlation');
        
        // Debug: Check what's in the current context
        try {
          const activeContext = otelContext.active();
          console.log('[LOGS-SERVICE] Active context keys:', Object.keys(activeContext || {}));
        } catch (e) {
          console.log('[LOGS-SERVICE] Could not inspect active context');
        }
      }
    } catch (error) {
      console.warn('Failed to get trace context:', error);
    }

    return {};
  }

  /**
   * Initialize rate limiting cleanup mechanism
   */
  private initializeRateLimitCleanup(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Use configured cleanup interval
    
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredBuckets();
      this.checkMemoryPressure();
    }, this.cleanupIntervalMs);

    // Cleanup when service is destroyed
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroyRateLimiting();
      });
    }
  }

  /**
   * Cleanup expired rate limit buckets
   */
  private cleanupExpiredBuckets(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, bucket] of this.rateLimitBuckets.entries()) {
      // Remove timestamps older than sliding window
      bucket.timestamps = bucket.timestamps.filter(ts => now - ts < this.slidingWindowMs);
      bucket.count = bucket.timestamps.length;
      bucket.lastAccessed = now;
      
      // Remove buckets with no recent activity
      if (bucket.count === 0 && now - bucket.lastAccessed > this.slidingWindowMs) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired buckets
    expiredKeys.forEach(key => this.rateLimitBuckets.delete(key));
    
    if (expiredKeys.length > 0) {
      console.debug(`[LOGS-RATE-LIMIT] Cleaned up ${expiredKeys.length} expired buckets`);
    }
  }

  /**
   * Check for memory pressure and implement LRU eviction
   */
  private checkMemoryPressure(): void {
    const stats = this.getMemoryStats();
    
    // Log memory usage for monitoring
    if (stats.totalBuckets > 50) {
      console.warn('[LOGS-RATE-LIMIT] High bucket count:', stats);
    }
    
    // Implement memory bounds
    if (stats.estimatedMemoryMB > this.memoryPressureThreshold || 
        stats.totalBuckets > this.maxBucketsPerLevel * 10) {
      
      console.warn('[LOGS-RATE-LIMIT] Memory pressure detected, implementing LRU eviction:', stats);
      this.evictLRUBuckets();
    }
  }

  /**
   * Evict least recently used buckets to control memory
   */
  private evictLRUBuckets(): void {
    const bucketEntries = Array.from(this.rateLimitBuckets.entries());
    
    // Sort by last accessed time (oldest first)
    bucketEntries.sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    // Remove oldest 25% of buckets
    const toRemove = Math.max(1, Math.floor(bucketEntries.length * 0.25));
    
    for (let i = 0; i < toRemove; i++) {
      this.rateLimitBuckets.delete(bucketEntries[i][0]);
    }
    
    console.warn(`[LOGS-RATE-LIMIT] Evicted ${toRemove} LRU buckets to reduce memory pressure`);
  }

  /**
   * Get memory usage statistics
   */
  private getMemoryStats(): MemoryStats {
    let totalTimestamps = 0;
    let oldestBucket = Date.now();
    let newestBucket = 0;
    
    for (const bucket of this.rateLimitBuckets.values()) {
      totalTimestamps += bucket.timestamps.length;
      if (bucket.timestamps.length > 0) {
        oldestBucket = Math.min(oldestBucket, Math.min(...bucket.timestamps));
        newestBucket = Math.max(newestBucket, Math.max(...bucket.timestamps));
      }
    }
    
    // Rough memory estimation (key + bucket + timestamps)
    const estimatedMemoryMB = (
      this.rateLimitBuckets.size * 100 + // bucket overhead
      totalTimestamps * 8 // timestamp size
    ) / (1024 * 1024);
    
    return {
      totalBuckets: this.rateLimitBuckets.size,
      totalTimestamps,
      estimatedMemoryMB: Math.round(estimatedMemoryMB * 100) / 100,
      oldestBucket,
      newestBucket
    };
  }

  /**
   * Destroy rate limiting cleanup
   */
  private destroyRateLimiting(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.rateLimitBuckets.clear();
  }

  /**
   * Check rate limiting with sliding window approach
   */
  private isRateLimited(level: string): boolean {
    if (!this.config.rateLimit) return false;

    const now = Date.now();
    const rateLimitConfig = this.config.rateLimit;
    const maxPerLevel = rateLimitConfig.perSeverity?.[level as keyof typeof rateLimitConfig.perSeverity];
    const globalMax = rateLimitConfig.maxPerMinute;
    
    // Ensure we don't exceed memory bounds per level
    const levelBuckets = Array.from(this.rateLimitBuckets.keys())
      .filter(key => key.startsWith(`${level}-`));
    
    if (levelBuckets.length > this.maxBucketsPerLevel) {
      // Remove oldest buckets for this level
      const sortedBuckets = levelBuckets
        .map(key => ({ key, bucket: this.rateLimitBuckets.get(key)! }))
        .sort((a, b) => a.bucket.lastAccessed - b.bucket.lastAccessed);
      
      for (let i = 0; i < levelBuckets.length - this.maxBucketsPerLevel; i++) {
        this.rateLimitBuckets.delete(sortedBuckets[i].key);
      }
    }
    
    // Use sliding window key based on current time window
    const windowStart = Math.floor(now / this.slidingWindowMs) * this.slidingWindowMs;
    const key = `${level}-${windowStart}`;
    
    if (!this.rateLimitBuckets.has(key)) {
      this.rateLimitBuckets.set(key, { 
        count: 0, 
        timestamps: [], 
        lastAccessed: now 
      });
    }
    
    const bucket = this.rateLimitBuckets.get(key)!;
    bucket.lastAccessed = now;
    
    // Clean up old timestamps within this bucket (sliding window)
    bucket.timestamps = bucket.timestamps.filter(ts => now - ts < this.slidingWindowMs);
    bucket.count = bucket.timestamps.length;
    
    // Check per-severity limit
    if (maxPerLevel && bucket.count >= maxPerLevel) {
      return true;
    }
    
    // Check global limit across all active buckets
    if (globalMax) {
      const totalCount = Array.from(this.rateLimitBuckets.values())
        .reduce((sum, b) => {
          // Only count timestamps within sliding window
          const activeTimestamps = b.timestamps.filter(ts => now - ts < this.slidingWindowMs);
          return sum + activeTimestamps.length;
        }, 0);
      
      if (totalCount >= globalMax) {
        return true;
      }
    }
    
    // Add timestamp and increment count
    bucket.timestamps.push(now);
    bucket.count++;
    
    return false;
  }

  /**
   * Redact PII from log attributes
   */
  private sanitizeAttributes(attributes: Record<string, any>): Record<string, any> {
    if (!this.config.redact?.enabled || !this.config.redact.patterns) {
      return attributes;
    }

    const sanitized = { ...attributes };
    const patterns = this.config.redact.patterns.map(p => 
      typeof p === 'string' ? new RegExp(p, 'gi') : p
    );

    const redactValue = (value: any): any => {
      if (typeof value === 'string') {
        let redacted = value;
        patterns.forEach(pattern => {
          redacted = redacted.replace(pattern, '[REDACTED]');
        });
        return redacted;
      } else if (typeof value === 'object' && value !== null) {
        const result: any = Array.isArray(value) ? [] : {};
        for (const [k, v] of Object.entries(value)) {
          result[k] = redactValue(v);
        }
        return result;
      }
      return value;
    };

    for (const [key, value] of Object.entries(sanitized)) {
      sanitized[key] = redactValue(value);
    }

    return sanitized;
  }

  /**
   * Emit log record directly to OTEL without console output (used by console bridge)
   */
  private emitLogRecordDirect(level: string, message: string, attributes: Record<string, any> = {}): void {
    if (!this.logger || !this.config.enabled) return;

    // Check rate limiting
    if (this.isRateLimited(level)) {
      return;
    }

    // Get trace correlation
    const traceContext = this.getTraceContext();
    
    // Sanitize attributes for PII
    const sanitizedAttributes = this.sanitizeAttributes(attributes);

    // Build final attributes with trace correlation
    const finalAttributes = {
      ...sanitizedAttributes,
      ...(traceContext.trace_id && { 'trace.trace_id': traceContext.trace_id }),
      ...(traceContext.span_id && { 'trace.span_id': traceContext.span_id }),
      ...(traceContext.trace_flags && { 'trace.flags': traceContext.trace_flags })
    };

    try {
      // Convert attributes to OTEL-compatible format
      const otelAttributes: Record<string, any> = {};
      for (const [key, value] of Object.entries(finalAttributes)) {
        // OTEL expects primitive values or nested objects
        otelAttributes[key] = typeof value === 'object' && value !== null 
          ? JSON.stringify(value) 
          : value;
      }

      // Get the current active context which should contain span context
      const activeContext = otelContext.active();
      const activeSpan = trace.getActiveSpan();
      
      const logRecord: LogRecord = {
        timestamp: Date.now() * 1_000_000, // Convert to nanoseconds
        observedTimestamp: Date.now() * 1_000_000,
        severityNumber: this.severityMap[level],
        severityText: level.toUpperCase(),
        body: message,
        attributes: otelAttributes,
        context: activeContext // Include active OTEL context with span
      };

      // Debug: Check if we have span context
      if (this.config.level === 'debug' && activeSpan) {
        const spanContext = activeSpan.spanContext();
        // console.log('Active span found (Direct):', {
        //   traceId: spanContext.traceId,
        //   spanId: spanContext.spanId,
        //   traceFlags: spanContext.traceFlags
        // });
      }

      // Emit log record within the active context to ensure span correlation
      if (activeSpan) {
        // Use context.with to ensure the log is emitted in the span context
        otelContext.with(trace.setSpan(activeContext, activeSpan), () => {
          this.logger.emit(logRecord);
        });
      } else {
        this.logger.emit(logRecord);
      }
      
      // NOTE: No console output here to avoid recursion in console bridge
    } catch (error) {
      console.warn('Failed to emit log record:', error);
    }
  }

  /**
   * Emit log record with OpenTelemetry
   */
  private emitLogRecord(level: string, message: string, attributes: Record<string, any> = {}): void {
    if (!this.logger || !this.config.enabled) return;

    // Check rate limiting
    if (this.isRateLimited(level)) {
      return;
    }

    // Get trace correlation
    const traceContext = this.getTraceContext();
    
    // Sanitize attributes for PII
    const sanitizedAttributes = this.sanitizeAttributes(attributes);

    // Build final attributes with trace correlation
    const finalAttributes = {
      ...sanitizedAttributes,
      ...(traceContext.trace_id && { 'trace.trace_id': traceContext.trace_id }),
      ...(traceContext.span_id && { 'trace.span_id': traceContext.span_id }),
      ...(traceContext.trace_flags && { 'trace.flags': traceContext.trace_flags })
    };

    try {
      // Convert attributes to OTEL-compatible format
      const otelAttributes: Record<string, any> = {};
      for (const [key, value] of Object.entries(finalAttributes)) {
        // OTEL expects primitive values or nested objects
        otelAttributes[key] = typeof value === 'object' && value !== null 
          ? JSON.stringify(value) 
          : value;
      }

      // Get the current active context which should contain span context
      const activeContext = otelContext.active();
      const activeSpan = trace.getActiveSpan();
      
      const logRecord: LogRecord = {
        timestamp: Date.now() * 1_000_000, // Convert to nanoseconds
        observedTimestamp: Date.now() * 1_000_000,
        severityNumber: this.severityMap[level],
        severityText: level.toUpperCase(),
        body: message,
        attributes: otelAttributes,
        context: activeContext // Include active OTEL context with span
      };

      // Debug: Log the record structure being emitted
      if (this.config.level === 'debug') {
        // console.log('Emitting OTEL LogRecord:', JSON.stringify({
        //   ...logRecord,
        //   context: logRecord.context ? '[Context Object]' : undefined
        // }, null, 2));
        
        // Debug: Check if we have span context
        if (activeSpan) {
          const spanContext = activeSpan.spanContext();
          // console.log('Active span found (Regular):', {
          //   traceId: spanContext.traceId,
          //   spanId: spanContext.spanId,
          //   traceFlags: spanContext.traceFlags
          // });
        } else {
          // console.log('No active span found for log correlation');
        }
      }

      // Debug: Check if logger exists
      if (!this.logger) {
        // console.error('[LOGS-SERVICE] Logger not initialized - logs will not be sent to OTLP!');
        return;
      }

      // console.log(`[LOGS-SERVICE] Emitting log to OTLP: "${message}" (${level})`);

      // Emit log record within the active context to ensure span correlation
      if (activeSpan) {
        // Use context.with to ensure the log is emitted in the span context
        otelContext.with(trace.setSpan(activeContext, activeSpan), () => {
          this.logger.emit(logRecord);
        });
      } else {
        this.logger.emit(logRecord);
      }

      // console.log(`[LOGS-SERVICE] Log emitted to logger successfully`);

      // Console output if enabled (our custom format)
      if (this.config.console) {
        const consoleMethod = level === 'error' ? 'error' : 
                             level === 'warn' ? 'warn' : 
                             level === 'debug' ? 'debug' : 'log';
        
        // Format attributes for readable console output
        const formattedAttributes = Object.keys(finalAttributes).length > 0 
          ? `\nAttributes: ${JSON.stringify(finalAttributes, null, 2)}`
          : '';
          
        console[consoleMethod](`[OTEL-LOG:${level.toUpperCase()}] ${message}${formattedAttributes}`);
      }
    } catch (error) {
      console.warn('Failed to emit log record:', error);
    }
  }

  /**
   * Initialize console bridge to capture console.log calls
   */
  private initializeConsoleBridge(): void {
    // SAFETY CHECK: Prevent console bridge in development to avoid infinite loops
    if (!this.config.consoleBridge || !isPlatformBrowser(this.platformId)) return;
    
    // Additional safety: Don't initialize if devtools are open
    if (typeof window !== 'undefined' && (window as any).chrome && (window as any).chrome.devtools) {
      console.warn('[LOGS-SERVICE] Console bridge disabled when DevTools are open to prevent loops');
      return;
    }

    const originalMethods = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };

    // Helper function to format console arguments
    const formatArgs = (args: any[]): string => {
      return args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (error) {
            return '[Object - could not serialize]';
          }
        }
        return String(arg);
      }).join(' ');
    };

    console.log = (...args: any[]) => {
      // Emit to OTEL logs (bypassing console output to avoid recursion)
      this.emitLogRecordDirect('info', formatArgs(args), { source: 'console.log' });
      // Call original method
      originalMethods.log.apply(console, args);
    };

    console.info = (...args: any[]) => {
      this.emitLogRecordDirect('info', formatArgs(args), { source: 'console.info' });
      originalMethods.info.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.emitLogRecordDirect('warn', formatArgs(args), { source: 'console.warn' });
      originalMethods.warn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      this.emitLogRecordDirect('error', formatArgs(args), { source: 'console.error' });
      originalMethods.error.apply(console, args);
    };

    console.debug = (...args: any[]) => {
      this.emitLogRecordDirect('debug', formatArgs(args), { source: 'console.debug' });
      originalMethods.debug.apply(console, args);
    };
  }

  /**
   * Log debug message
   */
  debug(message: string, attributes?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      this.emitLogRecord('debug', message, attributes);
    }
  }

  /**
   * Log info message
   */
  info(message: string, attributes?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      this.emitLogRecord('info', message, attributes);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, attributes?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      this.emitLogRecord('warn', message, attributes);
    }
  }

  /**
   * Log error message
   */
  error(message: string, attributes?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      this.emitLogRecord('error', message, attributes);
    }
  }

  /**
   * Check if we should log for given level
   */
  private shouldLog(level: string): boolean {
    if (!this.config.enabled) return false;

    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = this.config.level || 'info';
    const levelIndex = levels.indexOf(level);
    const configLevelIndex = levels.indexOf(configLevel);

    return levelIndex >= configLevelIndex;
  }

  /**
   * Log an error with stack trace
   */
  logError(error: Error, context?: Record<string, any>): void {
    this.error(error.message, {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  /**
   * Log with custom severity
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, attributes?: Record<string, any>): void {
    this[level](message, attributes);
  }

  /**
   * Get current rate limiting statistics
   */
  getRateLimitStats(): MemoryStats {
    return this.getMemoryStats();
  }

  /**
   * Manually trigger cleanup (for testing or monitoring)
   */
  triggerCleanup(): void {
    this.cleanupExpiredBuckets();
    this.checkMemoryPressure();
  }

  /**
   * Angular OnDestroy lifecycle hook
   */
  ngOnDestroy(): void {
    this.destroyRateLimiting();
  }
}