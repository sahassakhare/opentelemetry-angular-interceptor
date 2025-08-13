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
 * Example module using the Modular Exporters pattern
 * 
 * This approach provides fine-grained control over exporters:
 * - Separate modules for each exporter type
 * - Better tree-shaking (unused exporters eliminated)
 * - Easy to test and mock individual exporters
 * - Environment-based conditional loading
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
    
    // ============================================
    // TRACE EXPORTERS (for HTTP interceptor)
    // Must be imported BEFORE OpenTelemetryInterceptorModule
    // ============================================
    OtelColExporterModule, // OTLP trace exporter for HTTP requests
    CompositePropagatorModule, // Trace context propagation
    
    RouterModule.forRoot([
      { path: '', component: HomeComponent },
      { path: 'logs', component: LogsDemoComponent },
      { path: 'metrics', component: MetricsDemoComponent },
      { path: 'errors', component: ErrorDemoComponent }
    ]),
    
    // ============================================
    // BASE INTERCEPTOR CONFIGURATION
    // ============================================
    OpenTelemetryInterceptorModule.forRoot({
      // Standard Jufab tracing configuration (unchanged)
      commonConfig: {
        console: true,
        production: false,
        serviceName: 'enhanced-example-app-modular',
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

      // Enable logs and metrics features
      // Exporters are configured via separate modules below
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
      }
      
      // Note: No logsExporters or metricsExporters configuration
      // These are provided by the modular exporter modules below
    }),
    
    // ============================================
    // MODULAR LOGS EXPORTERS
    // ============================================
    
    // OTLP logs exporter with retry DISABLED to prevent browser crashes
    LogsOtelcolExporterModule.forRoot({
      retry: {
        enabled: false, // DISABLE RETRIES TO PREVENT BROWSER CRASH
        maxAttempts: 1
      }
    }),
    
    // Console logs exporter for development debugging
    LogsConsoleExporterModule.forRoot(),
    
    // ============================================
    // MODULAR METRICS EXPORTERS  
    // ============================================
    
    // OTLP metrics exporter with retry DISABLED to prevent browser crashes
    MetricsOtelcolExporterModule.forRoot({
      retry: {
        enabled: false, // DISABLE RETRIES TO PREVENT BROWSER CRASH
        maxAttempts: 1
      }
    }),
    
    // Console metrics exporter for development debugging
    MetricsConsoleExporterModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModularModule { 

  constructor() {
    console.log('Enhanced OpenTelemetry Demo with Modular Exporters');
    console.log('Logs: OTLP + Console exporters');
    console.log('Metrics: OTLP + Console exporters');
    console.log('Traces: Original Jufab OTLP exporter');
    console.log('---');
    console.log('Benefits of modular approach:');
    console.log('- Fine-grained control over individual exporters');
    console.log('- Better tree-shaking (unused exporters eliminated)');
    console.log('- Easy to test and mock specific exporters');
    console.log('- Environment-based conditional loading');
    console.log('- Consistent with original Jufab span exporter pattern');
  }
}