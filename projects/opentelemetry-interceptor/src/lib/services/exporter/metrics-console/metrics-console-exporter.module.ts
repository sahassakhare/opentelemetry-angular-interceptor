import { NgModule } from '@angular/core';
import { MetricsConsoleExporterService } from './metrics-console-exporter.service';
import { OTEL_METRICS_EXPORTER, OTEL_METRICS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry Console Metrics Exporter Module
 * 
 * Provides console metrics exporter service with both single and multi-exporter tokens.
 * This module follows the same pattern as OtelColExporterModule for consistency.
 */
@NgModule({
  providers: [
    MetricsConsoleExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_METRICS_EXPORTER,
      useExisting: MetricsConsoleExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_METRICS_EXPORTERS,
      useExisting: MetricsConsoleExporterService,
      multi: true
    }
  ]
})
export class MetricsConsoleExporterModule {}