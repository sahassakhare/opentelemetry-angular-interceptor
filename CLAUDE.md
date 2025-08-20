# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enhanced Angular workspace implementing complete OpenTelemetry observability (traces, logs, metrics) with production-ready features and enterprise-grade reliability. Built on top of `@jufab/opentelemetry-angular-interceptor` with comprehensive enhancements.

### Core Libraries

- **opentelemetry-interceptor**: Enhanced Jufab's interceptor with trace correlation, memory safety, and service worker support
- **otel-bridge-logs**: Angular library for OTEL logs with SSR support and trace correlation
- **otel-bridge-metrics**: Angular library for web-vitals v4 metrics with SPA awareness
- **enhanced-example**: Demo application showcasing all integrations

## Development Commands

```bash
# Start demo application
npm start
# or
npm run serve:demo

# Build libraries
npm run build:libs

# Build demo app
npm run build:demo

# Build all
npm run build

# Run tests
npm test

# Lint and typecheck (IMPORTANT: Run before committing)
npm run lint
npm run typecheck
```

## Architecture

### Enhanced Libraries Structure
```
jufab-enhanced/
  projects/
    opentelemetry-interceptor/    # Enhanced Jufab interceptor
      src/lib/
        interceptor/               # HTTP interceptor with race condition fixes
        services/
          logs/                    # Logs service with trace correlation
          metrics/                 # Metrics service
          exporter/               # Various exporters (OTLP, Console, etc.)
          span-timeout-manager.service.ts    # NEW: Span lifecycle management
          trace-context.service.ts           # NEW: Manual trace context
          service-worker-trace-bridge.ts     # NEW: SW integration
          trace-context-serializer.ts        # NEW: Context serialization
          offline-trace-storage.ts           # NEW: Offline support
        configuration/            # Enhanced config with new options
    enhanced-example/            # Demo application
      src/app/
        components/
          logs-demo/            # Comprehensive logs testing
          metrics-demo/         # Metrics demonstrations
          traces-demo/          # Trace correlation examples
```

## Key Production Enhancements

### 1. Trace Correlation (FIXED)
- **Problem**: Logs showed undefined trace_id/span_id
- **Solution**: Global tracer registration + persistent span storage + multiple fallback mechanisms
- **Strategy**: Two-tier approach for HTTP vs UI scenarios
- **Files**: `opentelemetry-http.interceptor.ts:121,167-193,244-256`, `logs.service.ts:94-149`

### 2. Race Condition Prevention (FIXED)
- **Problem**: Concurrent HTTP requests caused trace context bleeding
- **Solution**: Per-request context isolation using `api.context.with()`
- **Files**: `opentelemetry-http.interceptor.ts:146-194`

### 3. Memory Leak Prevention (NEW)
- **Feature**: Automatic span timeout management
- **Defaults**: HTTP: 30s, UI: 10s, Manual: 60s
- **Files**: `span-timeout-manager.service.ts`

### 4. Rate Limiting Memory Safety (FIXED)
- **Problem**: Unbounded Map growth in logs service
- **Solution**: Sliding window with LRU eviction and cleanup
- **Files**: `logs.service.ts`

### 5. Service Worker Support (NEW)
- **Feature**: Complete trace context for offline operations
- **Includes**: Background sync, push notifications, cache operations
- **Files**: `service-worker-trace-bridge.service.ts`, related services

## Configuration

### Simplified Modular Approach (UPDATED)

The library now uses a **SINGLE APPROACH** for maximum simplicity: **Modular Exporters Only**.

#### Basic Usage Pattern
```typescript
// Import exporter modules
imports: [
  OtelColExporterModule,           // Traces
  LogsOtelcolExporterModule,       // Logs
  LogsConsoleExporterModule,       // Logs (console)
  MetricsOtelcolExporterModule,    // Metrics
  MetricsConsoleExporterModule,    // Metrics (console)
  CompositePropagatorModule,       // Propagation
  
  // Configure behavior (not exporters)
  OpenTelemetryInterceptorModule.forRoot({
    commonConfig: { serviceName: 'my-app' },
    logsConfig: { enabled: true },
    metricsConfig: { enabled: true }
    // No exporter configurations needed!
  })
]
```

### Enhanced OpenTelemetry Configuration

```typescript
interface OpenTelemetryConfig {
  // Standard configuration
  commonConfig: CommonCollectorConfig;
  batchSpanProcessorConfig?: BatchSpanProcessorConfig;
  otelcolConfig?: OtelCollectorConfig;
  
  // NEW: Enhanced configurations
  spanTimeout?: {
    httpTimeoutMs?: number;        // Default: 30000
    uiTimeoutMs?: number;          // Default: 10000
    manualTimeoutMs?: number;      // Default: 60000
    enabled?: boolean;
    memoryMonitoring?: boolean;
  };
  
  logsConfig?: {
    enabled?: boolean;
    level?: 'debug' | 'info' | 'warn' | 'error';
    console?: boolean;
    consoleBridge?: boolean;
    rateLimit?: {
      maxPerMinute?: number;
      cleanupIntervalMs?: number;    // Default: 300000
      memoryThresholdMB?: number;    // Default: 100
      slidingWindowMs?: number;      // Default: 60000
    };
  };
  
  metricsConfig?: {
    enabled?: boolean;
    webVitals?: {
      enabled?: boolean;
      reportAllChanges?: boolean;
      includeAttribution?: boolean;
    };
  };
  
  serviceWorkerConfig?: {
    enabled?: boolean;
    traceContext?: {
      enabled?: boolean;
      corsHeaders?: string[];
      backgroundSync?: BackgroundSyncConfig;
      pushNotifications?: PushConfig;
    };
    offlineStorage?: OfflineStorageConfig;
  };
}
```

## Critical Implementation Details

### Global Tracer Registration
```typescript
// CRITICAL: Must register tracer globally for logs correlation
// Location: opentelemetry-http.interceptor.ts:121
api.trace.setGlobalTracerProvider(this.tracer);
```

### Persistent Span Storage (NEW FIX)
```typescript
// Store spans globally for cross-async access
// Location: opentelemetry-http.interceptor.ts:167-193
const globalContext = (globalThis as any);
globalContext.__otelActiveSpans.set(requestId, {
  span, spanContext, timestamp: Date.now()
});
```

### Multi-Fallback Trace Context Retrieval (NEW)
```typescript
// Enhanced logs service with multiple fallback mechanisms
// Location: logs.service.ts:94-149
// 1. Standard OTEL trace.getActiveSpan()
// 2. Global storage from HTTP interceptor  
// 3. Window storage for immediate access
// 4. Angular Zone preservation
// 5. OTEL context chain traversal
```

### Context Isolation Pattern
```typescript
// Prevents race conditions in concurrent requests
// Location: opentelemetry-http.interceptor.ts:195-261
const isolatedContext = api.context.active();
return api.context.with(isolatedContext, () => {
  // Request processing with isolated context
});
```

### Manual Trace Context for UI
```typescript
// Enable trace correlation for UI interactions
this.traceContext.withTraceContext('button-click', () => {
  // Operations here have trace context
}, { 'ui.component': 'form' });
```

## Testing & Verification

### Test Trace Correlation Strategy

#### HTTP-Related Logs (Automatic Correlation)
```typescript
// In logs-demo.component.ts - Click "HTTP Request + Logs"
testTraceCorrelation() {
  this.http.get('...').subscribe(() => {
    this.otelLogs.info('INSIDE HTTP REQUEST'); // ← Should have trace_id/span_id
  });
}
```

#### UI-Only Logs (Manual Correlation) 
```typescript
// In logs-demo.component.ts - Click "Test Phase 2 (Enhanced)"
testPhase2Enhancement() {
  this.traceContext.withTraceContext('ui-interaction', () => {
    this.otelLogs.info('UI INTERACTION'); // ← Has trace_id from manual span
  });
}
```

### Expected Console Output
```
[HTTP-INTERCEPTOR] Stored span context globally: {requestId: "...", traceId: "...", spanId: "..."}
[LOGS-SERVICE] Found span from global storage: true
[OTEL-LOG:INFO] Log message with trace correlation
```

### Monitor Memory & Performance
```typescript
// Get statistics
const spanStats = this.spanTimeoutManager.getStats();
const rateLimitStats = this.logsService.getRateLimitStats();
const swStats = this.swBridge.getStatistics();
```

## Important Notes

### SSR Safety
- All telemetry operations check `isPlatformBrowser(PLATFORM_ID)`
- Services no-op on server-side rendering
- Platform detection prevents Node.js errors

### Performance Considerations
- Span timeout prevents memory leaks
- Rate limiting uses sliding windows for efficiency
- LRU eviction maintains memory bounds
- Cleanup intervals configurable for optimization

### Error Handling
- Graceful fallbacks for all enhancements
- Context isolation failures fall back to legacy behavior
- Comprehensive error logging without breaking functionality

## Common Issues & Solutions

### Issue: Trace IDs undefined for HTTP-related logs
**Root Cause**: Angular async boundaries lose OpenTelemetry context
**Solution**: Global span storage + multi-fallback retrieval system implemented
**Status**: ✅ FIXED - HTTP request logs now show trace correlation

### Issue: Trace IDs undefined for UI-only logs  
**Root Cause**: No active HTTP span context for pure UI interactions
**Solution**: Use TraceContextService for manual trace creation
**Example**: `this.traceContext.withTraceContext('action', () => { this.logs.info('...') })`
**Status**: ✅ WORKING - Phase 2 manual trace context

### Issue: Memory growing over time
**Solution**: Enable span timeout management and configure cleanup intervals
**Status**: ✅ FIXED - Automatic cleanup implemented

### Issue: Race conditions in concurrent requests
**Solution**: Verify using latest version with context isolation implementation
**Status**: ✅ FIXED - Per-request context isolation

### Issue: Service worker not correlating traces
**Solution**: Enable serviceWorkerConfig and ensure SW is registered with helper
**Status**: ✅ IMPLEMENTED - Service worker integration available

## Documentation

### Essential Guides
- [PRODUCTION-ENHANCEMENTS.md](./PRODUCTION-ENHANCEMENTS.md) - All production fixes and features
- [TRACE-CORRELATION-GUIDE.md](./TRACE-CORRELATION-GUIDE.md) - Complete trace correlation implementation
- [SERVICE-WORKER-INTEGRATION.md](./SERVICE-WORKER-INTEGRATION.md) - Offline and SW trace support

## Best Practices

1. **Always run lint/typecheck before committing**
2. **Use appropriate trace context creation method** (automatic for HTTP, manual for UI)
3. **Configure timeouts based on your application needs**
4. **Monitor memory statistics in production**
5. **Enable service worker support for PWAs**
6. **Use sliding window rate limiting for high-traffic apps**

## Migration from Original Jufab Library

This enhanced version is **fully backward compatible**. To use new features:

1. Update configuration with new options (all optional with defaults)
2. Import new services as needed (TraceContextService, etc.)
3. Enable features progressively (span timeout, SW support, etc.)

No breaking changes - all enhancements are opt-in with sensible defaults.