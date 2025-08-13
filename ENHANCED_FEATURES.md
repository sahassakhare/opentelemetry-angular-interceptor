# Enhanced OpenTelemetry Angular Interceptor

This is an enhanced version of [@jufab/opentelemetry-angular-interceptor](https://github.com/jufab/opentelemetry-angular-interceptor) that adds comprehensive **Logs** and **Metrics** support alongside the existing tracing capabilities.

## New Features

### OpenTelemetry Logs
- Full OTEL Logs SDK integration with automatic trace correlation
- Global error handler for Angular, Promise rejections, and JavaScript errors
- Console bridge to capture `console.log/warn/error` calls
- Rate limiting and PII redaction capabilities
- SSR-safe implementation

### OpenTelemetry Metrics
- Web Vitals v4 integration (LCP, CLS, INP, FCP, TTFB)
- SPA-aware metrics that reinitialize on route navigation
- Custom metrics support (counters, histograms, gauges)
- Browser interaction and navigation tracking
- SSR-safe implementation

### Retry & Jitter
- Configurable retry logic with exponential backoff
- Multiple jitter strategies (full, equal, decorrelated)
- Applies to all exporters (traces, logs, metrics)

### Modular Exporters
- Separate exporter modules following original Jufab span exporter pattern
- Fine-grained control over individual exporters
- Support for multiple exporters simultaneously
- Environment-based and feature-flag driven configurations
- Better tree-shaking and testability

## Usage Patterns

### Pattern 1: Configuration-Based (Zero-Migration)

The enhanced module maintains 100% backwards compatibility with existing Jufab configurations:

```typescript
import { OpenTelemetryInterceptorModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      // Existing Jufab configuration (unchanged)
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'my-app',
        resourceAttributes: {
          'service.namespace': 'production'
        }
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      
      // NEW: Optional logs configuration
      logsConfig: {
        enabled: true,
        level: 'info',
        console: true,
        consoleBridge: true,
        rateLimit: {
          maxPerMinute: 100,
          perSeverity: {
            error: 50,
            warn: 30,
            info: 20
          }
        },
        redact: {
          enabled: true,
          patterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
            /\b\d{3}-\d{2}-\d{4}\b/g // SSN
          ]
        }
      },
      
      // NEW: Optional logs exporters
      logsExporters: {
        otlp: {
          enabled: true,
          // URL auto-inherits from otelcolConfig if not specified
          retry: {
            enabled: true,
            maxAttempts: 3,
            initialDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitterType: 'full'
          }
        },
        console: {
          enabled: true
        }
      },
      
      // NEW: Optional metrics configuration
      metricsConfig: {
        enabled: true,
        webVitals: true,
        collectFCP: true,
        collectTTFB: true,
        interval: 15000,
        console: true,
        histogramBoundariesMs: [100, 300, 1000, 3000, 5000],
        urlHygiene: {
          stripQuery: true,
          stripFragment: true
        }
      },
      
      // NEW: Optional metrics exporters
      metricsExporters: {
        otlp: {
          enabled: true,
          // URL auto-inherits from otelcolConfig if not specified
          intervalMs: 15000,
          retry: {
            enabled: true,
            maxAttempts: 3
          }
        },
        console: {
          enabled: true,
          intervalMs: 30000
        }
      }
    })
  ]
})
export class AppModule { }
```

### Pattern 2: Modular Exporters

Use separate exporter modules for fine-grained control:

```typescript
import { 
  OpenTelemetryInterceptorModule,
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    // Base interceptor configuration
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'my-app',
        console: true
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      // Enable features but configure exporters via modules
      logsConfig: { 
        enabled: true,
        level: 'info',
        consoleBridge: true 
      },
      metricsConfig: { 
        enabled: true,
        webVitals: true 
      }
    }),
    
    // Modular logs exporters
    LogsOtelcolExporterModule.forRoot(),
    LogsConsoleExporterModule.forRoot(),
    
    // Modular metrics exporters
    MetricsOtelcolExporterModule.forRoot(),
    MetricsConsoleExporterModule.forRoot()
  ]
})
export class AppModule { }
```

See the [Modular Exporters Guide](./MODULAR_EXPORTERS_GUIDE.md) for advanced patterns including environment-based selection, feature flags, and custom exporters.

## Service Usage

### Logs Service

```typescript
import { OpenTelemetryLogsService } from '@jufab/opentelemetry-angular-interceptor';

export class MyComponent {
  constructor(private otelLogs: OpenTelemetryLogsService) {}
  
  doSomething() {
    // Log with automatic trace correlation
    this.otelLogs.info('User action completed', {
      userId: 'user123',
      action: 'checkout'
    });
    
    try {
      // ... some operation
    } catch (error) {
      this.otelLogs.logError(error as Error, {
        context: 'payment-processing'
      });
    }
  }
}
```

### Metrics Service

```typescript
import { OpenTelemetryMetricsService } from '@jufab/opentelemetry-angular-interceptor';

export class MyComponent {
  constructor(private otelMetrics: OpenTelemetryMetricsService) {}
  
  onUserClick() {
    // Record user interaction
    this.otelMetrics.recordInteraction('click', 'checkout-button');
    
    // Custom counter
    this.otelMetrics.recordCustomCounter('checkout.attempts', 1, {
      'payment.method': 'credit-card'
    });
    
    // Custom histogram
    this.otelMetrics.recordCustomHistogram('api.response.time', 245, {
      'api.endpoint': '/checkout'
    });
  }
}
```

## Configuration Options

### LogsConfig
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable logs |
| `level` | string | 'info' | Minimum log level (debug, info, warn, error) |
| `console` | boolean | false | Also output to browser console |
| `consoleBridge` | boolean | false | Capture console.* calls |
| `rateLimit` | object | null | Rate limiting configuration |
| `redact` | object | null | PII redaction configuration |

### MetricsConfig
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | true | Enable/disable metrics |
| `webVitals` | boolean | true | Collect Web Vitals metrics |
| `collectFCP` | boolean | false | Collect First Contentful Paint |
| `collectTTFB` | boolean | false | Collect Time to First Byte |
| `interval` | number | 15000 | Export interval in ms |
| `console` | boolean | false | Log metrics to console |
| `histogramBoundariesMs` | number[] | [100, 300, 1000, 3000, 5000] | Histogram boundaries |
| `urlHygiene` | object | {} | URL sanitization options |

### RetryConfig
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | false | Enable retry logic |
| `maxAttempts` | number | 3 | Maximum retry attempts |
| `initialDelay` | number | 1000 | Initial delay in ms |
| `maxDelay` | number | 30000 | Maximum delay in ms |
| `backoffMultiplier` | number | 2 | Exponential backoff multiplier |
| `jitterType` | string | 'full' | Jitter strategy (full, equal, decorrelated) |

## Features

### Automatic Trace Correlation
All logs automatically include `trace_id` and `span_id` from the active span context:

```json
{
  "timestamp": 1691234567890000000,
  "severityText": "INFO",
  "severityNumber": 9,
  "body": "User checkout completed",
  "attributes": {
    "trace.trace_id": "5b8aa5a2d2c872e8321cf37308d69df2",
    "trace.span_id": "051581bf3cb55c13",
    "userId": "user123",
    "amount": 99.99
  }
}
```

### Global Error Handling
Automatically captures and logs:
- Angular errors (via ErrorHandler)
- Unhandled promise rejections
- Global JavaScript errors
- Marks spans as error and adds exception events

### Web Vitals Integration
Automatically collects Core Web Vitals with attribution:
- **LCP** (Largest Contentful Paint)
- **CLS** (Cumulative Layout Shift)
- **INP** (Interaction to Next Paint)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

### SPA-Aware Metrics
Metrics automatically reinitialize on Angular route navigation for accurate SPA measurements.

### Privacy & Security
- PII redaction with configurable patterns
- URL sanitization (strip query params, fragments)
- Rate limiting to prevent log flooding
- SSR-safe (no-ops on server-side)

## Dependencies

The enhanced version adds these peer dependencies:
```json
{
  "@opentelemetry/api-logs": "0.56.0",
  "@opentelemetry/sdk-logs": "0.56.0",
  "@opentelemetry/exporter-logs-otlp-http": "0.56.0",
  "@opentelemetry/sdk-metrics": "1.29.0",
  "@opentelemetry/exporter-metrics-otlp-http": "0.56.0",
  "@opentelemetry/semantic-conventions": "1.29.0",
  "web-vitals": "4.2.4"
}
```

## Migration from Standard Jufab

**No migration needed!** Simply:
1. Update to the enhanced package
2. Add optional logs/metrics configuration
3. Existing tracing continues to work unchanged

## Observability Stack

This enhanced interceptor provides complete observability:
- **Traces**: Distributed tracing (existing Jufab feature)
- **Logs**: Structured logging with correlation
- **Metrics**: Performance and business metrics

All three pillars are automatically correlated through trace context propagation.

## Status

- Logs implementation complete
- Metrics implementation complete  
- Retry/jitter support added
- Global error handling integrated
- Web Vitals v4 integrated
- 100% backwards compatible with Jufab
- SSR-safe implementation
- TypeScript strict mode compatible

## License

Apache-2.0 (same as original Jufab library)