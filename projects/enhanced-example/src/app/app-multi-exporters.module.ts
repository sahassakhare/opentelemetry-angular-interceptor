import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { 
  OpenTelemetryInterceptorModule,
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
 * Example module demonstrating Multiple Exporters functionality
 * 
 * This configuration will send:
 * - Logs to BOTH OTLP collector AND console simultaneously  
 * - Metrics to BOTH OTLP collector AND console simultaneously
 * - Perfect for development where you want collector data + console debugging
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
        serviceName: 'multi-exporters-demo-app',
        probabilitySampler: '1',
        resourceAttributes: {
          'service.namespace': 'demo',
          'service.instance.id': 'multi-exporter-instance',
          'deployment.environment': 'development',
          'demo.type': 'multiple-exporters'
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
      // NO exporters configured here - will be provided by modules below
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
      // Multiple exporters will be provided by the modules below
    }),
    
    // ============================================
    // MULTIPLE LOGS EXPORTERS
    // These will automatically combine into a composite exporter
    // ============================================
    
    // OTLP logs exporter - sends logs to OpenTelemetry collector
    LogsOtelcolExporterModule.forRoot(),
    
    // Console logs exporter - also outputs logs to browser console
    LogsConsoleExporterModule.forRoot(),
    
    // ============================================
    // MULTIPLE METRICS EXPORTERS  
    // These will automatically combine into a composite reader
    // ============================================
    
    // OTLP metrics exporter - sends metrics to OpenTelemetry collector
    MetricsOtelcolExporterModule.forRoot(),
    
    // Console metrics exporter - also outputs metrics to browser console  
    MetricsConsoleExporterModule.forRoot()
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppMultiExportersModule { 

  constructor() {
    console.log('Multiple Exporters Demo Application Started');
    console.log('==========================================');
    console.log('This demo showcases multiple exporters functionality:');
    console.log('');
    console.log('LOGS:');
    console.log('  ✓ OTLP Exporter: http://localhost:4318/v1/logs');
    console.log('  ✓ Console Exporter: Browser console output');
    console.log('');
    console.log('METRICS:');
    console.log('  ✓ OTLP Exporter: http://localhost:4318/v1/metrics');
    console.log('  ✓ Console Exporter: Browser console output');
    console.log('');
    console.log('TRACES (Single Exporter):');
    console.log('  ✓ OTLP Exporter: http://localhost:4318/v1/traces');
    console.log('');
    console.log('Navigate to different routes to generate telemetry data.');
    console.log('Check your browser console AND OTEL collector for data!');
    console.log('==========================================');
  }
}