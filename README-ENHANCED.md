# Enhanced OpenTelemetry Angular Interceptor

[![Apache License](http://img.shields.io/badge/license-APACHE2-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0.html)

> **Enhanced Version:** This is an enhanced version of [@jufab/opentelemetry-angular-interceptor](https://github.com/jufab/opentelemetry-angular-interceptor) that adds comprehensive **Logs** and **Metrics** support alongside the existing tracing capabilities.

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

## Complete Observability Stack

This enhanced interceptor provides **complete observability** for Angular applications:

| Signal | Capability | Status |
|--------|------------|--------|
| **Traces** | Distributed tracing (original Jufab) | Ready |
| **Logs** | Structured logging with correlation | Ready |
| **Metrics** | Performance and business metrics | Ready |

All three signals are automatically correlated through OpenTelemetry context propagation.

## Quick Start

### Installation

```bash
npm install @jufab/opentelemetry-angular-interceptor
```

### Usage Patterns

Two patterns are available for configuring logs and metrics exporters:

#### Pattern 1: Configuration-Based (Recommended for Simple Use)

The enhanced module maintains 100% backwards compatibility:

```typescript
import { OpenTelemetryInterceptorModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      // Existing Jufab configuration (unchanged)
      commonConfig: {
        serviceName: 'my-app',
        console: true
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      
      // NEW: Optional logs configuration
      logsConfig: {
        enabled: true,
        level: 'info',
        console: true
      },
      
      logsExporters: {
        otlp: { enabled: true } // Auto-inherits URL from otelcolConfig
      },
      
      // NEW: Optional metrics configuration  
      metricsConfig: {
        enabled: true,
        webVitals: true
      },
      
      metricsExporters: {
        otlp: { enabled: true } // Auto-inherits URL from otelcolConfig
      }
    })
  ]
})
export class AppModule { }
```

#### Pattern 2: Modular Exporters (Recommended for Advanced Use)

For fine-grained control, use separate exporter modules:

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
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
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

### Service Usage

```typescript
import { 
  OpenTelemetryLogsService, 
  OpenTelemetryMetricsService 
} from '@jufab/opentelemetry-angular-interceptor';

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

## Demo Application

Explore all features with the included demo application:

```bash
# Clone and setup
git clone <this-repo>
cd enhanced-opentelemetry-angular-interceptor
npm install

# Run the enhanced demo
npm run start:enhanced
```

Visit `http://localhost:5200` to see:
- **Logs Demo:** Trace correlation, PII redaction, error handling
- **Metrics Demo:** Web Vitals, custom metrics, user interactions  
- **Error Demo:** Global error handling, recovery patterns

## Documentation

- **[Enhanced Features Guide](./ENHANCED_FEATURES.md)** - Complete feature documentation
- **[Modular Exporters Guide](./MODULAR_EXPORTERS_GUIDE.md)** - Modular exporters pattern documentation
- **[Example Configuration](./example-config.ts)** - Configuration examples (both patterns)
- **[Modular Examples](./modular-examples.ts)** - Modular exporter examples
- **[Demo Application](./projects/enhanced-example/README.md)** - Interactive demo guide
- **[Original Jufab Docs](https://github.com/jufab/opentelemetry-angular-interceptor)** - Base tracing features

## Configuration

### Full Configuration Example

```typescript
OpenTelemetryInterceptorModule.forRoot({
  // Original Jufab configuration
  commonConfig: {
    serviceName: 'my-angular-app',
    console: true,
    production: false
  },
  
  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces'
  },
  
  // Enhanced logs configuration
  logsConfig: {
    enabled: true,
    level: 'info',
    console: true,
    consoleBridge: true,
    rateLimit: {
      maxPerMinute: 100
    },
    redact: {
      enabled: true,
      patterns: [/email@domain\.com/g]
    }
  },
  
  logsExporters: {
    otlp: {
      enabled: true,
      retry: {
        enabled: true,
        maxAttempts: 3,
        jitterType: 'full'
      }
    },
    console: { enabled: true }
  },
  
  // Enhanced metrics configuration
  metricsConfig: {
    enabled: true,
    webVitals: true,
    collectFCP: true,
    collectTTFB: true,
    interval: 15000
  },
  
  metricsExporters: {
    otlp: {
      enabled: true,
      intervalMs: 15000
    }
  }
})
```

## Key Features

### Automatic Trace Correlation
All logs automatically include `trace_id` and `span_id`:
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
Automatically captures:
- Angular errors (via ErrorHandler)
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

### Production Ready
- Rate limiting to prevent log flooding
- PII redaction with configurable patterns
- Retry logic with exponential backoff and jitter
- SSR-safe (no-ops on server-side)
- Zero performance impact when disabled

## Migration from Standard Jufab

**No migration needed!** Simply:
1. Update to the enhanced version
2. Add optional logs/metrics configuration
3. Existing tracing continues unchanged

## Development

```bash
# Build the library
npm run build:prod

# Run tests
npm test

# Run linting
npm run lint

# Build demo app
npm run build:enhanced

# Generate documentation
npm run compodoc
```

## Package Contents

```
enhanced-opentelemetry-angular-interceptor/
├── projects/
│   ├── opentelemetry-interceptor/     # Enhanced library
│   │   ├── src/lib/
│   │   │   ├── services/
│   │   │   │   ├── logs/              # NEW: Logs implementation
│   │   │   │   ├── metrics/           # NEW: Metrics implementation  
│   │   │   │   └── retry-utils.ts     # NEW: Retry logic
│   │   │   ├── configuration/         # Enhanced configuration
│   │   │   └── ...                    # Original Jufab code
│   │   └── ...
│   └── enhanced-example/              # NEW: Demo application
├── ENHANCED_FEATURES.md               # NEW: Complete feature guide
├── example-config.ts                  # NEW: Configuration examples
└── README-ENHANCED.md                 # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## License

Apache-2.0 (same as original Jufab library)

## Acknowledgments

- **[Julien Fabre (@jufab)](https://github.com/jufab)** - Original OpenTelemetry Angular Interceptor
- **[OpenTelemetry Community](https://opentelemetry.io/)** - Observability standards and SDKs
- **[Angular Team](https://angular.io/)** - Framework and developer tools

---

## What's Next?

This enhanced interceptor transforms your Angular application into a fully observable system with:

- **Distributed Tracing** - See request flows across services
- **Structured Logging** - Debug issues with correlated logs  
- **Performance Metrics** - Monitor user experience and business KPIs

Try the [demo application](#demo-application) to see all features in action!