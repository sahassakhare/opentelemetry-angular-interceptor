import { NgModule } from '@angular/core';
import { ZipkinExporterService } from './zipkin-exporter.service';
import { OTEL_EXPORTER, OTEL_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry Zipkin Span Exporter Module
 * 
 * Provides Zipkin span exporter service with both single and multi-exporter tokens.
 * This module supports both legacy single exporter and new multi-exporter patterns.
 */
@NgModule({
  providers: [
    ZipkinExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_EXPORTER,
      useExisting: ZipkinExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_EXPORTERS,
      useExisting: ZipkinExporterService,
      multi: true
    }
  ]
})
export class ZipkinExporterModule {}