# Enhanced OpenTelemetry Angular Interceptor - Complete Guide

[![Apache License](http://img.shields.io/badge/license-APACHE2-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0.html)

> **Complete Observability Solution**: This enhanced version of [@jufab/opentelemetry-angular-interceptor](https://github.com/jufab/opentelemetry-angular-interceptor) provides full **Traces**, **Logs**, and **Metrics** support with multiple exporters capability for Angular applications.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Quick Start](#quick-start)
4. [Configuration Patterns](#configuration-patterns)
5. [Exporters](#exporters)
6. [Advanced Features](#advanced-features)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Best Practices](#best-practices)
10. [Migration Guide](#migration-guide)
11. [Troubleshooting](#troubleshooting)

## Overview

### What is Enhanced OpenTelemetry Angular Interceptor?

The Enhanced OpenTelemetry Angular Interceptor is a comprehensive observability solution for Angular applications that provides:

- **Complete Observability**: Traces, Logs, and Metrics in one package
- **Multiple Exporters**: Send telemetry to multiple backends simultaneously
- **Zero Migration**: 100% backwards compatible with existing Jufab configurations
- **Production Ready**: Built-in retry logic, rate limiting, PII redaction, and error handling
- **SSR Compatible**: Works seamlessly with Angular Universal server-side rendering

### Architecture Overview

```
Angular Application
│
├── HTTP Interceptor (Traces) ──┐
├── Logs Service ───────────────┼── Composite Exporters ──┐
└── Metrics Service ────────────┘                         │
                                                          ├── OTLP Collector
                                                          ├── Console Output
                                                          ├── Custom Backend 1
                                                          └── Custom Backend N
```

## Features

### Core Observability Signals

| Signal | Capability | Status |
|--------|------------|--------|
| **Traces** | HTTP requests, custom spans, distributed tracing | ✅ Ready |
| **Logs** | Structured logging with trace correlation | ✅ Ready |
| **Metrics** | Web Vitals, custom counters/histograms | ✅ Ready |

### Enhanced Capabilities

- **Multiple Exporters**: Send data to multiple backends (parallel/fallback strategies)
- **Modular Architecture**: Mix and match exporters as needed
- **Auto Trace Correlation**: Logs automatically include trace_id and span_id
- **Global Error Handling**: Captures Angular, Promise, and JavaScript errors
- **Web Vitals v4**: Core Web Vitals with attribution (LCP, CLS, INP, FCP, TTFB)
- **Rate Limiting**: Prevent log flooding in production
- **PII Redaction**: Configurable patterns for sensitive data removal
- **Retry & Jitter**: Resilient exporters with multiple retry strategies
- **SSR Safe**: No-ops on server-side rendering

### Exporter Support

**Traces (Original Jufab + Enhanced):**
- OTLP (OpenTelemetry Protocol)
- Zipkin
- Console output
- No-op (testing)
- **NEW**: Multiple exporters simultaneously

**Logs (Enhanced Feature):**
- OTLP HTTP/gRPC
- Console output
- No-op (testing)
- **NEW**: Multiple exporters with strategies

**Metrics (Enhanced Feature):**
- OTLP HTTP/gRPC
- Console output
- Prometheus (configuration placeholder)
- No-op (testing)
- **NEW**: Multiple exporters with independent intervals

## Quick Start

### Installation

```bash
npm install @jufab/opentelemetry-angular-interceptor
```

### Basic Setup (Zero Migration)

Existing Jufab users can add logs and metrics with zero code changes:

```typescript
import { OpenTelemetryInterceptorModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      // Existing Jufab configuration (unchanged)
      commonConfig: {
        serviceName: 'my-app',
        console: true,
        production: false
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      
      // NEW: Add logs (optional)
      logsConfig: {
        enabled: true,
        level: 'info',
        console: true
      },
      logsExporters: {
        otlp: { enabled: true }
      },
      
      // NEW: Add metrics (optional)  
      metricsConfig: {
        enabled: true,
        webVitals: true
      },
      metricsExporters: {
        otlp: { enabled: true }
      }
    })
  ]
})
export class AppModule { }
```

### Service Usage

```typescript
import { 
  OpenTelemetryLogsService, 
  OpenTelemetryMetricsService 
} from '@jufab/opentelemetry-angular-interceptor';

@Component({...})
export class MyComponent {
  constructor(
    private otelLogs: OpenTelemetryLogsService,
    private otelMetrics: OpenTelemetryMetricsService
  ) {}
  
  onUserAction() {
    // Logs with automatic trace correlation
    this.otelLogs.info('User action completed', {
      userId: 'user123',
      action: 'checkout'
    });
    
    // Custom metrics
    this.otelMetrics.recordCustomCounter('user.actions', 1, {
      'action.type': 'checkout'
    });
  }
}
```

## Configuration Patterns

### Pattern 1: Configuration-Based (Traditional)

Single configuration object with all exporters defined:

```typescript
OpenTelemetryInterceptorModule.forRoot({
  commonConfig: { serviceName: 'my-app' },
  otelcolConfig: { url: 'http://localhost:4318/v1/traces' },
  
  // Traditional single exporters per type
  logsExporters: {
    otlp: { enabled: true },
    console: { enabled: true }
  },
  metricsExporters: {
    otlp: { enabled: true }
  }
})
```

### Pattern 2: Modular Exporters

Separate modules for fine-grained control:

```typescript
import { 
  OpenTelemetryInterceptorModule,
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  MetricsOtelcolExporterModule
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    // Base configuration
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: { serviceName: 'my-app' },
      otelcolConfig: { url: 'http://localhost:4318/v1/traces' },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
    }),
    
    // Modular exporters
    LogsOtelcolExporterModule.forRoot(),
    LogsConsoleExporterModule.forRoot(),
    MetricsOtelcolExporterModule.forRoot()
  ]
})
export class AppModule { }
```

### Pattern 3: Multiple Exporters

Send telemetry to multiple backends simultaneously:

```typescript
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(baseConfig),
    
    // Multiple logs exporters (automatically combined)
    LogsOtelcolExporterModule.forRoot(),
    LogsConsoleExporterModule.forRoot(),
    
    // Multiple metrics exporters (automatically combined)
    MetricsOtelcolExporterModule.forRoot(),
    MetricsConsoleExporterModule.forRoot()
  ]
})
export class AppModule { }
```

### Pattern 4: Advanced Multi-Exporters

Configuration-based multiple exporters with strategies:

```typescript
multiLogsExporters: {
  strategy: 'parallel', // or 'fallback'
  exporters: {
    'primary': {
      type: 'otlp',
      priority: 1,
      otlp: { 
        url: 'http://primary.com/v1/logs',
        retry: { enabled: true, maxAttempts: 5 }
      }
    },
    'backup': {
      type: 'otlp',
      priority: 2,
      fallbackOnly: false,
      otlp: { url: 'http://backup.com/v1/logs' }
    },
    'debug': {
      type: 'console',
      priority: 3
    }
  }
}
```

## Exporters

### Available Exporter Modules

#### Traces (Original Jufab)
- `OtelColExporterModule` - OTLP traces exporter
- `ConsoleSpanExporterModule` - Console traces output
- `ZipkinExporterModule` - Zipkin traces exporter
- `NoopSpanExporterModule` - No-op traces (testing)

#### Logs (Enhanced)
- `LogsOtelcolExporterModule` - OTLP logs exporter
- `LogsConsoleExporterModule` - Console logs output
- `LogsNoopExporterModule` - No-op logs (testing)

#### Metrics (Enhanced)
- `MetricsOtelcolExporterModule` - OTLP metrics exporter
- `MetricsConsoleExporterModule` - Console metrics output
- `MetricsNoopExporterModule` - No-op metrics (testing)

### Multiple Exporters Strategies

#### Parallel Strategy (Default)
- All exporters receive all telemetry data
- Success if at least one exporter succeeds
- Higher resource usage but better reliability
- Best for: Redundancy, migration scenarios

```typescript
multiLogsExporters: {
  strategy: 'parallel',
  exporters: {
    'collector': { type: 'otlp', enabled: true },
    'console': { type: 'console', enabled: true }
  }
}
```

#### Fallback Strategy
- Try exporters in priority order
- Stop on first successful export
- Lower resource usage but less redundancy
- Best for: High availability, cost optimization

```typescript
multiLogsExporters: {
  strategy: 'fallback',
  exporters: {
    'primary': { type: 'otlp', priority: 1, enabled: true },
    'secondary': { type: 'otlp', priority: 2, enabled: true },
    'emergency': { type: 'console', priority: 3, enabled: true }
  }
}
```

## Advanced Features

### Automatic Trace Correlation

All logs automatically include trace information:

```json
{
  "timestamp": 1691234567890000000,
  "severityText": "INFO",
  "body": "User checkout completed",
  "attributes": {
    "trace.trace_id": "5b8aa5a2d2c872e8321cf37308d69df2",
    "trace.span_id": "051581bf3cb55c13",
    "userId": "user123"
  }
}
```

### Global Error Handling

Automatically captures and correlates:
- Angular component errors (via ErrorHandler)
- Unhandled promise rejections
- Global JavaScript errors
- Marks spans as error with exception events

### Web Vitals Integration

Collects Core Web Vitals with attribution:
- **LCP** (Largest Contentful Paint)
- **CLS** (Cumulative Layout Shift)
- **INP** (Interaction to Next Paint)  
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

### Rate Limiting

Prevent log flooding in production:

```typescript
logsConfig: {
  rateLimit: {
    maxPerMinute: 100,
    perSeverity: {
      error: 50,
      warn: 30,
      info: 20,
      debug: 10
    }
  }
}
```

### PII Redaction

Configurable patterns for sensitive data:

```typescript
logsConfig: {
  redact: {
    enabled: true,
    patterns: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g // credit cards
    ]
  }
}
```

### Retry & Jitter Strategies

Resilient exporters with multiple retry patterns:

```typescript
retry: {
  enabled: true,
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitterType: 'decorrelated' // 'full', 'equal', 'decorrelated'
}
```

## API Reference

### Configuration Interfaces

#### OpenTelemetryConfig (Enhanced)

```typescript
interface OpenTelemetryConfig {
  // Original Jufab configuration (unchanged)
  commonConfig: CommonCollectorConfig;
  batchSpanProcessorConfig?: BatchSpanProcessorConfig;
  otelcolConfig?: OtelCollectorConfig;
  zipkinConfig?: ZipkinCollectorConfig;
  
  // Enhanced features
  logsConfig?: LogsConfig;
  logsExporters?: LogsExporters;
  multiLogsExporters?: MultiLogsExporters;
  
  metricsConfig?: MetricsConfig;
  metricsExporters?: MetricsExporters;
  multiMetricsExporters?: MultiMetricsExporters;
}
```

#### LogsConfig

```typescript
interface LogsConfig {
  enabled?: boolean;
  level?: 'debug' | 'info' | 'warn' | 'error';
  console?: boolean;
  consoleBridge?: boolean;
  rateLimit?: {
    maxPerMinute?: number;
    perSeverity?: Record<string, number>;
  };
  redact?: {
    enabled?: boolean;
    patterns?: RegExp[];
  };
}
```

#### MetricsConfig

```typescript
interface MetricsConfig {
  enabled?: boolean;
  webVitals?: boolean;
  collectFCP?: boolean;
  collectTTFB?: boolean;
  interval?: number;
  console?: boolean;
  histogramBoundariesMs?: number[];
  urlHygiene?: {
    stripQuery?: boolean;
    stripFragment?: boolean;
  };
}
```

### Services

#### OpenTelemetryLogsService

```typescript
class OpenTelemetryLogsService {
  debug(message: string, attributes?: Record<string, any>): void;
  info(message: string, attributes?: Record<string, any>): void;
  warn(message: string, attributes?: Record<string, any>): void;
  error(message: string, attributes?: Record<string, any>): void;
  logError(error: Error, attributes?: Record<string, any>): void;
}
```

#### OpenTelemetryMetricsService

```typescript
class OpenTelemetryMetricsService {
  recordPageLoad(loadTime: number, url?: string): void;
  recordNavigation(url: string): void;
  recordError(errorType: string, message?: string): void;
  recordInteraction(interactionType: string, target?: string): void;
  recordCustomCounter(name: string, value?: number, attributes?: Record<string, string>): void;
  recordCustomHistogram(name: string, value: number, attributes?: Record<string, string>): void;
}
```

## Examples

### Development Setup

Console + OTLP for debugging:

```typescript
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(baseConfig),
    LogsOtelcolExporterModule.forRoot(),
    LogsConsoleExporterModule.forRoot(),
    MetricsOtelcolExporterModule.forRoot(),
    MetricsConsoleExporterModule.forRoot()
  ]
})
export class DevAppModule { }
```

### Production Setup

OTLP with fallback:

```typescript
multiLogsExporters: {
  strategy: 'fallback',
  exporters: {
    'primary': {
      type: 'otlp',
      priority: 1,
      otlp: {
        url: 'https://primary-collector.com/v1/logs',
        retry: { enabled: true, maxAttempts: 5 }
      }
    },
    'backup': {
      type: 'otlp',
      priority: 2,
      otlp: { url: 'https://backup-collector.com/v1/logs' }
    }
  }
}
```

### Migration Setup

Old and new collectors in parallel:

```typescript
multiLogsExporters: {
  strategy: 'parallel',
  exporters: {
    'legacy': {
      type: 'otlp',
      otlp: { url: 'http://old-collector.com/v1/logs' }
    },
    'new': {
      type: 'otlp', 
      otlp: { url: 'http://new-collector.com/v1/logs' }
    }
  }
}
```

### Environment-Based Setup

```typescript
const getExporterModules = () => {
  if (environment.production) {
    return [LogsOtelcolExporterModule.forRoot()];
  } else if (environment.development) {
    return [
      LogsOtelcolExporterModule.forRoot(),
      LogsConsoleExporterModule.forRoot()
    ];
  } else {
    return [LogsNoopExporterModule.forRoot()];
  }
};
```

## Best Practices

### Performance Optimization

1. **Use Local Collectors**: Route through local OTEL collector instead of multiple remote endpoints
2. **Adjust Batch Sizes**: Larger batches for multiple exporters
3. **Configure Timeouts**: Shorter timeouts to prevent blocking
4. **Choose Strategy Wisely**: Parallel for reliability, fallback for performance

### Production Configuration

```typescript
// Production-optimized configuration
{
  commonConfig: {
    production: true,
    probabilitySampler: '0.1' // Sample 10% of traces
  },
  logsConfig: {
    level: 'warn', // Only warnings and errors
    console: false,
    rateLimit: { maxPerMinute: 1000 }
  },
  metricsConfig: {
    interval: 30000, // Less frequent metrics
    console: false
  }
}
```

### Security

1. **PII Redaction**: Always enable in production
2. **Rate Limiting**: Prevent DoS through excessive logging
3. **SSL/TLS**: Use HTTPS endpoints in production
4. **Authentication**: Secure collector endpoints

### Monitoring

1. **Exporter Health**: Monitor for export failures
2. **Resource Usage**: Watch CPU/memory with multiple exporters
3. **Network Traffic**: Monitor bandwidth usage
4. **Error Rates**: Track telemetry export success rates

## Migration Guide

### From Standard Jufab

**Before (Jufab only):**
```typescript
OpenTelemetryInterceptorModule.forRoot({
  commonConfig: { serviceName: 'my-app' },
  otelcolConfig: { url: 'http://localhost:4318/v1/traces' }
})
```

**After (Enhanced with logs & metrics):**
```typescript
OpenTelemetryInterceptorModule.forRoot({
  // Keep existing configuration unchanged
  commonConfig: { serviceName: 'my-app' },
  otelcolConfig: { url: 'http://localhost:4318/v1/traces' },
  
  // Add new features
  logsConfig: { enabled: true },
  logsExporters: { otlp: { enabled: true } },
  metricsConfig: { enabled: true, webVitals: true },
  metricsExporters: { otlp: { enabled: true } }
})
```

### To Multiple Exporters

**From Single to Multiple (Modular):**
```typescript
// Add additional exporter modules
LogsConsoleExporterModule.forRoot(), // Adds to existing OTLP
MetricsConsoleExporterModule.forRoot() // Adds to existing OTLP
```

**From Single to Multiple (Configuration):**
```typescript
// Replace single exporter config with multi-exporter config
multiLogsExporters: {
  strategy: 'parallel',
  exporters: {
    'otlp': { type: 'otlp', enabled: true },
    'console': { type: 'console', enabled: true }
  }
}
```

## Troubleshooting

### Common Issues

#### No Telemetry Data

1. Check that services are enabled:
```typescript
logsConfig: { enabled: true },
metricsConfig: { enabled: true }
```

2. Verify exporter configuration:
```typescript
logsExporters: { otlp: { enabled: true } }
```

3. Check browser console for errors

#### Multiple Exporters Not Working

1. Ensure exporter modules use multi-provider:
```typescript
// Correct
LogsOtelcolExporterModule.forRoot()
LogsConsoleExporterModule.forRoot()
```

2. Check console for exporter count:
```
Found 2 exporters via multi-provider injection
OpenTelemetry Logs Provider initialized with 2 exporter(s)
```

#### Performance Issues

1. **High CPU/Memory**: Consider fallback strategy instead of parallel
2. **Network Saturation**: Use local collector as proxy
3. **Slow Responses**: Reduce batch sizes and timeouts

#### SSR Issues

The library is SSR-safe and will no-op on server-side. If you encounter issues:

1. Check platform detection:
```typescript
// Should see this in server logs
console.log('OpenTelemetry disabled on server-side');
```

2. Ensure no browser-only APIs in custom exporters

### Debug Information

Enable debug logging:

```typescript
logsConfig: {
  console: true,
  level: 'debug'
}
```

Look for initialization messages:
```
OpenTelemetry Logs Provider initialized with 2 exporter(s)
OTLP Logs exporter added: http://localhost:4318/v1/logs  
Console Logs exporter added
Web Vitals collection initialized
```

### Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/jufab/opentelemetry-angular-interceptor/issues)
- **Original Jufab Docs**: [Base tracing functionality](https://github.com/jufab/opentelemetry-angular-interceptor)
- **OpenTelemetry Docs**: [Specification and best practices](https://opentelemetry.io/docs/)

---

## License

Apache-2.0 (same as original Jufab library)

## Acknowledgments

- **[Julien Fabre (@jufab)](https://github.com/jufab)** - Original OpenTelemetry Angular Interceptor
- **[OpenTelemetry Community](https://opentelemetry.io/)** - Observability standards and SDKs
- **[Angular Team](https://angular.io/)** - Framework and developer tools

---

This Enhanced OpenTelemetry Angular Interceptor transforms your Angular application into a fully observable system with comprehensive traces, logs, and metrics - all with the flexibility of multiple exporters and zero migration requirements.