import { Injectable, Inject, Optional } from '@angular/core';
import { MetricReader, PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { IMetricsExporter } from '../exporter.interface';
import { OpenTelemetryConfig, OTEL_CONFIG } from '../../../configuration/opentelemetry-config';

/**
 * OpenTelemetry Console Metrics Exporter Service
 * Provides console metric reader for metrics
 */
@Injectable()
export class MetricsConsoleExporterService implements IMetricsExporter {
  
  constructor(
    @Inject(OTEL_CONFIG) @Optional() private otelConfig: OpenTelemetryConfig | null
  ) {}

  /**
   * Create and configure console metrics reader
   * @returns MetricReader configured for console output
   */
  getReader(): MetricReader {
    const consoleExporter = new ConsoleMetricExporter();
    
    // Get export interval from config or use default
    const intervalMs = this.otelConfig?.metricsExporters?.console?.intervalMs || 
                      this.otelConfig?.metricsConfig?.interval || 
                      30000;

    return new PeriodicExportingMetricReader({
      exporter: consoleExporter,
      exportIntervalMillis: intervalMs
    });
  }
}