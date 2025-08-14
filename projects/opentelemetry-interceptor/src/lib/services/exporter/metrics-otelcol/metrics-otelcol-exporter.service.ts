import { Injectable, Inject, Optional } from '@angular/core';
import { MetricReader, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { IMetricsExporter } from '../exporter.interface';
import { OpenTelemetryConfig, OTEL_CONFIG } from '../../../configuration/opentelemetry-config';
import { RetryableOTLPMetricExporter } from '../../retry-utils';

/**
 * OpenTelemetry Metrics OTLP Exporter Service
 * Provides OTLP HTTP metric reader for metrics with optional retry logic
 */
@Injectable()
export class MetricsOtelcolExporterService implements IMetricsExporter {
  
  constructor(
    @Inject(OTEL_CONFIG) @Optional() private otelConfig: OpenTelemetryConfig | null
  ) {}

  /**
   * Create and configure OTLP metrics reader
   * @returns MetricReader configured for OTLP
   */
  getReader(): MetricReader {
    // Support both specific exporter config and fallback to general config
    const metricsExporterConfig = this.otelConfig?.metricsExporters?.otlp || {};
    
    // Auto-inherit URL from main otelcolConfig if not specified
    const baseUrl = metricsExporterConfig.url || this.otelConfig?.otelcolConfig?.url || 'http://localhost:4318';
    const metricsUrl = baseUrl.endsWith('/v1/traces') 
      ? baseUrl.replace('/v1/traces', '/v1/metrics')
      : `${baseUrl}/v1/metrics`;

    // Create base OTLP exporter
    const otlpExporter = new OTLPMetricExporter({
      url: metricsUrl,
      headers: {
        ...this.otelConfig?.otelcolConfig?.headers,
        ...metricsExporterConfig.headers
      },
      timeoutMillis: metricsExporterConfig.timeoutMs || 10000
    });

    // Wrap with retry logic if configured
    const finalExporter = metricsExporterConfig.retry?.enabled 
      ? new RetryableOTLPMetricExporter(otlpExporter, metricsExporterConfig.retry)
      : otlpExporter;

    // Create periodic metric reader
    return new PeriodicExportingMetricReader({
      exporter: finalExporter,
      exportIntervalMillis: metricsExporterConfig.intervalMs || 
                           this.otelConfig?.metricsConfig?.interval || 
                           15000
    });
  }
}