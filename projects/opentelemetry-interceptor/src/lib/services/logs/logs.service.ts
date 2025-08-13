import { Injectable, Inject, Optional, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerProvider, Logger, LogRecord, SeverityNumber } from '@opentelemetry/api-logs';
import { trace, context as otelContext, SpanStatusCode } from '@opentelemetry/api';
import { OTEL_LOGS_CONFIG, OTEL_LOGS_PROVIDER, LogsConfig } from '../../configuration/opentelemetry-config';

export interface LogContext {
  trace_id?: string;
  span_id?: string;
  trace_flags?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenTelemetryLogsService {
  private logger!: Logger;
  private config: LogsConfig;
  private rateLimitCounts = new Map<string, { count: number; resetTime: number }>();
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
    
    // console.log('[LOGS-SERVICE] Constructor called with:', {
    //   isPlatformBrowser: isPlatformBrowser(this.platformId),
    //   configEnabled: this.config.enabled,
    //   loggerProviderExists: !!this.loggerProvider,
    //   config: this.config
    // });
    
    if (isPlatformBrowser(this.platformId) && this.config.enabled && this.loggerProvider) {
      this.logger = this.loggerProvider.getLogger('angular-app', '1.0.0');
      // console.log('[LOGS-SERVICE] Logger created successfully');
      this.initializeConsoleBridge();
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
   */
  private getTraceContext(): LogContext {
    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }

    try {
      const activeSpan = trace.getActiveSpan();
      if (activeSpan) {
        const spanContext = activeSpan.spanContext();
        return {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
          trace_flags: spanContext.traceFlags.toString()
        };
      }
    } catch (error) {
      console.warn('Failed to get trace context:', error);
    }

    return {};
  }

  /**
   * Check rate limiting for log level
   */
  private isRateLimited(level: string): boolean {
    if (!this.config.rateLimit) return false;

    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const key = `${level}-${minute}`;
    
    const rateLimitConfig = this.config.rateLimit;
    const maxPerLevel = rateLimitConfig.perSeverity?.[level as keyof typeof rateLimitConfig.perSeverity];
    const globalMax = rateLimitConfig.maxPerMinute;

    if (!this.rateLimitCounts.has(key)) {
      this.rateLimitCounts.set(key, { count: 0, resetTime: (minute + 1) * 60000 });
    }

    const rateLimitData = this.rateLimitCounts.get(key)!;

    // Clean up old entries
    if (now >= rateLimitData.resetTime) {
      this.rateLimitCounts.delete(key);
      return false;
    }

    // Check per-severity limit
    if (maxPerLevel && rateLimitData.count >= maxPerLevel) {
      return true;
    }

    // Check global limit
    if (globalMax) {
      const totalCount = Array.from(this.rateLimitCounts.values())
        .filter(data => now < data.resetTime)
        .reduce((sum, data) => sum + data.count, 0);
      
      if (totalCount >= globalMax) {
        return true;
      }
    }

    rateLimitData.count++;
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
    if (!this.config.consoleBridge || !isPlatformBrowser(this.platformId)) return;

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
}