import { NgModule, ModuleWithProviders } from '@angular/core';
import { LogsOtelcolExporterService } from './logs-otelcol-exporter.service';
import { ILogsExporter, OTEL_LOGS_EXPORTER, OTEL_LOGS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry OTLP Logs Exporter Module
 */
@NgModule({})
export class LogsOtelcolExporterModule {
  
  /**
   * Configure the OTLP logs exporter module
   * @param options Optional configuration for multi-exporter behavior
   * @returns ModuleWithProviders with OTLP logs exporter
   */
  static forRoot(options?: { 
    multiExporter?: boolean;
    priority?: number;
  }): ModuleWithProviders<LogsOtelcolExporterModule> {
    const isMultiExporter = options?.multiExporter ?? true;
    
    return {
      ngModule: LogsOtelcolExporterModule,
      providers: [
        LogsOtelcolExporterService,
        // Provide both single and multi-exporter tokens for compatibility
        {
          provide: OTEL_LOGS_EXPORTER,
          useExisting: LogsOtelcolExporterService
        },
        // Add to multi-exporter collection
        {
          provide: OTEL_LOGS_EXPORTERS,
          useExisting: LogsOtelcolExporterService,
          multi: true
        }
      ]
    };
  }
}