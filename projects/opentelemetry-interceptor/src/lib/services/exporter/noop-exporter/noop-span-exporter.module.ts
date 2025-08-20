import { NgModule } from '@angular/core';
import { NoopSpanExporterService } from './noop-span-exporter.service';
import { OTEL_EXPORTER, OTEL_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry No-op Span Exporter Module
 * 
 * Provides no-op span exporter service with both single and multi-exporter tokens.
 * This module supports both legacy single exporter and new multi-exporter patterns.
 */
@NgModule({
  providers: [
    NoopSpanExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_EXPORTER,
      useExisting: NoopSpanExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_EXPORTERS,
      useExisting: NoopSpanExporterService,
      multi: true
    }
  ]
})
export class NoopSpanExporterModule {}