import { OpenTelemetryConfig } from './projects/opentelemetry-interceptor/src/lib/configuration/opentelemetry-config';

/**
 * Example configurations showing the enhanced OpenTelemetry Angular Interceptor
 * with Logs and Metrics support alongside existing Tracing
 * 
 * Two patterns are available:
 * 1. Configuration-based exporters (all-in-one config)
 * 2. Modular exporters (separate modules for each exporter)
 */

// ============================================
// PATTERN 1: CONFIGURATION-BASED EXPORTERS
// ============================================
export const CONFIGURATION_BASED_CONFIG: OpenTelemetryConfig = {
  // ============================================
  // EXISTING JUFAB CONFIGURATION (UNCHANGED)
  // ============================================
  commonConfig: {
    console: true,
    production: false,
    serviceName: 'my-angular-app',
    probabilitySampler: '1',
    resourceAttributes: {
      'service.namespace': 'production',
      'service.instance.id': 'instance-1',
      'deployment.environment': 'production'
    }
  },

  batchSpanProcessorConfig: {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000
  },

  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces',
    headers: {
      'x-api-key': 'my-api-key'
    }
  },

  // ============================================
  // NEW ENHANCED FEATURES
  // ============================================

  // Logs Configuration
  logsConfig: {
    enabled: true,
    level: 'info', // debug, info, warn, error
    console: true, // Also output to browser console
    consoleBridge: true, // Capture console.log/warn/error calls
    
    // Rate limiting
    rateLimit: {
      maxPerMinute: 100,
      perSeverity: {
        error: 50,
        warn: 30,
        info: 20,
        debug: 10
      }
    },
    
    // PII Redaction
    redact: {
      enabled: true,
      patterns: [
        // Email addresses
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        // SSN
        /\b\d{3}-\d{2}-\d{4}\b/g,
        // Credit card numbers
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        // Phone numbers
        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g
      ]
    }
  },

  // Logs Exporters
  logsExporters: {
    otlp: {
      enabled: true,
      // URL auto-inherits from otelcolConfig if not specified
      // Will use: http://localhost:4318/v1/logs
      
      // Retry configuration
      retry: {
        enabled: true,
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitterType: 'full' // full, equal, decorrelated
      }
    },
    
    console: {
      enabled: true
    }
  },

  // Metrics Configuration
  metricsConfig: {
    enabled: true,
    webVitals: true, // Collect Core Web Vitals
    collectFCP: true, // First Contentful Paint
    collectTTFB: true, // Time to First Byte
    interval: 15000, // Export interval in ms
    console: true, // Log metrics to console
    
    // Histogram boundaries for timing metrics (in ms)
    histogramBoundariesMs: [100, 300, 1000, 3000, 5000, 10000],
    
    // URL sanitization
    urlHygiene: {
      stripQuery: true, // Remove query parameters
      stripFragment: true // Remove URL fragments
    }
  },

  // Metrics Exporters
  metricsExporters: {
    otlp: {
      enabled: true,
      // URL auto-inherits from otelcolConfig if not specified
      // Will use: http://localhost:4318/v1/metrics
      intervalMs: 15000,
      
      // Retry configuration
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
      enabled: true,
      intervalMs: 30000
    },
    
    // Prometheus endpoint (optional)
    prometheus: {
      enabled: false,
      port: 9090,
      endpoint: '/metrics'
    }
  }
};

/**
 * Minimal configuration example - only enables what you need
 */
export const MINIMAL_CONFIG: OpenTelemetryConfig = {
  commonConfig: {
    console: true,
    production: false,
    serviceName: 'my-app'
  },
  
  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces'
  },
  
  // Just add logs
  logsConfig: {
    enabled: true
  },
  
  logsExporters: {
    otlp: { enabled: true }
  },
  
  // Just add metrics
  metricsConfig: {
    enabled: true,
    webVitals: true
  },
  
  metricsExporters: {
    otlp: { enabled: true }
  }
};

/**
 * Production configuration example
 */
export const PRODUCTION_CONFIG: OpenTelemetryConfig = {
  commonConfig: {
    console: false,
    production: true,
    serviceName: 'production-app',
    probabilitySampler: '0.1', // Sample 10% of traces
    resourceAttributes: {
      'service.namespace': 'production',
      'deployment.environment': 'production',
      'service.version': '1.2.3'
    }
  },
  
  batchSpanProcessorConfig: {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 30000
  },
  
  otelcolConfig: {
    url: 'https://otel-collector.example.com/v1/traces',
    headers: {
      'Authorization': 'Bearer ${OTEL_AUTH_TOKEN}'
    }
  },
  
  logsConfig: {
    enabled: true,
    level: 'warn', // Only warn and error in production
    console: false,
    consoleBridge: false,
    rateLimit: {
      maxPerMinute: 1000
    },
    redact: {
      enabled: true,
      patterns: [
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        /\b\d{3}-\d{2}-\d{4}\b/g,
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
      ]
    }
  },
  
  logsExporters: {
    otlp: {
      enabled: true,
      retry: {
        enabled: true,
        maxAttempts: 5,
        initialDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitterType: 'decorrelated'
      }
    }
  },
  
  metricsConfig: {
    enabled: true,
    webVitals: true,
    collectFCP: true,
    collectTTFB: true,
    interval: 30000,
    console: false,
    urlHygiene: {
      stripQuery: true,
      stripFragment: true
    }
  },
  
  metricsExporters: {
    otlp: {
      enabled: true,
      intervalMs: 30000,
      retry: {
        enabled: true,
        maxAttempts: 5,
        initialDelay: 2000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        jitterType: 'decorrelated'
      }
    }
  }
};

// ============================================
// PATTERN 2: MODULAR EXPORTERS
// ============================================

/**
 * Base configuration for modular exporters approach
 * Exporters are configured through separate modules instead of configuration
 */
export const MODULAR_EXPORTERS_BASE_CONFIG: OpenTelemetryConfig = {
  // Standard Jufab configuration
  commonConfig: {
    console: true,
    production: false,
    serviceName: 'modular-app',
    resourceAttributes: {
      'service.namespace': 'demo',
      'deployment.environment': 'development'
    }
  },
  
  otelcolConfig: {
    url: 'http://localhost:4318/v1/traces'
  },
  
  // Enable logs and metrics but don't configure exporters here
  // Exporters will be provided by separate modules
  logsConfig: {
    enabled: true,
    level: 'debug',
    console: true,
    consoleBridge: true
  },
  
  metricsConfig: {
    enabled: true,
    webVitals: true,
    collectFCP: true,
    collectTTFB: true,
    interval: 15000
  }
  
  // Note: No logsExporters or metricsExporters configuration
  // These will be provided by imported modules
};

/**
 * Development environment configuration (modular)
 * Uses console exporters for easy debugging
 */
export const MODULAR_DEVELOPMENT_CONFIG: OpenTelemetryConfig = {
  ...MODULAR_EXPORTERS_BASE_CONFIG,
  commonConfig: {
    ...MODULAR_EXPORTERS_BASE_CONFIG.commonConfig,
    production: false
  }
};

/**
 * Production environment configuration (modular)
 * Uses OTLP exporters with retry logic
 */
export const MODULAR_PRODUCTION_CONFIG: OpenTelemetryConfig = {
  ...MODULAR_EXPORTERS_BASE_CONFIG,
  commonConfig: {
    ...MODULAR_EXPORTERS_BASE_CONFIG.commonConfig,
    console: false,
    production: true,
    probabilitySampler: '0.1'
  },
  otelcolConfig: {
    url: 'https://otel-collector.example.com/v1/traces',
    headers: {
      'Authorization': 'Bearer ${OTEL_AUTH_TOKEN}'
    }
  },
  logsConfig: {
    ...MODULAR_EXPORTERS_BASE_CONFIG.logsConfig,
    level: 'warn',
    console: false,
    consoleBridge: false
  }
};

// Legacy export for backwards compatibility
export const EXAMPLE_OTEL_CONFIG = CONFIGURATION_BASED_CONFIG;