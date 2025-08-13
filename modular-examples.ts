/**
 * Modular Exporters Examples
 * 
 * This file demonstrates how to use the modular exporter approach
 * with separate modules for logs and metrics exporters
 */

// ============================================
// DEVELOPMENT MODULE EXAMPLE
// ============================================

import { NgModule } from '@angular/core';
import { 
  OpenTelemetryInterceptorModule,
  LogsConsoleExporterModule,
  MetricsConsoleExporterModule
} from '@jufab/opentelemetry-angular-interceptor';
import { MODULAR_DEVELOPMENT_CONFIG } from './example-config';

@NgModule({
  imports: [
    // Base interceptor with configuration (no exporters configured)
    OpenTelemetryInterceptorModule.forRoot(MODULAR_DEVELOPMENT_CONFIG),
    
    // Modular logs exporters
    LogsConsoleExporterModule.forRoot(),
    
    // Modular metrics exporters
    MetricsConsoleExporterModule.forRoot()
  ]
})
export class DevelopmentAppModule { }

// ============================================
// PRODUCTION MODULE EXAMPLE
// ============================================

import { 
  LogsOtelcolExporterModule,
  MetricsOtelcolExporterModule
} from '@jufab/opentelemetry-angular-interceptor';
import { MODULAR_PRODUCTION_CONFIG } from './example-config';

@NgModule({
  imports: [
    // Base interceptor with production configuration
    OpenTelemetryInterceptorModule.forRoot(MODULAR_PRODUCTION_CONFIG),
    
    // Production logs exporters (OTLP with retry)
    LogsOtelcolExporterModule.forRoot(),
    
    // Production metrics exporters (OTLP with retry)
    MetricsOtelcolExporterModule.forRoot()
  ]
})
export class ProductionAppModule { }

// ============================================
// MULTI-EXPORTER MODULE EXAMPLE
// ============================================

import { 
  LogsOtelcolExporterModule,
  LogsConsoleExporterModule,
  MetricsOtelcolExporterModule,
  MetricsConsoleExporterModule
} from '@jufab/opentelemetry-angular-interceptor';
import { MODULAR_EXPORTERS_BASE_CONFIG } from './example-config';

/**
 * Example using multiple exporters simultaneously
 * Logs and metrics will be sent to both OTLP collector AND console
 */
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot(MODULAR_EXPORTERS_BASE_CONFIG),
    
    // Multiple logs exporters
    LogsOtelcolExporterModule.forRoot(),  // Send to collector
    LogsConsoleExporterModule.forRoot(),  // Also log to console
    
    // Multiple metrics exporters
    MetricsOtelcolExporterModule.forRoot(),  // Send to collector
    MetricsConsoleExporterModule.forRoot()   // Also log to console
  ]
})
export class MultiExporterAppModule { }

// ============================================
// ENVIRONMENT-BASED MODULE EXAMPLE
// ============================================

import { environment } from '../environments/environment';
import { 
  LogsNoopExporterModule,
  MetricsNoopExporterModule
} from '@jufab/opentelemetry-angular-interceptor';

// Dynamic module selection based on environment
const getLogsExporterModules = () => {
  const modules = [];
  
  if (environment.production) {
    modules.push(LogsOtelcolExporterModule.forRoot());
  } else if (environment.development) {
    modules.push(LogsConsoleExporterModule.forRoot());
  } else {
    // Test or other environments - no logging
    modules.push(LogsNoopExporterModule.forRoot());
  }
  
  return modules;
};

const getMetricsExporterModules = () => {
  const modules = [];
  
  if (environment.production) {
    modules.push(MetricsOtelcolExporterModule.forRoot());
  } else if (environment.development) {
    modules.push(MetricsConsoleExporterModule.forRoot());
  } else {
    // Test or other environments - no metrics
    modules.push(MetricsNoopExporterModule.forRoot());
  }
  
  return modules;
};

@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'dynamic-app',
        production: environment.production
      },
      otelcolConfig: {
        url: environment.otelCollectorUrl || 'http://localhost:4318/v1/traces'
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
    }),
    
    // Dynamic exporter modules based on environment
    ...getLogsExporterModules(),
    ...getMetricsExporterModules()
  ]
})
export class EnvironmentBasedAppModule { }

// ============================================
// FEATURE TOGGLE MODULE EXAMPLE
// ============================================

/**
 * Example using feature flags to control exporters
 */
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'feature-flag-app'
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
    }),
    
    // Conditional imports based on feature flags
    ...(environment.featureFlags?.enableOTLPLogs ? [LogsOtelcolExporterModule.forRoot()] : []),
    ...(environment.featureFlags?.enableConsoleLogs ? [LogsConsoleExporterModule.forRoot()] : []),
    ...(environment.featureFlags?.enableOTLPMetrics ? [MetricsOtelcolExporterModule.forRoot()] : []),
    ...(environment.featureFlags?.enableConsoleMetrics ? [MetricsConsoleExporterModule.forRoot()] : []),
    
    // Fallback to no-op if no exporters are enabled
    ...(!environment.featureFlags?.enableOTLPLogs && !environment.featureFlags?.enableConsoleLogs ? 
        [LogsNoopExporterModule.forRoot()] : []),
    ...(!environment.featureFlags?.enableOTLPMetrics && !environment.featureFlags?.enableConsoleMetrics ? 
        [MetricsNoopExporterModule.forRoot()] : [])
  ]
})
export class FeatureToggleAppModule { }

// ============================================
// LAZY LOADING MODULE EXAMPLE
// ============================================

/**
 * Example for lazy-loaded modules that need specific exporters
 */
@NgModule({
  imports: [
    // This lazy-loaded module only needs console exporters for debugging
    LogsConsoleExporterModule.forRoot(),
    MetricsConsoleExporterModule.forRoot()
  ]
})
export class LazyLoadedFeatureModule { }

// ============================================
// TESTING MODULE EXAMPLE
// ============================================

/**
 * Example for testing - uses no-op exporters to avoid side effects
 */
@NgModule({
  imports: [
    OpenTelemetryInterceptorModule.forRoot({
      commonConfig: {
        serviceName: 'test-app',
        production: false
      },
      otelcolConfig: {
        url: 'http://localhost:4318/v1/traces'
      },
      logsConfig: { enabled: true },
      metricsConfig: { enabled: true }
    }),
    
    // No-op exporters for testing (no actual export)
    LogsNoopExporterModule.forRoot(),
    MetricsNoopExporterModule.forRoot()
  ]
})
export class TestAppModule { }