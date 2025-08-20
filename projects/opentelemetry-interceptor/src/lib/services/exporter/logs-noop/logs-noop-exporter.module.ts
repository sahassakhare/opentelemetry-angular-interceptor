import { NgModule } from '@angular/core';
import { LogsNoopExporterService } from './logs-noop-exporter.service';
import { OTEL_LOGS_EXPORTER, OTEL_LOGS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry No-op Logs Exporter Module
 * 
 * Provides no-op logs exporter service with both single and multi-exporter tokens.
 * This module follows the same pattern as OtelColExporterModule for consistency.
 */
@NgModule({
  providers: [
    LogsNoopExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_LOGS_EXPORTER,
      useExisting: LogsNoopExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_LOGS_EXPORTERS,
      useExisting: LogsNoopExporterService,
      multi: true
    }
  ]
})
export class LogsNoopExporterModule {}