import { NgModule } from '@angular/core';
import { LogsConsoleExporterService } from './logs-console-exporter.service';
import { OTEL_LOGS_EXPORTER, OTEL_LOGS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry Console Logs Exporter Module
 * 
 * Provides console logs exporter service with both single and multi-exporter tokens.
 * This module follows the same pattern as OtelColExporterModule for consistency.
 */
@NgModule({
  providers: [
    LogsConsoleExporterService,
    // Provide both single and multi-exporter tokens for compatibility
    {
      provide: OTEL_LOGS_EXPORTER,
      useExisting: LogsConsoleExporterService
    },
    // Add to multi-exporter collection for multiple exporters support
    {
      provide: OTEL_LOGS_EXPORTERS,
      useExisting: LogsConsoleExporterService,
      multi: true
    }
  ]
})
export class LogsConsoleExporterModule {}