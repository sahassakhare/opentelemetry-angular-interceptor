import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { 
  OpenTelemetryInterceptorModule,
  OtelColExporterModule, // Add trace exporter for HTTP interceptor
  CompositePropagatorModule, // Add propagator for trace context
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule
} from '../../../opentelemetry-interceptor/src/public-api';
// Demo components
import { HomeComponent } from './components/home/home.component';
import { LogsDemoComponent } from './components/logs-demo/logs-demo.component';
import { MetricsDemoComponent } from './components/metrics-demo/metrics-demo.component';
import { ErrorDemoComponent } from './components/error-demo/error-demo.component';

/**
 * Example module using the Configuration-Based approach
 * 
 * This is the traditional approach where all exporters are configured
 * through the main configuration object. Good for simple setups and
 * maintaining backwards compatibility.
 * 
 * For comparison, see app-modular.module.ts which demonstrates
 * the new Modular Exporters pattern.
 */

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    LogsDemoComponent,
    MetricsDemoComponent,
    ErrorDemoComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    // Import exporter modules FIRST, before OpenTelemetryInterceptorModule
     LogsOtelcolExporterModule.forRoot({
          // retry: {
          //   enabled: false, // DISABLE RETRIES TO PREVENT BROWSER CRASH
          //   maxAttempts: 1
          // }
        }),
        
        // Console logs exporter for development debugging
        LogsConsoleExporterModule.forRoot(),
        
    OtelColExporterModule, // Move this BEFORE the interceptor module
    CompositePropagatorModule, // Move this BEFORE the interceptor module
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'logs', component: LogsDemoComponent },
      { path: 'metrics', component: MetricsDemoComponent },
      { path: 'errors', component: ErrorDemoComponent }
    ]),
    OpenTelemetryInterceptorModule.forRoot({
      // ============================================  
      // STANDARD JUFAB CONFIGURATION (TRACING)
      // ============================================
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'enhanced-example-app',
        probabilitySampler: '1',
        resourceAttributes: {
          'service.namespace': 'demo',
          'service.instance.id': 'demo-instance-1',
          'deployment.environment': 'development'
        }
      },

      batchSpanProcessorConfig: {
        maxQueueSize: "2048",
        maxExportBatchSize: "512",
        scheduledDelayMillis: "5000",
        exportTimeoutMillis: "30000"
      },

      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },

      // ============================================
      // ENHANCED FEATURES (LOGS & METRICS)  
      // Configuration-based exporter approach
      // ============================================

      // Logs Configuration
      logsConfig: {
        enabled: true,
        level: 'debug',
        console: true,
        consoleBridge: true,
        
        rateLimit: {
          maxPerMinute: 100,
          perSeverity: {
            error: 50,
            warn: 30,
            info: 20,
            debug: 10
          }
        },
        
        redact: {
          enabled: true,
          patterns: [
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            /\b\d{3}-\d{2}-\d{4}\b/g
          ]
        }
      },

      logsExporters: {
        otlp: {
          retry: {
            enabled: false, // DISABLE RETRIES TO PREVENT BROWSER CRASH
            maxAttempts: 1
          }
        },
        console: {
          enabled: true
        }
      },

      // Metrics Configuration
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

      metricsExporters: {
        otlp: {
          intervalMs: 15000,
          retry: {
            enabled: false, // DISABLE RETRIES TO PREVENT BROWSER CRASH
            maxAttempts: 1
          }
        },
        console: {
          enabled: true,
          intervalMs: 30000
        }
      }
    })
    // Exporter modules moved to top of imports array
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }