import { NgModule } from '@angular/core';
import { MetricsOtelcolExporterService } from './metrics-otelcol-exporter.service';
import { OTEL_METRICS_EXPORTER, OTEL_METRICS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry OTLP Metrics Exporter Module
 * 
 * Provides OTLP metrics exporter service with both single and multi-exporter tokens.
 * This module follows the same pattern as OtelColExporterModule for consistency.
 */
@NgModule({
  providers: [
    MetricsOtelcolExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_METRICS_EXPORTER,
      useExisting: MetricsOtelcolExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_METRICS_EXPORTERS,
      useExisting: MetricsOtelcolExporterService,
      multi: true
    }
  ]
})
export class MetricsOtelcolExporterModule {}