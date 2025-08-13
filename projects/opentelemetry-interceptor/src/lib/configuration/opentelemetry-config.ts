import { ClassProvider, ConstructorProvider, ExistingProvider, FactoryProvider, InjectionToken, ValueProvider } from '@angular/core';
import { AttributeValue, DiagLogger, DiagLogLevel } from '@opentelemetry/api';
import { Instrumentation } from '@opentelemetry/instrumentation';
import { CustomSpan } from '../interceptor/custom-span.interface';

/**
 * Common configuration
 */
export interface CommonCollectorConfig {
  /** serviceName : Name of service in trace */
  serviceName: string;
  /** resourceAttributes: Extra resource attribute like service.namespace ...*/
  resourceAttributes?: Partial<Record<string, AttributeValue>>;
  /** console : boolean to trace in console */
  console?: boolean;
  /** production : boolean to use a BatchSpanExporter(async) or SimpleSpanExporter(sync) */
  production?: boolean;
  /** probabilitySampler */
  probabilitySampler?: string;
  /** log or not body response in span */
  logBody?: boolean;
  /** log level for opentelemetry */
  logLevel?: DiagLogLevel;
}

/**
 * BatchSpanExporter Configuration
 */
export interface BatchSpanProcessorConfig {
  /** The maximum queue size. After the size is reached spans are dropped. */
  maxQueueSize?: string;
  /** The maximum batch size of every export. It must be smaller or equal to maxQueueSize. */
  maxExportBatchSize?: string;
  /** The interval between two consecutive exports */
  scheduledDelayMillis?: string;
  /** How long the export can run before it is cancelled */
  exportTimeoutMillis?: string;
}

/**
 * OpenTelemetry Collector configuration
 */
export interface OtelCollectorConfig {
  /**
   * An url (Default value: http://localhost:4318/v1/trace)
   */
  url?: string;
  /**
   * custom headers
   */
  headers?: Record<string, string>;
  /**
   * An optional limit on pending requests
   */
  concurrencyLimit?: string;
  /**
   * Maximum time the OTLP exporter will wait for each batch export.
   * The default value is 10000ms.
   * */
  timeoutMillis?: string;
}

/**
 * Configuration for Zipkin
 */
export interface ZipkinCollectorConfig {
  /**
   * An url (Default value: http://localhost:9411/api/v2/spans)
   */
  url?: string;
  /**
   * custom headers
   */
  headers?: {
    [key: string]: string;
  };
}

/**
 * Configuration for JaegerPropagatorConfig
 */
export interface JaegerPropagatorConfig {
  /**
   * A custom Header for the propagator
   */
  customHeader?: string;
}

/**
 * Configuration for B3PropagatorConfig
 */
export interface B3PropagatorConfig {
  /**
   * Single or Multi Header for b3propagator (default: multi)
   * Value : 'O' (single), '1' (multi)
   */
  multiHeader?: string;
}

/**
 * Configuration for IgnoreUrlsConfig
 */
export interface IgnoreUrlsConfig {
  /**
   * URLs that partially match any regex in ignoreUrls will not be traced.
   * In addition, URLs that are _exact matches_ of strings in ignoreUrls will
   * also not be traced.
   */
  urls?: Array<string | RegExp>;
}

/**
 * Retry configuration for enhanced resilience
 */
export interface RetryConfig {
  /** Enable/disable retry logic */
  enabled?: boolean;
  /** Maximum number of retry attempts */
  maxAttempts?: number;
  /** Initial delay in milliseconds */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds */
  maxDelayMs?: number;
  /** Backoff multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** Jitter configuration */
  jitter?: {
    /** Enable/disable jitter */
    enabled?: boolean;
    /** Jitter strategy type */
    type?: 'full' | 'equal' | 'decorrelated';
    /** Maximum jitter in milliseconds */
    maxJitterMs?: number;
  };
}

/**
 * Logs configuration
 */
export interface LogsConfig {
  /** Enable/disable logs collection */
  enabled?: boolean;
  /** Log level threshold */
  level?: 'debug' | 'info' | 'warn' | 'error';
  /** Enable console output for logs */
  console?: boolean;
  /** Bridge console.log calls to OpenTelemetry */
  consoleBridge?: boolean;
  /** Rate limiting configuration */
  rateLimit?: {
    /** Maximum logs per minute globally */
    maxPerMinute?: number;
    /** Per-severity rate limits */
    perSeverity?: Partial<Record<'debug' | 'info' | 'warn' | 'error', number>>;
  };
  /** PII redaction configuration */
  redact?: {
    /** Enable PII redaction */
    enabled?: boolean;
    /** Regex patterns for PII detection */
    patterns?: (string | RegExp)[];
  };
}

/**
 * Metrics configuration
 */
export interface MetricsConfig {
  /** Enable/disable metrics collection */
  enabled?: boolean;
  /** Enable Web Vitals collection */
  webVitals?: boolean;
  /** Collect First Contentful Paint */
  collectFCP?: boolean;
  /** Collect Time to First Byte */
  collectTTFB?: boolean;
  /** Enable console output for metrics */
  console?: boolean;
  /** Metrics export interval in milliseconds */
  interval?: number;
  /** Histogram boundaries for timing metrics */
  histogramBoundariesMs?: number[];
  /** URL hygiene settings */
  urlHygiene?: {
    /** Strip query parameters from URLs */
    stripQuery?: boolean;
    /** Strip URL fragments */
    stripFragment?: boolean;
  };
}

/**
 * Logs exporters configuration
 */
export interface LogsExporters {
  /** OTLP exporter for logs */
  otlp?: {
    /** OTLP endpoint URL (defaults to otelcolConfig.url/logs) */
    url?: string;
    /** Custom headers (defaults to otelcolConfig.headers) */
    headers?: Record<string, string>;
    /** Request timeout in milliseconds */
    timeoutMs?: number;
    /** Retry configuration */
    retry?: RetryConfig;
  };
  /** Console exporter for logs */
  console?: {
    /** Enable console output */
    enabled?: boolean;
  };
  /** Disable all exporters */
  none?: {
    /** Disable all log exporters */
    enabled?: boolean;
  };
}

/**
 * Multi-exporter strategy for logs
 */
export interface MultiLogsExporters {
  /** Strategy for multiple exporters */
  strategy?: 'parallel' | 'fallback';
  /** Individual exporter configurations with priorities */
  exporters?: {
    [key: string]: {
      /** Exporter type */
      type: 'otlp' | 'console' | 'custom';
      /** Enable this exporter */
      enabled?: boolean;
      /** Priority (lower numbers = higher priority) */
      priority?: number;
      /** Only use as fallback */
      fallbackOnly?: boolean;
      /** OTLP specific config */
      otlp?: LogsExporters['otlp'];
      /** Console specific config */
      console?: LogsExporters['console'];
      /** Custom exporter class name or factory */
      custom?: {
        className?: string;
        factory?: string;
        options?: Record<string, any>;
      };
    };
  };
}

/**
 * Metrics exporters configuration
 */
export interface MetricsExporters {
  /** OTLP exporter for metrics */
  otlp?: {
    /** OTLP endpoint URL (defaults to otelcolConfig.url/metrics) */
    url?: string;
    /** Custom headers (defaults to otelcolConfig.headers) */
    headers?: Record<string, string>;
    /** Export interval in milliseconds */
    intervalMs?: number;
    /** Request timeout in milliseconds */
    timeoutMs?: number;
    /** Retry configuration */
    retry?: RetryConfig;
  };
  /** Console exporter for metrics */
  console?: {
    /** Enable console output */
    enabled?: boolean;
    /** Console export interval in milliseconds */
    intervalMs?: number;
  };
  /** Prometheus exporter for metrics */
  prometheus?: {
    /** Prometheus endpoint path */
    endpoint?: string;
    /** Prometheus server port */
    port?: number;
  };
  /** Disable all exporters */
  none?: {
    /** Disable all metric exporters */
    enabled?: boolean;
  };
}

/**
 * Multi-exporter strategy for metrics
 */
export interface MultiMetricsExporters {
  /** Strategy for multiple exporters */
  strategy?: 'parallel' | 'fallback';
  /** Individual exporter configurations with priorities */
  exporters?: {
    [key: string]: {
      /** Exporter type */
      type: 'otlp' | 'console' | 'prometheus' | 'custom';
      /** Enable this exporter */
      enabled?: boolean;
      /** Priority (lower numbers = higher priority) */
      priority?: number;
      /** Only use as fallback */
      fallbackOnly?: boolean;
      /** OTLP specific config */
      otlp?: MetricsExporters['otlp'];
      /** Console specific config */
      console?: MetricsExporters['console'];
      /** Prometheus specific config */
      prometheus?: MetricsExporters['prometheus'];
      /** Custom exporter class name or factory */
      custom?: {
        className?: string;
        factory?: string;
        options?: Record<string, any>;
      };
    };
  };
}

/**
 * Enhanced OpenTelemetryConfig with Logs and Metrics support
 * Fully backwards compatible with existing Jufab configurations
 */
export interface OpenTelemetryConfig {
  /** commonConfig */
  commonConfig: CommonCollectorConfig;
  /** batchSpanProcessorConfig */
  batchSpanProcessorConfig?: BatchSpanProcessorConfig;
  /** otelcolConfig */
  otelcolConfig?: OtelCollectorConfig;
  /** zipkinConfig */
  zipkinConfig?: ZipkinCollectorConfig;
  /** jaegerPropagatorConfig */
  jaegerPropagatorConfig?: JaegerPropagatorConfig;
  /** b3PropagatorConfig */
  b3PropagatorConfig?: B3PropagatorConfig;
  /** ignoreUrls */
  ignoreUrls?: IgnoreUrlsConfig;
  
  // NEW: Logs configuration and exporters (zero migration required)
  /** logsConfig: Configuration for structured logging */
  logsConfig?: LogsConfig;
  /** logsExporters: Configure where logs are exported (simple single/multi-exporter) */
  logsExporters?: LogsExporters;
  /** multiLogsExporters: Advanced multi-exporter configuration with priorities and strategies */
  multiLogsExporters?: MultiLogsExporters;
  
  // NEW: Metrics configuration and exporters (zero migration required)
  /** metricsConfig: Configuration for metrics collection */
  metricsConfig?: MetricsConfig;
  /** metricsExporters: Configure where metrics are exported (simple single/multi-exporter) */
  metricsExporters?: MetricsExporters;
  /** multiMetricsExporters: Advanced multi-exporter configuration with priorities and strategies */
  multiMetricsExporters?: MultiMetricsExporters;
}

/** OTEL_CONFIG : Config injection */
export const OTEL_CONFIG = new InjectionToken<OpenTelemetryConfig>('opentelemetry.config');

/** Logger : injection for a logger compatible */
export const OTEL_LOGGER = new InjectionToken<DiagLogger>('otelcol.logger');

/** custom span */
export const OTEL_CUSTOM_SPAN = new InjectionToken<CustomSpan>('otelcol.custom-span');

export const OTEL_INSTRUMENTATION_PLUGINS = new InjectionToken<Instrumentation[]>('otelcol.instrumentation.plugins');

// NEW: Injection tokens for logs and metrics
/** Logs configuration injection token */
export const OTEL_LOGS_CONFIG = new InjectionToken<LogsConfig>('otelcol.logs.config');

/** Logs provider injection token */
export const OTEL_LOGS_PROVIDER = new InjectionToken<any>('otelcol.logs.provider');

/** Metrics configuration injection token */
export const OTEL_METRICS_CONFIG = new InjectionToken<MetricsConfig>('otelcol.metrics.config');

/** Metrics provider injection token */
export const OTEL_METRICS_PROVIDER = new InjectionToken<any>('otelcol.metrics.provider');

export const defineConfigProvider = (
  config: OpenTelemetryConfig | null | undefined,
  configProvider: ValueProvider | ClassProvider | ConstructorProvider | ExistingProvider | FactoryProvider
): ValueProvider | ClassProvider | ConstructorProvider | ExistingProvider | FactoryProvider => {
  if (config) {
    configProvider = { provide: OTEL_CONFIG, useValue: config };
  } else {
    if (configProvider) {
      if (configProvider.provide !== OTEL_CONFIG) {
        throw new Error(`Configuration error. token must be : ${OTEL_CONFIG} ,  your token value is : ${configProvider.provide}`);
      }
    } else {
      throw new Error(`Configuration error. you must specify a configuration in config or configProvider`);
    }
  }
  return configProvider;
};
