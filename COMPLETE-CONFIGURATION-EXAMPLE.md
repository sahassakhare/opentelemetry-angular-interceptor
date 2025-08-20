# Complete OpenTelemetry Angular Configuration Example

## Overview

This document provides a **complete, production-ready configuration example** for the enhanced OpenTelemetry Angular interceptor using the **simplified modular approach**.

---

## 🚀 Complete App Module Example

### Basic Configuration (Development)

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

// OpenTelemetry Imports
import { 
  OpenTelemetryInterceptorModule,
  
  // Trace Exporters
  OtelColExporterModule,
  ConsoleSpanExporterModule,
  
  // Logs Exporters  
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  
  // Metrics Exporters
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule,
  
  // Propagator
  CompositePropagatorModule
} from '@jufab/opentelemetry-angular-interceptor';

// Your Components
import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    
    // ===========================================
    // STEP 1: IMPORT EXPORTER MODULES
    // ===========================================
    
    // Trace exporters
    OtelColExporterModule,              // OTLP traces
    ConsoleSpanExporterModule,          // Console traces (dev only)
    
    // Logs exporters
    LogsOtelcolExporterModule,          // OTLP logs
    LogsConsoleExporterModule,          // Console logs (dev only)
    
    // Metrics exporters  
    MetricsOtelcolExporterModule,       // OTLP metrics
    MetricsConsoleExporterModule,       // Console metrics (dev only)
    
    // Propagator
    CompositePropagatorModule,
    
    // ===========================================
    // STEP 2: CONFIGURE BEHAVIOR (NOT EXPORTERS)
    // ===========================================
    
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'dashboard', component: DashboardComponent }
    ]),
    
    OpenTelemetryInterceptorModule.forRoot({
      // Common configuration
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'my-angular-app',
        probabilitySampler: '1',
        resourceAttributes: {
          'service.namespace': 'frontend',
          'service.instance.id': 'app-instance-1',
          'deployment.environment': 'development'
        }
      },
      
      // OTLP collector configuration
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces',
        headers: {
          'Authorization': 'Bearer your-token'
        }
      },
      
      // Logs behavior configuration
      logsConfig: {
        enabled: true,
        level: 'info',
        console: true,
        consoleBridge: false,
        
        rateLimit: {
          maxPerMinute: 100,
          cleanupIntervalMs: 300000,
          memoryThresholdMB: 100,
          slidingWindowMs: 60000
        },
        
        redact: {
          enabled: true,
          patterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
            /\b\d{3}-\d{2}-\d{4}\b/g  // SSNs
          ]
        }
      },
      
      // Metrics behavior configuration
      metricsConfig: {
        enabled: true,
        webVitals: true,
        collectFCP: true,
        collectTTFB: true,
        interval: 15000,
        console: false,
        
        histogramBoundariesMs: [100, 300, 1000, 3000, 5000],
        
        urlHygiene: {
          stripQuery: true,
          stripFragment: true,
          maxLength: 100
        }
      },
      
      // Span timeout management
      spanTimeout: {
        httpTimeoutMs: 30000,
        uiTimeoutMs: 10000,
        manualTimeoutMs: 60000,
        enabled: true,
        memoryMonitoring: true
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## 🏭 Production Configuration

### Production App Module

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';

import { 
  OpenTelemetryInterceptorModule,
  OtelColExporterModule,
  LogsOtelcolExporterModule,
  MetricsOtelcolExporterModule,
  CompositePropagatorModule
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    
    // Production: Only OTLP exporters (no console)
    OtelColExporterModule,
    LogsOtelcolExporterModule,
    MetricsOtelcolExporterModule,
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        console: false,                  // No console in production
        production: true,
        serviceName: process.env['APP_NAME'] || 'angular-app',
        probabilitySampler: '0.1',       // Sample 10% in production
        resourceAttributes: {
          'service.namespace': 'production',
          'service.version': process.env['APP_VERSION'],
          'deployment.environment': 'production'
        }
      },
      
      otelcolConfig: {
        url: process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] || 'https://otel-collector.company.com/v1/traces',
        headers: {
          'Authorization': `Bearer ${process.env['OTEL_API_KEY']}`,
          'X-Service-Name': process.env['APP_NAME']
        }
      },
      
      logsConfig: {
        enabled: true,
        level: 'warn',                   // Only warnings and errors in production
        console: false,
        consoleBridge: false,
        
        rateLimit: {
          maxPerMinute: 500,             // Higher limits for production
          memoryThresholdMB: 50,         // Lower memory usage
          cleanupIntervalMs: 60000       // More frequent cleanup
        },
        
        redact: {
          enabled: true,
          patterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            /\b\d{3}-\d{2}-\d{4}\b/g,
            /\b4[0-9]{12}(?:[0-9]{3})?\b/g,  // Credit cards
            /\bkey[_-]?[a-zA-Z0-9]{20,}\b/gi  // API keys
          ]
        }
      },
      
      metricsConfig: {
        enabled: true,
        webVitals: true,
        interval: 30000,                 // Less frequent collection
        console: false,
        
        urlHygiene: {
          stripQuery: true,
          stripFragment: true,
          maxLength: 50
        }
      },
      
      spanTimeout: {
        httpTimeoutMs: 15000,            // Shorter timeouts in production
        uiTimeoutMs: 5000,
        enabled: true,
        memoryMonitoring: true
      }
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## 🧪 Testing Configuration

### Testing App Module

```typescript
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { 
  OpenTelemetryInterceptorModule,
  ConsoleSpanExporterModule,
  LogsConsoleExporterModule,
  MetricsConsoleExporterModule,
  NoopSpanExporterModule,              // For tests that don't need tracing
  CompositePropagatorModule
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    BrowserModule,
    
    // Testing: Console-only exporters or no-op
    ConsoleSpanExporterModule,
    LogsConsoleExporterModule,
    MetricsConsoleExporterModule,
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'test-app',
        probabilitySampler: '1'          // Sample everything in tests
      },
      
      logsConfig: {
        enabled: true,
        level: 'debug',                  // All logs in tests
        console: true,
        
        rateLimit: {
          maxPerMinute: 1000,            // No rate limiting in tests
          enabled: false
        }
      },
      
      metricsConfig: {
        enabled: true,
        console: true,
        interval: 5000                   // Faster collection for tests
      },
      
      spanTimeout: {
        enabled: false                   // Disable timeouts in tests
      }
    })
  ],
  bootstrap: [AppComponent]
})
export class TestAppModule { }
```

---

## 🔧 Environment-Based Configuration

### Environment Service

```typescript
// environment.service.ts
import { Injectable } from '@angular/core';

export interface OtelEnvironmentConfig {
  serviceName: string;
  environment: 'development' | 'staging' | 'production';
  otlpEndpoint: string;
  apiKey?: string;
  sampling: number;
  logsLevel: 'debug' | 'info' | 'warn' | 'error';
  consoleEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  getOtelConfig(): OtelEnvironmentConfig {
    const env = process.env['NODE_ENV'] || 'development';
    
    switch (env) {
      case 'production':
        return {
          serviceName: process.env['APP_NAME'] || 'angular-app',
          environment: 'production',
          otlpEndpoint: 'https://otel-collector.company.com/v1/traces',
          apiKey: process.env['OTEL_API_KEY'],
          sampling: 0.1,
          logsLevel: 'warn',
          consoleEnabled: false
        };
        
      case 'staging':
        return {
          serviceName: 'angular-app-staging',
          environment: 'staging',
          otlpEndpoint: 'https://staging-otel.company.com/v1/traces',
          sampling: 0.5,
          logsLevel: 'info',
          consoleEnabled: false
        };
        
      default: // development
        return {
          serviceName: 'angular-app-dev',
          environment: 'development',
          otlpEndpoint: 'http://localhost:4318/v1/traces',
          sampling: 1.0,
          logsLevel: 'debug',
          consoleEnabled: true
        };
    }
  }
}
```

### Dynamic Configuration Factory

```typescript
// otel-config.factory.ts
import { EnvironmentService } from './environment.service';
import { OpenTelemetryConfig } from '@jufab/opentelemetry-angular-interceptor';

export function createOtelConfig(envService: EnvironmentService): OpenTelemetryConfig {
  const envConfig = envService.getOtelConfig();
  
  return {
    commonConfig: {
      console: envConfig.consoleEnabled,
      production: envConfig.environment === 'production',
      serviceName: envConfig.serviceName,
      probabilitySampler: envConfig.sampling.toString(),
      resourceAttributes: {
        'service.namespace': 'frontend',
        'service.version': process.env['APP_VERSION'] || '1.0.0',
        'deployment.environment': envConfig.environment
      }
    },
    
    otelcolConfig: {
      url: envConfig.otlpEndpoint,
      headers: envConfig.apiKey ? {
        'Authorization': `Bearer ${envConfig.apiKey}`
      } : undefined
    },
    
    logsConfig: {
      enabled: true,
      level: envConfig.logsLevel,
      console: envConfig.consoleEnabled,
      
      rateLimit: {
        maxPerMinute: envConfig.environment === 'production' ? 500 : 100,
        memoryThresholdMB: envConfig.environment === 'production' ? 50 : 100
      }
    },
    
    metricsConfig: {
      enabled: true,
      webVitals: true,
      console: envConfig.consoleEnabled,
      interval: envConfig.environment === 'production' ? 30000 : 15000
    },
    
    spanTimeout: {
      enabled: envConfig.environment === 'production',
      httpTimeoutMs: envConfig.environment === 'production' ? 15000 : 30000
    }
  };
}

// Usage in app.module.ts
OpenTelemetryInterceptorModule.forRoot(createOtelConfig(environmentService))
```

---

## 📱 Mobile/PWA Configuration

### PWA-Optimized Configuration

```typescript
import { 
  OpenTelemetryInterceptorModule,
  OtelColExporterModule,
  LogsOtelcolExporterModule,
  MetricsOtelcolExporterModule,
  CompositePropagatorModule
} from '@jufab/opentelemetry-angular-interceptor';

@NgModule({
  imports: [
    // Standard exporters
    OtelColExporterModule,
    LogsOtelcolExporterModule,
    MetricsOtelcolExporterModule,
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'pwa-app',
        probabilitySampler: '0.5'        // Reduced sampling for mobile
      },
      
      logsConfig: {
        enabled: true,
        level: 'warn',                   // Reduce logs on mobile
        
        rateLimit: {
          maxPerMinute: 50,              // Lower rate limits for mobile
          memoryThresholdMB: 25          // Lower memory usage
        }
      },
      
      metricsConfig: {
        enabled: true,
        webVitals: true,
        interval: 60000,                 // Less frequent on mobile
        
        urlHygiene: {
          stripQuery: true,
          maxLength: 30                  // Shorter URLs
        }
      },
      
      spanTimeout: {
        httpTimeoutMs: 10000,            // Shorter timeouts for mobile
        uiTimeoutMs: 3000,
        enabled: true
      },
      
      // Service Worker configuration for PWA
      serviceWorkerConfig: {
        enabled: true,
        traceContext: {
          enabled: true,
          backgroundSync: {
            enabled: true,
            maxRetries: 3
          }
        },
        offlineStorage: {
          enabled: true,
          maxStorageSize: 10 * 1024 * 1024  // 10MB
        }
      }
    })
  ]
})
export class PWAAppModule { }
```

---

## 🔐 Security-Focused Configuration

### High-Security Configuration

```typescript
@NgModule({
  imports: [
    OtelColExporterModule,
    LogsOtelcolExporterModule,
    MetricsOtelcolExporterModule,
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'secure-app',
        probabilitySampler: '0.01',      // Very low sampling for security
        
        resourceAttributes: {
          'service.namespace': 'secure',
          // Don't include sensitive environment info
        }
      },
      
      otelcolConfig: {
        url: 'https://secure-otel.company.com/v1/traces',
        headers: {
          'Authorization': `Bearer ${getSecureToken()}`,
          'X-Request-ID': generateRequestId()
        }
      },
      
      logsConfig: {
        enabled: true,
        level: 'error',                  // Only errors for security
        console: false,                  // Never log to console
        consoleBridge: false,
        
        rateLimit: {
          maxPerMinute: 10,              // Very restrictive
          enabled: true
        },
        
        redact: {
          enabled: true,
          patterns: [
            // Comprehensive PII redaction
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            /\b\d{3}-\d{2}-\d{4}\b/g,
            /\b4[0-9]{12}(?:[0-9]{3})?\b/g,
            /\bkey[_-]?[a-zA-Z0-9]{20,}\b/gi,
            /\btoken[_-]?[a-zA-Z0-9]{20,}\b/gi,
            /\bpassword[_-]?[a-zA-Z0-9]{8,}\b/gi,
            /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
          ]
        }
      },
      
      metricsConfig: {
        enabled: true,
        webVitals: false,                // Disable potentially sensitive metrics
        console: false,
        interval: 120000,                // Very infrequent
        
        urlHygiene: {
          stripQuery: true,              // Remove all query parameters
          stripFragment: true,
          maxLength: 20                  // Very short URLs
        }
      }
    })
  ]
})
export class SecureAppModule { }
```

---

## 🎮 Gaming/Real-time Configuration

### High-Performance Configuration

```typescript
@NgModule({
  imports: [
    OtelColExporterModule,
    LogsOtelcolExporterModule,
    MetricsOtelcolExporterModule,
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'gaming-app',
        probabilitySampler: '1'          // Full sampling for performance analysis
      },
      
      logsConfig: {
        enabled: true,
        level: 'info',
        
        rateLimit: {
          maxPerMinute: 2000,            // High throughput
          cleanupIntervalMs: 10000,      // Frequent cleanup
          slidingWindowMs: 30000         // Shorter windows
        }
      },
      
      metricsConfig: {
        enabled: true,
        webVitals: true,
        interval: 1000,                  // Very frequent collection
        
        histogramBoundariesMs: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]
      },
      
      spanTimeout: {
        httpTimeoutMs: 5000,             // Fast timeouts
        uiTimeoutMs: 1000,
        enabled: true,
        memoryMonitoring: true
      }
    })
  ]
})
export class GamingAppModule { }
```

---

## 📊 Analytics Configuration

### Data-Heavy Analytics Configuration

```typescript
@NgModule({
  imports: [
    OtelColExporterModule,
    LogsOtelcolExporterModule,
    LogsConsoleExporterModule,           // Dual logs for analytics
    MetricsOtelcolExporterModule,
    MetricsConsoleExporterModule,        // Dual metrics for analytics
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'analytics-dashboard',
        probabilitySampler: '1',         // Sample everything for analytics
        
        resourceAttributes: {
          'service.namespace': 'analytics',
          'analytics.version': '2.0',
          'dashboard.type': 'real-time'
        }
      },
      
      logsConfig: {
        enabled: true,
        level: 'debug',                  // All logs for analytics
        console: true,
        
        rateLimit: {
          maxPerMinute: 5000,            // Very high limits
          memoryThresholdMB: 200,        // Higher memory usage
          enabled: false                 // No rate limiting for analytics
        }
      },
      
      metricsConfig: {
        enabled: true,
        webVitals: true,
        collectFCP: true,
        collectTTFB: true,
        interval: 5000,                  // Frequent collection
        console: true,
        
        histogramBoundariesMs: [10, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
        
        urlHygiene: {
          stripQuery: false,             // Keep query params for analytics
          stripFragment: false,
          maxLength: 500                 // Longer URLs for analytics
        }
      }
    })
  ]
})
export class AnalyticsAppModule { }
```

---

## 🛠 Development Tools Configuration

### Debug-Optimized Configuration

```typescript
@NgModule({
  imports: [
    OtelColExporterModule,
    ConsoleSpanExporterModule,
    LogsOtelcolExporterModule,
    LogsConsoleExporterModule,
    MetricsOtelcolExporterModule,
    MetricsConsoleExporterModule,
    CompositePropagatorModule,
    
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'debug-app',
        probabilitySampler: '1',
        
        resourceAttributes: {
          'debug.mode': 'enabled',
          'developer.name': process.env['DEV_NAME'] || 'unknown'
        }
      },
      
      logsConfig: {
        enabled: true,
        level: 'debug',
        console: true,
        consoleBridge: true,             // Bridge console.log calls
        
        rateLimit: {
          enabled: false                 // No limits for debugging
        },
        
        redact: {
          enabled: false                 // No redaction for debugging
        }
      },
      
      metricsConfig: {
        enabled: true,
        webVitals: true,
        console: true,
        interval: 2000,                  // Very frequent for debugging
        
        urlHygiene: {
          stripQuery: false,             // Keep everything for debugging
          stripFragment: false
        }
      },
      
      spanTimeout: {
        enabled: true,
        memoryMonitoring: true,
        httpTimeoutMs: 60000,            // Longer timeouts for debugging
        uiTimeoutMs: 30000
      }
    })
  ]
})
export class DebugAppModule { }
```

---

## 📋 Configuration Validation

### Runtime Configuration Checker

```typescript
// otel-config.validator.ts
import { OpenTelemetryConfig } from '@jufab/opentelemetry-angular-interceptor';

export function validateOtelConfig(config: OpenTelemetryConfig): string[] {
  const warnings: string[] = [];
  
  // Check service name
  if (!config.commonConfig?.serviceName) {
    warnings.push('Service name is not configured');
  }
  
  // Check production settings
  if (config.commonConfig?.production) {
    if (config.commonConfig.console) {
      warnings.push('Console logging enabled in production');
    }
    
    if (config.logsConfig?.level === 'debug') {
      warnings.push('Debug logging enabled in production');
    }
    
    if (parseFloat(config.commonConfig.probabilitySampler || '1') > 0.1) {
      warnings.push('High sampling rate in production may impact performance');
    }
  }
  
  // Check security
  if (config.logsConfig?.redact?.enabled === false) {
    warnings.push('PII redaction is disabled');
  }
  
  // Check performance
  if (config.metricsConfig?.interval && config.metricsConfig.interval < 5000) {
    warnings.push('Very frequent metrics collection may impact performance');
  }
  
  return warnings;
}

// Usage in app.module.ts
const config = createOtelConfig();
const warnings = validateOtelConfig(config);
if (warnings.length > 0) {
  console.warn('OpenTelemetry Configuration Warnings:', warnings);
}
```

---

## 🎯 Quick Reference

### Available Exporter Modules

| **Type** | **Module** | **Purpose** |
|----------|------------|-------------|
| **Traces** | `OtelColExporterModule` | OTLP traces (required) |
| | `ConsoleSpanExporterModule` | Console traces (dev) |
| | `ZipkinExporterModule` | Zipkin traces |
| | `NoopSpanExporterModule` | No-op traces (test) |
| **Logs** | `LogsOtelcolExporterModule` | OTLP logs |
| | `LogsConsoleExporterModule` | Console logs |
| | `LogsNoopExporterModule` | No-op logs |
| **Metrics** | `MetricsOtelcolExporterModule` | OTLP metrics |
| | `MetricsConsoleExporterModule` | Console metrics |
| | `MetricsNoopExporterModule` | No-op metrics |
| **Propagators** | `CompositePropagatorModule` | Multi-format (recommended) |
| | `B3PropagatorModule` | B3 format |
| | `W3CTraceContextPropagatorModule` | W3C format |

### Configuration Sections

| **Section** | **Purpose** | **Required** |
|-------------|-------------|--------------|
| `commonConfig` | Basic service info | ✅ Yes |
| `otelcolConfig` | OTLP collector settings | ✅ Yes |
| `logsConfig` | Logs behavior | Optional |
| `metricsConfig` | Metrics behavior | Optional |
| `spanTimeout` | Memory management | Optional |
| `serviceWorkerConfig` | PWA support | Optional |

This comprehensive guide covers all possible configuration scenarios for the simplified modular OpenTelemetry Angular implementation.