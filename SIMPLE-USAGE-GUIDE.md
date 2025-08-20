# OpenTelemetry Angular - Simple Usage Guide

## Overview

This enhanced OpenTelemetry Angular library uses a **SINGLE APPROACH** for maximum simplicity: **Modular Exporters**.

## ✅ How to Use (Simple & Clean)

### Step 1: Import Exporter Modules

```typescript
import { NgModule } from '@angular/core';
import { 
  OpenTelemetryInterceptorModule,
  // Trace exporters
  OtelColExporterModule,
  ConsoleSpanExporterModule,      // Optional: for console traces
  
  // Logs exporters
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,      // Optional: for console logs
  
  // Metrics exporters
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule,   // Optional: for console metrics
  
  // Propagator
  CompositePropagatorModule
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    
    // STEP 1: Import exporter modules FIRST
    OtelColExporterModule,           // Traces to OTLP
    LogsOtelcolExporterModule,       // Logs to OTLP  
    LogsConsoleExporterModule,       // Logs to console (dev)
    MetricsOtelcolExporterModule,    // Metrics to OTLP
    MetricsConsoleExporterModule,    // Metrics to console (dev)
    CompositePropagatorModule,       // Trace propagation
    
    // STEP 2: Configure the interceptor
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'my-angular-app',
        probabilitySampler: '1'
      },
      
      // Configure logs behavior
      logsConfig: {
        enabled: true,
        level: 'info'
      },
      
      // Configure metrics behavior  
      metricsConfig: {
        enabled: true,
        webVitals: true
      }
      
      // No need for logsExporters or metricsExporters!
    })
  ]
})
export class AppModule { }
```

## That's It! 🎉

With this setup you get:
- ✅ HTTP requests traced to OTLP 
- ✅ Logs sent to both OTLP and console
- ✅ Metrics sent to both OTLP and console
- ✅ Multiple exporters working simultaneously
- ✅ Clean, simple configuration

---

## Available Exporter Modules

### Trace Exporters
- `OtelColExporterModule` - OTLP trace exporter (required)
- `ConsoleSpanExporterModule` - Console trace exporter (optional)
- `ZipkinExporterModule` - Zipkin trace exporter (optional)
- `NoopSpanExporterModule` - No-op trace exporter (optional)

### Logs Exporters
- `LogsOtelcolExporterModule` - OTLP logs exporter
- `LogsConsoleExporterModule` - Console logs exporter
- `LogsNoopExporterModule` - No-op logs exporter

### Metrics Exporters
- `MetricsOtelcolExporterModule` - OTLP metrics exporter
- `MetricsConsoleExporterModule` - Console metrics exporter
- `MetricsNoopExporterModule` - No-op metrics exporter

### Propagators
- `CompositePropagatorModule` - Multi-format propagator (recommended)
- `B3PropagatorModule` - B3 propagator
- `W3CTraceContextPropagatorModule` - W3C propagator
- Others...

---

## Multiple Exporters Example

Want logs in both OTLP and console? Just import both modules!

```typescript
imports: [
  LogsOtelcolExporterModule,    // Logs to OTLP
  LogsConsoleExporterModule,    // Logs to console
  // Both are active simultaneously!
]
```

Want three different metrics exporters? No problem!

```typescript
imports: [
  MetricsOtelcolExporterModule,    // Metrics to OTLP
  MetricsConsoleExporterModule,    // Metrics to console
  MetricsCustomExporterModule,     // Metrics to custom endpoint
  // All three are active!
]
```

---

## Environment-Based Configuration

### Development Environment
```typescript
imports: [
  OtelColExporterModule,
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,      // Extra console logging for dev
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule,   // Extra console metrics for dev
  // ...
]
```

### Production Environment
```typescript
imports: [
  OtelColExporterModule,
  LogsOtelcolExporterModule,      // Only OTLP in production
  MetricsOtelcolExporterModule,   // Only OTLP in production
  // No console exporters in production
]
```

---

## Configuration Options

### Common Config
```typescript
commonConfig: {
  console: true,
  production: false,
  serviceName: 'my-app',
  probabilitySampler: '1',          // Sample all traces
  resourceAttributes: {
    'service.namespace': 'demo',
    'deployment.environment': 'dev'
  }
}
```

### Logs Config
```typescript
logsConfig: {
  enabled: true,
  level: 'info',                   // debug, info, warn, error
  console: true,
  consoleBridge: false,            // Don't bridge console.log calls
  
  rateLimit: {
    maxPerMinute: 100,
    cleanupIntervalMs: 300000
  },
  
  redact: {
    enabled: true,
    patterns: [/email@domain\.com/g]
  }
}
```

### Metrics Config
```typescript
metricsConfig: {
  enabled: true,
  webVitals: true,                 // Collect web vitals
  collectFCP: true,
  collectTTFB: true,
  interval: 15000,                 // Collection interval
  console: false,                  // Set to true for debug
  
  urlHygiene: {
    stripQuery: true,              // Remove query params from URLs
    stripFragment: true
  }
}
```

---

## OTLP Configuration

The OTLP exporters automatically use your main OTEL collector configuration:

```typescript
otelcolConfig: {
  url: 'http://localhost:4318/v1/traces'
  // Logs will use: http://localhost:4318/v1/logs
  // Metrics will use: http://localhost:4318/v1/metrics
}
```

URLs are automatically derived:
- Traces: `/v1/traces`
- Logs: `/v1/logs` 
- Metrics: `/v1/metrics`

---

## Common Patterns

### Minimal Setup (OTLP Only)
```typescript
imports: [
  OtelColExporterModule,
  LogsOtelcolExporterModule,
  MetricsOtelcolExporterModule,
  CompositePropagatorModule,
  OpenTelemetryInterceptorModule.forRoot({ ... })
]
```

### Development Setup (OTLP + Console)
```typescript
imports: [
  OtelColExporterModule,
  ConsoleSpanExporterModule,
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule,
  CompositePropagatorModule,
  OpenTelemetryInterceptorModule.forRoot({ ... })
]
```

### Testing Setup (Console Only)
```typescript
imports: [
  ConsoleSpanExporterModule,
  LogsConsoleExporterModule,
  MetricsConsoleExporterModule,
  CompositePropagatorModule,
  OpenTelemetryInterceptorModule.forRoot({ ... })
]
```

---

## What You Get Out of the Box

### Automatic Trace Correlation
- HTTP requests create traces
- Logs within HTTP requests automatically get trace_id/span_id
- No additional code needed

### Multiple Exporters
- All imported exporter modules work simultaneously
- No conflicts or configuration issues

### Clean Console Output
```
OpenTelemetry: Found 2 modular exporter(s)
Added logs exporter 1/2
Added logs exporter 2/2
[OTEL-LOG:INFO] User clicked button
```

### Production Ready
- Memory management built-in
- Rate limiting for logs
- Automatic cleanup
- Performance optimized

---

## Migration from Old Configuration

### Before (Complex)
```typescript
OpenTelemetryInterceptorModule.forRoot({
  // Lots of complex exporter configuration
  logsExporters: {
    otlp: { url: '...', retry: { ... } },
    console: { enabled: true }
  },
  metricsExporters: {
    otlp: { url: '...', intervalMs: 15000 },
    console: { enabled: true }
  }
})
```

### After (Simple)
```typescript
imports: [
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  MetricsOtelcolExporterModule,  
  MetricsConsoleExporterModule,
  OpenTelemetryInterceptorModule.forRoot({
    // Simple configuration, no exporter configs needed!
    logsConfig: { enabled: true },
    metricsConfig: { enabled: true }
  })
]
```

---

## Benefits of This Approach

1. **Simple**: Just import modules, no complex configuration
2. **Clear**: Easy to see which exporters are active
3. **Flexible**: Add/remove exporters by importing/removing modules
4. **Multiple**: All imported exporters work simultaneously
5. **No Conflicts**: No circular dependencies or configuration conflicts
6. **Type Safe**: Full TypeScript support
7. **Testable**: Easy to mock exporters for testing

---

This approach eliminates the confusion of multiple configuration patterns and provides a single, clean way to configure OpenTelemetry in Angular applications.