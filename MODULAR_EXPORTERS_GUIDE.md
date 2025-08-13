# Modular Exporters Guide

The enhanced OpenTelemetry Angular Interceptor now supports modular exporters for logs and metrics, following the same pattern as the original span exporters from Jufab.

## Architecture

### Span Exporters (Original Jufab Pattern)
```
IExporter interface → SpanExporter implementations → Modules
```

### Logs Exporters (NEW)
```
ILogsExporter interface → LogRecordExporter implementations → Modules
```

### Metrics Exporters (NEW)  
```
IMetricsExporter interface → MetricReader implementations → Modules
```

## Available Exporter Modules

### Logs Exporters

#### OTLP Logs Exporter
```typescript
import { LogsOtelcolExporterModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(config),
    LogsOtelcolExporterModule.forRoot()
  ]
})
export class AppModule { }
```

#### Console Logs Exporter
```typescript
import { LogsConsoleExporterModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(config),
    LogsConsoleExporterModule.forRoot()
  ]
})
export class AppModule { }
```

#### No-op Logs Exporter
```typescript
import { LogsNoopExporterModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(config),
    LogsNoopExporterModule.forRoot()
  ]
})
export class AppModule { }
```

### Metrics Exporters

#### OTLP Metrics Exporter
```typescript
import { MetricsOtelcolExporterModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(config),
    MetricsOtelcolExporterModule.forRoot()
  ]
})
export class AppModule { }
```

#### Console Metrics Exporter
```typescript
import { MetricsConsoleExporterModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(config),
    MetricsConsoleExporterModule.forRoot()
  ]
})
export class AppModule { }
```

#### No-op Metrics Exporter
```typescript
import { MetricsNoopExporterModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(config),
    MetricsNoopExporterModule.forRoot()
  ]
})
export class AppModule { }
```

## Usage Patterns

### Pattern 1: Configuration-Based (Current Default)

Uses the built-in provider factories with configuration-driven exporters:

```typescript
import { OpenTelemetryInterceptorModule } from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'my-app'
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      // Configuration-driven logs
      logsConfig: { enabled: true },
      logsExporters: {
        otlp: { enabled: true },
        console: { enabled: true }
      },
      // Configuration-driven metrics
      metricsConfig: { enabled: true },
      metricsExporters: {
        otlp: { enabled: true }
      }
    })
  ]
})
export class AppModule { }
```

### Pattern 2: Modular Exporters (NEW)

Uses dedicated exporter modules for fine-grained control:

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
        serviceName: 'my-app'
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      // Enable logs and metrics but configure exporters via modules
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

### Pattern 3: Environment-Based Selection

Different exporters for different environments:

```typescript
import { 
  OpenTelemetryInterceptorModule,
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  LogsNoopExporterModule,
  MetricsOtelcolExporterModule,
  MetricsNoopExporterModule
} from '@jufab/opentelemetry-angular-interceptor';
import { environment } from '../environments/environment';

const getLogsExporterModule = () => {
  if (environment.production) {
    return LogsOtelcolExporterModule.forRoot();
  } else if (environment.development) {
    return LogsConsoleExporterModule.forRoot();
  } else {
    return LogsNoopExporterModule.forRoot();
  }
};

const getMetricsExporterModule = () => {
  if (environment.production) {
    return MetricsOtelcolExporterModule.forRoot();
  } else {
    return MetricsNoopExporterModule.forRoot();
  }
};

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'my-app',
        production: environment.production
      },
      otelcolConfig: {
        url: environment.otelCollectorUrl
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
    }),
    getLogsExporterModule(),
    getMetricsExporterModule()
  ]
})
export class AppModule { }
```

## Custom Exporters

You can create custom exporters by implementing the interfaces:

### Custom Logs Exporter

```typescript
import { Injectable } from '@angular/core';
import { LogRecordExporter, LogRecord } from '@opentelemetry/sdk-logs';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { ILogsExporter } from '@jufab/opentelemetry-angular-interceptor';

@Injectable()
export class CustomLogsExporterService implements ILogsExporter {
  
  getExporter(): LogRecordExporter {
    return new CustomLogRecordExporter();
  }
}

class CustomLogRecordExporter implements LogRecordExporter {
  
  export(logs: LogRecord[], resultCallback: (result: ExportResult) => void): void {
    // Send logs to your custom backend
    this.sendToCustomBackend(logs)
      .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
      .catch((error) => resultCallback({ code: ExportResultCode.FAILED, error }));
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  
  private async sendToCustomBackend(logs: LogRecord[]): Promise<void> {
    // Your custom implementation
  }
}

@NgModule({
  providers: [
    CustomLogsExporterService,
    {
      provide: OTEL_LOGS_EXPORTER,
      useExisting: CustomLogsExporterService
    }
  ]
})
export class CustomLogsExporterModule {
  static forRoot() {
    return {
      ngModule: CustomLogsExporterModule,
      providers: []
    };
  }
}
```

### Custom Metrics Exporter

```typescript
import { Injectable } from '@angular/core';
import { MetricReader, PeriodicExportingMetricReader, MetricExporter } from '@opentelemetry/sdk-metrics';
import { IMetricsExporter } from '@jufab/opentelemetry-angular-interceptor';

@Injectable()
export class CustomMetricsExporterService implements IMetricsExporter {
  
  getReader(): MetricReader {
    const customExporter = new CustomMetricExporter();
    return new PeriodicExportingMetricReader({
      exporter: customExporter,
      exportIntervalMillis: 30000
    });
  }
}

class CustomMetricExporter implements MetricExporter {
  // Implementation for custom metrics backend
}
```

## Migration Guide

### From Configuration-Based to Modular

**Before (Configuration-Based):**
```typescript
OpenTelemetryInterceptorModule.forRoot({
  // ... other config
  logsExporters: {
    otlp: { enabled: true },
    console: { enabled: true }
  }
})
```

**After (Modular):**
```typescript
// Base configuration
OpenTelemetryInterceptorModule.forRoot({
  // ... other config (remove logsExporters)
  logsConfig: { enabled: true }
}),

// Separate exporter modules
LogsOtelcolExporterModule.forRoot(),
LogsConsoleExporterModule.forRoot()
```

## Benefits of Modular Exporters

1. **Consistent Pattern**: Same structure as original Jufab span exporters
2. **Fine-Grained Control**: Import only the exporters you need
3. **Tree Shaking**: Unused exporters are eliminated from bundles
4. **Testability**: Easy to mock specific exporters in tests
5. **Extensibility**: Simple to create and integrate custom exporters
6. **Environment Flexibility**: Different exporters for different environments
7. **Lazy Loading**: Exporters can be conditionally loaded

## Injection Tokens

The modular system uses these injection tokens:

```typescript
// Span exporters (original)
OTEL_EXPORTER: InjectionToken<IExporter>

// Logs exporters (new)
OTEL_LOGS_EXPORTER: InjectionToken<ILogsExporter>

// Metrics exporters (new)  
OTEL_METRICS_EXPORTER: InjectionToken<IMetricsExporter>
```

This allows for dependency injection and testing of individual exporters.