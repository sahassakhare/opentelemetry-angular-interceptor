import { InjectionToken } from '@angular/core';
import { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { LogRecordExporter } from '@opentelemetry/sdk-logs';
import { MetricReader } from '@opentelemetry/sdk-metrics';

/**
 * Exporter interface to define a default exporter
 */
export interface IExporter {
  /**
   * give an inmplementation of SpanExporter
   *
   * @return SpanExporter
   */
  getExporter(): SpanExporter;
}

/**
 * Logs Exporter interface to define a default logs exporter
 */
export interface ILogsExporter {
  /**
   * give an implementation of LogRecordExporter
   *
   * @return LogRecordExporter
   */
  getExporter(): LogRecordExporter;
}

/**
 * Metrics Exporter interface to define a default metrics reader
 */
export interface IMetricsExporter {
  /**
   * give an implementation of MetricReader
   *
   * @return MetricReader
   */
  getReader(): MetricReader;
}

/** injection for a single Exporter (backwards compatibility) */
export const OTEL_EXPORTER = new InjectionToken<IExporter>('otelcol.exporter');

/** injection for multiple Exporters (multi-provider pattern) */
export const OTEL_EXPORTERS = new InjectionToken<IExporter[]>('otelcol.exporters');

/** injection for a single Logs Exporter (backwards compatibility) */
export const OTEL_LOGS_EXPORTER = new InjectionToken<ILogsExporter>('otelcol.logs.exporter');

/** injection for multiple Logs Exporters (multi-provider pattern) */
export const OTEL_LOGS_EXPORTERS = new InjectionToken<ILogsExporter[]>('otelcol.logs.exporters');

/** injection for a single Metrics Exporter (backwards compatibility) */
export const OTEL_METRICS_EXPORTER = new InjectionToken<IMetricsExporter>('otelcol.metrics.exporter');

/** injection for multiple Metrics Exporters (multi-provider pattern) */
export const OTEL_METRICS_EXPORTERS = new InjectionToken<IMetricsExporter[]>('otelcol.metrics.exporters');
