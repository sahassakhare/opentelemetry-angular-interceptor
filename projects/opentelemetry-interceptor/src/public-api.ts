/*
 * Public API Surface of opentelemetry-interceptor
 */
// Interceptor
export { OpenTelemetryInterceptorModule } from './lib/opentelemetry-interceptor.module';
export { OpenTelemetryHttpInterceptor } from './lib/interceptor/opentelemetry-http.interceptor';
// Exporter
export { OtelColExporterModule } from './lib/services/exporter/otelcol/otelcol-exporter.module';
export { OtelcolExporterService } from './lib/services/exporter/otelcol/otelcol-exporter.service';
export { ConsoleSpanExporterModule } from './lib/services/exporter/console/console-span-exporter.module';
export { ConsoleSpanExporterService } from './lib/services/exporter/console/console-span-exporter.service';
export { ZipkinExporterModule } from './lib/services/exporter/zipkin/zipkin-exporter.module';
export { ZipkinExporterService } from './lib/services/exporter/zipkin/zipkin-exporter.service';
export { NoopSpanExporterModule } from './lib/services/exporter/noop-exporter/noop-span-exporter.module';
export { NoopSpanExporterService } from './lib/services/exporter/noop-exporter/noop-span-exporter.service';

// NEW: Logs Exporters
export { LogsOtelcolExporterModule } from './lib/services/exporter/logs-otelcol/logs-otelcol-exporter.module';
export { LogsOtelcolExporterService } from './lib/services/exporter/logs-otelcol/logs-otelcol-exporter.service';
export { LogsConsoleExporterModule } from './lib/services/exporter/logs-console/logs-console-exporter.module';
export { LogsConsoleExporterService } from './lib/services/exporter/logs-console/logs-console-exporter.service';
export { LogsNoopExporterModule } from './lib/services/exporter/logs-noop/logs-noop-exporter.module';
export { LogsNoopExporterService } from './lib/services/exporter/logs-noop/logs-noop-exporter.service';

// NEW: Metrics Exporters
export { MetricsOtelcolExporterModule } from './lib/services/exporter/metrics-otelcol/metrics-otelcol-exporter.module';
export { MetricsOtelcolExporterService } from './lib/services/exporter/metrics-otelcol/metrics-otelcol-exporter.service';
export { MetricsConsoleExporterModule } from './lib/services/exporter/metrics-console/metrics-console-exporter.module';
export { MetricsConsoleExporterService } from './lib/services/exporter/metrics-console/metrics-console-exporter.service';
export { MetricsNoopExporterModule } from './lib/services/exporter/metrics-noop/metrics-noop-exporter.module';
export { MetricsNoopExporterService } from './lib/services/exporter/metrics-noop/metrics-noop-exporter.service';
// Propagator
export { B3PropagatorModule } from './lib/services/propagator/b3-propagator/b3-propagator.module';
export { CompositePropagatorModule } from './lib/services/propagator/composite-propagator/composite-propagator.module';
export { AwsXrayPropagatorModule } from './lib/services/propagator/aws-xray-propagator/aws-xray-propagator.module';
/* eslint-disable max-len */
export { W3CTraceContextPropagatorModule } from './lib/services/propagator/w3c-trace-context-propagator/w3c-trace-context-propagator.module';
export { JaegerHttpTracePropagatorModule } from './lib/services/propagator/jaeger-http-trace-propagator/jaeger-http-trace-propagator.module';
/* eslint-enable max-len */
export { NoopTextMapPropagatorModule } from './lib/services/propagator/noop-http-text-propagator/noop-text-map-propagator.module';
//Component
export { OtelWebTracerModule } from './lib/otel-webtracer.module';

//Interface
export { CustomSpan } from './lib/interceptor/custom-span.interface';
export { 
  OTEL_EXPORTER, 
  OTEL_EXPORTERS,
  IExporter, 
  OTEL_LOGS_EXPORTER, 
  OTEL_LOGS_EXPORTERS,
  ILogsExporter, 
  OTEL_METRICS_EXPORTER, 
  OTEL_METRICS_EXPORTERS,
  IMetricsExporter 
} from './lib/services/exporter/exporter.interface';
export { OTEL_PROPAGATOR, IPropagator } from './lib/services/propagator/propagator.interface';

// Configuration
export {
  CommonCollectorConfig,
  BatchSpanProcessorConfig,
  OtelCollectorConfig,
  OpenTelemetryConfig,
  OTEL_CONFIG,
  ZipkinCollectorConfig,
  JaegerPropagatorConfig,
  B3PropagatorConfig,
  IgnoreUrlsConfig,
  OTEL_LOGGER,
  OTEL_CUSTOM_SPAN,
  OTEL_INSTRUMENTATION_PLUGINS,
  // NEW: Enhanced configuration interfaces
  LogsConfig,
  LogsExporters,
  MultiLogsExporters,
  MetricsConfig,
  MetricsExporters,
  MultiMetricsExporters,
  RetryConfig,
  OTEL_LOGS_CONFIG,
  OTEL_LOGS_PROVIDER,
  OTEL_METRICS_CONFIG,
  OTEL_METRICS_PROVIDER
} from './lib/configuration/opentelemetry-config';

// NEW: Logs and Metrics Services
export {
  OpenTelemetryLogsService,
  OpenTelemetryErrorHandler,
  logsProviderFactory
} from './lib/services/logs';

export {
  OpenTelemetryMetricsService,
  metricsProviderFactory
} from './lib/services/metrics';

// NEW: Modular Provider Factories
export { logsProviderModularFactory } from './lib/services/logs/logs-provider-modular.factory';
export { metricsProviderModularFactory } from './lib/services/metrics/metrics-provider-modular.factory';

// NEW: Multi-Exporter Provider Factories  
export { logsProviderMultiFactory } from './lib/services/logs/logs-provider-multi.factory';
export { metricsProviderMultiFactory } from './lib/services/metrics/metrics-provider-multi.factory';

// NEW: Composite Exporters
export { 
  CompositeSpanExporter,
  CompositeLogRecordExporter,
  CompositeMetricReader
} from './lib/services/exporter/composite';

// NEW: Retry utilities
export {
  RetryableExporter,
  RetryableOTLPExporter,
  RetryableOTLPMetricExporter
} from './lib/services/retry-utils';
