import { NgModule } from '@angular/core';
import { LogsOtelcolExporterService } from './logs-otelcol-exporter.service';
import { OTEL_LOGS_EXPORTER, OTEL_LOGS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry OTLP Logs Exporter Module
 * 
 * Provides OTLP logs exporter service with both single and multi-exporter tokens.
 * This module follows the same pattern as OtelColExporterModule for consistency.
 */
@NgModule({
  providers: [
    LogsOtelcolExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_LOGS_EXPORTER,
      useExisting: LogsOtelcolExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_LOGS_EXPORTERS,
      useExisting: LogsOtelcolExporterService,
      multi: true
    }
  ]
})
export class LogsOtelcolExporterModule {}