import { NgModule } from '@angular/core';
import { MetricsNoopExporterService } from './metrics-noop-exporter.service';
import { OTEL_METRICS_EXPORTER, OTEL_METRICS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry No-op Metrics Exporter Module
 * 
 * Provides no-op metrics exporter service with both single and multi-exporter tokens.
 * This module follows the same pattern as OtelColExporterModule for consistency.
 */
@NgModule({
  providers: [
    MetricsNoopExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_METRICS_EXPORTER,
      useExisting: MetricsNoopExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_METRICS_EXPORTERS,
      useExisting: MetricsNoopExporterService,
      multi: true
    }
  ]
})
export class MetricsNoopExporterModule {}