/**
 * Multiple Exporters Examples for Enhanced OpenTelemetry Angular Interceptor
 * 
 * This file demonstrates various patterns for using multiple exporters
 * for traces, logs, and metrics simultaneously.
 */

import { NgModule } from '@angular/core';
import { 
  OpenTelemetryInterceptorModule,
  // Logs exporters
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  LogsNoopExporterModule,
  // Metrics exporters  
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule,
  MetricsNoopExporterModule,
  // Span exporters (original Jufab)
  OtelColExporterModule,
  ConsoleSpanExporterModule,
  // Configuration types
  OpenTelemetryConfig
} from '@jufab/opentelemetry-angular-interceptor';

// ============================================
// EXAMPLE 1: PARALLEL MULTI-EXPORTERS
// ============================================

/**
 * Send telemetry to multiple backends simultaneously
 * Useful for: Migration scenarios, redundancy, A/B testing
 */
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'multi-exporter-app',
        console: true,
        production: false
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      // Enable logs and metrics (exporters configured via modules)
      logsConfig: { enabled: true, level: 'info' },
      metricsConfig: { enabled: true, webVitals: true }
    }),

    // MULTIPLE SPAN EXPORTERS
    OtelColExporterModule.forRoot(),           // Send to OTLP collector
    ConsoleSpanExporterModule.forRoot(),       // Also log to console

    // MULTIPLE LOGS EXPORTERS  
    LogsOtelcolExporterModule.forRoot(),       // Send logs to OTLP collector
    LogsConsoleExporterModule.forRoot(),       // Also log to console

    // MULTIPLE METRICS EXPORTERS
    MetricsOtelcolExporterModule.forRoot(),    // Send metrics to OTLP collector  
    MetricsConsoleExporterModule.forRoot()     // Also log metrics to console
  ]
})
export class ParallelMultiExporterModule { }

// ============================================
// EXAMPLE 2: ENVIRONMENT-BASED EXPORTERS
// ============================================

import { environment } from '../environments/environment';

/**
 * Different exporters for different environments
 * Production: OTLP only, Development: OTLP + Console, Test: No-op
 */
const getExporterModules = () => {
  const modules = [];

  // Always include base interceptor
  modules.push(
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'environment-aware-app',
        production: environment.production
      },
      otelcolConfig: {
        url: environment.otelCollectorUrl || 'http://localhost:4318/v1/traces'
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true, webVitals: true }
    })
  );

  if (environment.production) {
    // Production: OTLP exporters only
    modules.push(
      OtelColExporterModule.forRoot(),
      LogsOtelcolExporterModule.forRoot(),
      MetricsOtelcolExporterModule.forRoot()
    );
  } else if (environment.development) {
    // Development: OTLP + Console for debugging
    modules.push(
      OtelColExporterModule.forRoot(),
      ConsoleSpanExporterModule.forRoot(),
      LogsOtelcolExporterModule.forRoot(),
      LogsConsoleExporterModule.forRoot(),
      MetricsOtelcolExporterModule.forRoot(),
      MetricsConsoleExporterModule.forRoot()
    );
  } else {
    // Test: No-op exporters to avoid side effects
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
export class EnvironmentBasedExporterModule { }

// ============================================
// EXAMPLE 3: CONFIGURATION-BASED MULTI-EXPORTERS
// ============================================

/**
 * Using the new multiExporters configuration approach
 * This provides more control over exporter behavior and priorities
 */
export const ADVANCED_MULTI_EXPORTER_CONFIG: OpenTelemetryConfig = {
  commonConfig: {
    serviceName: 'advanced-multi-exporter-app',
    production: false
  },
  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces'
  },
  
  // Enable core features
  logsConfig: {
    enabled: true,
    level: 'debug',
    console: true
  },
  metricsConfig: {
    enabled: true,
    webVitals: true,
    collectFCP: true,
    collectTTFB: true
  },

  // Advanced multi-logs exporters with strategy and priorities
  multiLogsExporters: {
    strategy: 'parallel', // or 'fallback'
    exporters: {
      'primary-collector': {
        type: 'otlp',
        enabled: true,
        priority: 1,
        otlp: {
          url: 'http://primary-collector.com/v1/logs',
          retry: {
            enabled: true,
            maxAttempts: 5,
            jitterType: 'decorrelated'
          }
        }
      },
      'backup-collector': {
        type: 'otlp', 
        enabled: true,
        priority: 2,
        fallbackOnly: false, // Set to true for fallback-only
        otlp: {
          url: 'http://backup-collector.com/v1/logs',
          retry: {
            enabled: true,
            maxAttempts: 3
          }
        }
      },
      'debug-console': {
        type: 'console',
        enabled: true,
        priority: 3
      }
    }
  },

  // Advanced multi-metrics exporters  
  multiMetricsExporters: {
    strategy: 'parallel',
    exporters: {
      'metrics-collector': {
        type: 'otlp',
        enabled: true,
        priority: 1,
        otlp: {
          url: 'http://metrics-collector.com/v1/metrics',
          intervalMs: 15000
        }
      },
      'console-debug': {
        type: 'console',
        enabled: true,
        priority: 2,
        console: {
          intervalMs: 30000
        }
      }
    }
  }
};

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(ADVANCED_MULTI_EXPORTER_CONFIG)
  ]
})
export class AdvancedConfigurationModule { }

// ============================================
// EXAMPLE 4: FALLBACK STRATEGY
// ============================================

/**
 * Fallback exporter strategy - try primary, fall back to secondary
 * Useful for: High availability, cost optimization, failover scenarios
 */
export const FALLBACK_EXPORTER_CONFIG: OpenTelemetryConfig = {
  commonConfig: {
    serviceName: 'fallback-exporter-app',
    production: true
  },
  otelcolConfig: {
    url: 'http://primary-collector.com/v1/traces'
  },

  logsConfig: { enabled: true, level: 'warn' },
  metricsConfig: { enabled: true, webVitals: true },

  // Fallback strategy for logs
  multiLogsExporters: {
    strategy: 'fallback',  // Try in order, stop on first success
    exporters: {
      'primary': {
        type: 'otlp',
        enabled: true,
        priority: 1,
        otlp: {
          url: 'http://primary-collector.com/v1/logs',
          timeoutMs: 5000,
          retry: { enabled: false } // No retry in fallback mode
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
};

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(FALLBACK_EXPORTER_CONFIG)
  ]
})
export class FallbackExporterModule { }

// ============================================  
// EXAMPLE 5: FEATURE-FLAG DRIVEN EXPORTERS
// ============================================

interface FeatureFlags {
  enableOTLPLogs?: boolean;
  enableConsoleLogs?: boolean;
  enableOTLPMetrics?: boolean;
  enableConsoleMetrics?: boolean;
  enableBackupCollector?: boolean;
}

/**
 * Use feature flags to control which exporters are active
 * Useful for: Gradual rollouts, experiments, debugging
 */
function createFeatureFlagModule(featureFlags: FeatureFlags) {
  const modules = [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'feature-flag-app'
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true, webVitals: true }
    })
  ];

  // Add logs exporters based on feature flags
  if (featureFlags.enableOTLPLogs) {
    modules.push(LogsOtelcolExporterModule.forRoot());
  }
  if (featureFlags.enableConsoleLogs) {
    modules.push(LogsConsoleExporterModule.forRoot());
  }

  // Add metrics exporters based on feature flags
  if (featureFlags.enableOTLPMetrics) {
    modules.push(MetricsOtelcolExporterModule.forRoot());
  }
  if (featureFlags.enableConsoleMetrics) {
    modules.push(MetricsConsoleExporterModule.forRoot());
  }

  // Fallback to no-op if no exporters enabled
  if (!featureFlags.enableOTLPLogs && !featureFlags.enableConsoleLogs) {
    modules.push(LogsNoopExporterModule.forRoot());
  }
  if (!featureFlags.enableOTLPMetrics && !featureFlags.enableConsoleMetrics) {
    modules.push(MetricsNoopExporterModule.forRoot());
  }

  return modules;
}

@NgModule({
  imports: createFeatureFlagModule({
    enableOTLPLogs: true,
    enableConsoleLogs: true,
    enableOTLPMetrics: true,
    enableConsoleMetrics: false
  })
})
export class FeatureFlagExporterModule { }

// ============================================
// EXAMPLE 6: CONDITIONAL EXPORTERS
// ============================================

/**
 * Conditionally enable exporters based on runtime conditions
 * Useful for: User preferences, license tiers, resource constraints
 */
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'conditional-exporters-app'
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
    }),

    // Always include console for development visibility
    LogsConsoleExporterModule.forRoot(),
    MetricsConsoleExporterModule.forRoot(),

    // Conditionally add OTLP based on environment/config
    ...(process.env['ENABLE_OTLP'] === 'true' ? [
      LogsOtelcolExporterModule.forRoot(),
      MetricsOtelcolExporterModule.forRoot()
    ] : []),

    // Conditionally add backup collector
    ...(process.env['ENABLE_BACKUP'] === 'true' ? [
      // Custom backup exporter would go here
    ] : [])
  ]
})
export class ConditionalExporterModule { }

// ============================================
// USAGE NOTES
// ============================================

/*
BENEFITS OF MULTIPLE EXPORTERS:

1. **Redundancy**: Send to multiple backends for reliability
2. **Migration**: Gradually move from old to new observability stack
3. **Development**: Console output + remote collection simultaneously  
4. **Compliance**: Meet different regulatory or business requirements
5. **Cost Optimization**: Primary expensive collector + backup free option
6. **A/B Testing**: Compare different observability tools side-by-side

PERFORMANCE CONSIDERATIONS:

1. **Parallel Strategy**: All exporters process every telemetry item
   - Higher CPU/memory usage
   - Better reliability (continues if one fails)
   - All backends get complete data

2. **Fallback Strategy**: Only one exporter processes each item
   - Lower resource usage  
   - Less reliability (stops on first success)
   - Primary backend gets priority

3. **Network Impact**: Multiple exporters = multiple network calls
   - Consider batch sizes and intervals
   - Monitor network bandwidth usage
   - Use local collectors when possible

CONFIGURATION BEST PRACTICES:

1. **Start Simple**: Use modular approach first, add complexity as needed
2. **Environment Specific**: Different exporters for dev/staging/prod
3. **Feature Flags**: Control exporters via feature flags for flexibility
4. **Monitoring**: Monitor exporter health and performance
5. **Fallbacks**: Always have a reliable fallback (console, local file)
*/