# Multiple Exporters Guide

The Enhanced OpenTelemetry Angular Interceptor now supports sending traces, logs, and metrics to multiple backends simultaneously. This guide covers all the patterns and configurations for using multiple exporters effectively.

## Overview

### What's New

- **Composite Exporters**: Internal classes that manage multiple underlying exporters
- **Multi-Provider Injection**: Support for injecting arrays of exporters
- **Parallel and Fallback Strategies**: Choose how multiple exporters operate
- **Configuration-Based Multi-Exporters**: Advanced configuration for complex scenarios
- **Backwards Compatibility**: Existing single-exporter setups continue to work

### Use Cases

1. **Redundancy**: Send telemetry to multiple backends for reliability
2. **Migration**: Gradually move from old to new observability platform
3. **Development**: Console output + remote collection for debugging
4. **Compliance**: Meet different regulatory or business requirements
5. **Cost Optimization**: Primary expensive + backup free collector
6. **A/B Testing**: Compare different observability tools

## Architecture

### Single vs Multiple Exporters

**Before (Single Exporter):**
```
Application → Single Exporter → Single Backend
```

**After (Multiple Exporters):**
```
Application → Composite Exporter → Multiple Backends
                    ├─ Primary Backend (OTLP)
                    ├─ Backup Backend (OTLP)  
                    └─ Console (Development)
```

### Strategies

#### Parallel Strategy (Default)
- All exporters receive all telemetry data
- Success if at least one exporter succeeds
- Higher resource usage but better reliability

#### Fallback Strategy  
- Try exporters in priority order
- Stop on first successful export
- Lower resource usage but less redundancy

## Usage Patterns

### Pattern 1: Modular Multi-Exporters (Recommended)

Import multiple exporter modules - they automatically combine:

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
    // Base configuration
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: { serviceName: 'my-app' },
      otelcolConfig: { url: 'http://localhost:4318/v1/traces' },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true, webVitals: true }
    }),
    
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

### Pattern 2: Configuration-Based Multi-Exporters

Use the enhanced configuration for fine-grained control:

```typescript
export const MULTI_EXPORTER_CONFIG: OpenTelemetryConfig = {
  commonConfig: {
    serviceName: 'multi-exporter-app'
  },
  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces'
  },
  
  logsConfig: { enabled: true },
  metricsConfig: { enabled: true },

  // Advanced multi-exporters with priorities and strategies
  multiLogsExporters: {
    strategy: 'parallel', // or 'fallback'
    exporters: {
      'primary-collector': {
        type: 'otlp',
        enabled: true,
        priority: 1,
        otlp: {
          url: 'http://primary.com/v1/logs',
          retry: { enabled: true, maxAttempts: 5 }
        }
      },
      'backup-collector': {
        type: 'otlp',
        enabled: true,
        priority: 2,
        fallbackOnly: false,
        otlp: {
          url: 'http://backup.com/v1/logs'
        }
      },
      'console-debug': {
        type: 'console',
        enabled: true,
        priority: 3
      }
    }
  }
};

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(MULTI_EXPORTER_CONFIG)
  ]
})
export class AppModule { }
```

### Pattern 3: Environment-Based Exporters

Different exporters for different environments:

```typescript
const getExporterModules = () => {
  const modules = [
    OpenTelemetryInterceptorModule.forRoot(baseConfig)
  ];

  if (environment.production) {
    // Production: OTLP only
    modules.push(
      LogsOtelcolExporterModule.forRoot(),
      MetricsOtelcolExporterModule.forRoot()
    );
  } else if (environment.development) {
    // Development: OTLP + Console
    modules.push(
      LogsOtelcolExporterModule.forRoot(),
      LogsConsoleExporterModule.forRoot(),
      MetricsOtelcolExporterModule.forRoot(),
      MetricsConsoleExporterModule.forRoot()
    );
  } else {
    // Test: No-op exporters
    modules.push(
      LogsNoopExporterModule.forRoot(),
      MetricsNoopExporterModule.forRoot()
    );
  }

  return modules;
};

@NgModule({
  imports: getExporterModules()
})
export class AppModule { }
```

## Configuration Reference

### MultiLogsExporters Interface

```typescript
interface MultiLogsExporters {
  strategy?: 'parallel' | 'fallback';
  exporters?: {
    [key: string]: {
      type: 'otlp' | 'console' | 'custom';
      enabled?: boolean;
      priority?: number;           // Lower = higher priority
      fallbackOnly?: boolean;      // Only used in fallback strategy
      otlp?: {
        url?: string;
        headers?: Record<string, string>;
        timeoutMs?: number;
        retry?: RetryConfig;
      };
      console?: {
        enabled?: boolean;
      };
      custom?: {
        className?: string;
        factory?: string;
        options?: Record<string, any>;
      };
    };
  };
}
```

### MultiMetricsExporters Interface

```typescript
interface MultiMetricsExporters {
  strategy?: 'parallel' | 'fallback';
  exporters?: {
    [key: string]: {
      type: 'otlp' | 'console' | 'prometheus' | 'custom';
      enabled?: boolean;
      priority?: number;
      fallbackOnly?: boolean;
      otlp?: {
        url?: string;
        headers?: Record<string, string>;
        intervalMs?: number;
        timeoutMs?: number;
        retry?: RetryConfig;
      };
      console?: {
        enabled?: boolean;
        intervalMs?: number;
      };
      prometheus?: {
        endpoint?: string;
        port?: number;
      };
      custom?: {
        className?: string;
        factory?: string;
        options?: Record<string, any>;
      };
    };
  };
}
```

## Advanced Scenarios

### High Availability Setup

```typescript
multiLogsExporters: {
  strategy: 'fallback',
  exporters: {
    'primary': {
      type: 'otlp',
      enabled: true,
      priority: 1,
      otlp: {
        url: 'http://primary-collector.com/v1/logs',
        timeoutMs: 5000,
        retry: { enabled: false } // No retry in fallback
      }
    },
    'secondary': {
      type: 'otlp', 
      enabled: true,
      priority: 2,
      otlp: {
        url: 'http://secondary-collector.com/v1/logs',
        timeoutMs: 10000
      }
    },
    'emergency': {
      type: 'console',
      enabled: true,
      priority: 3
    }
  }
}
```

### Migration Setup

```typescript
// Gradually migrate from old to new collector
multiLogsExporters: {
  strategy: 'parallel',
  exporters: {
    'legacy-collector': {
      type: 'otlp',
      enabled: true,
      priority: 1,
      otlp: { url: 'http://old-collector.com/v1/logs' }
    },
    'new-collector': {
      type: 'otlp',
      enabled: true,
      priority: 2,
      otlp: { url: 'http://new-collector.com/v1/logs' }
    }
  }
}
```

### Development Debug Setup

```typescript
// Send to collector AND console for development debugging
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(baseConfig),
    
    // Production collector
    LogsOtelcolExporterModule.forRoot(),
    MetricsOtelcolExporterModule.forRoot(),
    
    // Development debugging (only in dev mode)
    ...(environment.development ? [
      LogsConsoleExporterModule.forRoot(),
      MetricsConsoleExporterModule.forRoot()
    ] : [])
  ]
})
export class AppModule { }
```

## Performance Considerations

### Resource Usage

**Parallel Strategy:**
- CPU: Each exporter processes every telemetry item
- Memory: Composite exporter holds references to all exporters
- Network: Multiple simultaneous network calls

**Fallback Strategy:**
- CPU: Only one exporter processes each item (on success)
- Memory: Lower memory usage
- Network: Sequential network calls (stops on success)

### Optimization Tips

1. **Use Local Collectors**: Send to local OTEL collector, let it forward
```typescript
// Better: App → Local Collector → Multiple Backends
otlp: { url: 'http://localhost:4318/v1/logs' }

// Avoid: App → Multiple Remote Backends (high latency)
```

2. **Adjust Batch Sizes**: Larger batches for multiple exporters
```typescript
batchSpanProcessorConfig: {
  maxExportBatchSize: 1024, // Larger batches for efficiency
  scheduledDelayMillis: 2000
}
```

3. **Configure Timeouts**: Shorter timeouts to avoid blocking
```typescript
otlp: {
  timeoutMs: 5000, // Don't wait too long for each exporter
  retry: {
    enabled: true,
    maxAttempts: 2 // Fewer retries with multiple exporters
  }
}
```

## Error Handling

### Parallel Strategy Error Handling
- **Success Criteria**: At least one exporter succeeds
- **Failure**: All exporters fail
- **Behavior**: Continues processing even if some exporters fail

### Fallback Strategy Error Handling  
- **Success Criteria**: First successful exporter
- **Failure**: All exporters in chain fail
- **Behavior**: Stops on first success, continues on failure

### Monitoring Exporter Health

```typescript
// Console output shows exporter status
console.log('OpenTelemetry Logs Provider initialized with 3 exporter(s)');

// Monitor for error messages
console.error('Failed to export to primary collector, trying backup...');
```

## Custom Exporters

You can create custom exporters that work with the multi-exporter system:

### Custom Logs Exporter

```typescript
import { Injectable } from '@angular/core';
import { LogRecordExporter, LogRecord } from '@opentelemetry/sdk-logs';
import { ILogsExporter } from '@jufab/opentelemetry-angular-interceptor';

@Injectable()
export class CustomLogsExporterService implements ILogsExporter {
  getExporter(): LogRecordExporter {
    return new MyCustomLogRecordExporter();
  }
}

@NgModule({
  providers: [
    CustomLogsExporterService,
    {
      provide: OTEL_LOGS_EXPORTERS,
      useExisting: CustomLogsExporterService,
      multi: true // Important: multi: true for multiple exporters
    }
  ]
})
export class CustomLogsExporterModule {
  static forRoot() {
    return { ngModule: CustomLogsExporterModule };
  }
}
```

## Migration Guide

### From Single to Multiple Exporters

**Before:**
```typescript
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      // ... config
      logsExporters: {
        otlp: { enabled: true }
      }
    })
  ]
})
```

**After (keeping existing + adding new):**
```typescript
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      // ... config (keep existing)
      logsExporters: {
        otlp: { enabled: true } // Still works
      }
    }),
    
    // Add additional exporters
    LogsConsoleExporterModule.forRoot()
  ]
})
```

## Troubleshooting

### Common Issues

1. **No exporters found**
   - Ensure at least one exporter module is imported
   - Check that exporter modules use `multi: true`

2. **Only one exporter working**
   - Verify all exporter modules are imported correctly
   - Check browser console for exporter initialization messages

3. **Performance issues**
   - Consider using fallback strategy instead of parallel
   - Reduce batch sizes or increase intervals
   - Use local collectors when possible

4. **Memory leaks**
   - Ensure proper shutdown of all exporters
   - Monitor for unclosed connections

### Debug Information

Enable debug logging to see multi-exporter behavior:

```typescript
logsConfig: {
  enabled: true,
  console: true, // Shows debug info in console
  level: 'debug'
}
```

Look for console messages like:
```
Found 3 exporters via multi-provider injection
OpenTelemetry Logs Provider initialized with 3 exporter(s)
OTLP Logs reader added: http://localhost:4318/v1/logs
Console Logs reader added
```

## Best Practices

1. **Start Simple**: Begin with modular approach, add complexity as needed
2. **Environment-Specific**: Use different exporters for different environments
3. **Monitor Health**: Watch for exporter failures and performance issues
4. **Gradual Rollout**: Use feature flags to control exporter activation
5. **Local Collectors**: Prefer local collectors over multiple remote endpoints
6. **Timeout Configuration**: Set appropriate timeouts to prevent blocking
7. **Test Thoroughly**: Test all exporter combinations in your environment

This multiple exporters system provides the flexibility to meet complex observability requirements while maintaining the simplicity of the original single-exporter approach.