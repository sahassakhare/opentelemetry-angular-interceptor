import { NgModule } from '@angular/core';
import { OtelcolExporterService } from './otelcol-exporter.service';
import { OTEL_EXPORTER, OTEL_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry OTLP Span Exporter Module
 * 
 * Provides OTLP span exporter service with both single and multi-exporter tokens.
 * This module supports both legacy single exporter and new multi-exporter patterns.
 */
@NgModule({
  providers: [
    OtelcolExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_EXPORTER,
      useExisting: OtelcolExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_EXPORTERS,
      useExisting: OtelcolExporterService,
      multi: true
    }
  ]
})
export class OtelColExporterModule {}