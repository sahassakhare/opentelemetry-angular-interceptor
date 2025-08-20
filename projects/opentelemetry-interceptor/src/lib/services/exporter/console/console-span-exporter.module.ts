import { NgModule } from '@angular/core';
import { ConsoleSpanExporterService } from './console-span-exporter.service';
import { OTEL_EXPORTER, OTEL_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry Console Span Exporter Module
 * 
 * Provides console span exporter service with both single and multi-exporter tokens.
 * This module supports both legacy single exporter and new multi-exporter patterns.
 */
@NgModule({
  providers: [
    ConsoleSpanExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_EXPORTER,
      useExisting: ConsoleSpanExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_EXPORTERS,
      useExisting: ConsoleSpanExporterService,
      multi: true
    }
  ]
})
export class ConsoleSpanExporterModule {}