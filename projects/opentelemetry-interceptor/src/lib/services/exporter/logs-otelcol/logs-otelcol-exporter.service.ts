import { Injectable, Inject, Optional } from '@angular/core';
import { LogRecordExporter } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { ILogsExporter } from '../exporter.interface';
import { OpenTelemetryConfig, OTEL_CONFIG } from '../../../configuration/opentelemetry-config';
import { RetryableOTLPExporter } from '../../retry-utils';

/**
 * OpenTelemetry Logs OTLP Exporter Service
 * Provides OTLP HTTP exporter for logs with optional retry logic
 */
@Injectable()
export class LogsOtelcolExporterService implements ILogsExporter {
  
  constructor(
    @Inject(OTEL_CONFIG) @Optional() private otelConfig: OpenTelemetryConfig | null
  ) {}

  /**
   * Create and configure OTLP logs exporter
   * @returns LogRecordExporter configured for OTLP
   */
  getExporter(): LogRecordExporter {
    // Support both specific exporter config and fallback to general config
    const logsExporterConfig = this.otelConfig?.logsExporters?.otlp || {};
    
    // Auto-inherit URL from main otelcolConfig if not specified
    const baseUrl = logsExporterConfig.url || this.otelConfig?.otelcolConfig?.url || 'http://localhost:4318';
    const logsUrl = baseUrl.endsWith('/v1/traces') 
      ? baseUrl.replace('/v1/traces', '/v1/logs')
      : `${baseUrl}/v1/logs`;

    // Create base OTLP exporter
    const otlpExporter = new OTLPLogExporter({
      url: logsUrl,
      headers: {
        ...this.otelConfig?.otelcolConfig?.headers,
        ...logsExporterConfig.headers
      },
      timeoutMillis: logsExporterConfig.timeoutMs || 10000
    });

    // Wrap with retry logic if configured
    if (logsExporterConfig.retry?.enabled) {
      return new RetryableOTLPExporter(otlpExporter, logsExporterConfig.retry);
    }

    return otlpExporter;
  }
}