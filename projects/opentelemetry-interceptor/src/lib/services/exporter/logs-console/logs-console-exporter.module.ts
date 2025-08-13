import { NgModule, ModuleWithProviders } from '@angular/core';
import { LogsConsoleExporterService } from './logs-console-exporter.service';
import { ILogsExporter, OTEL_LOGS_EXPORTER, OTEL_LOGS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry Console Logs Exporter Module
 */
@NgModule({})
export class LogsConsoleExporterModule {
  
  /**
   * Configure the console logs exporter module
   * @param options Optional configuration for multi-exporter behavior
   * @returns ModuleWithProviders with console logs exporter
   */
  static forRoot(options?: { 
    multiExporter?: boolean;
    priority?: number;
  }): ModuleWithProviders<LogsConsoleExporterModule> {
    return {
      ngModule: LogsConsoleExporterModule,
      providers: [
        LogsConsoleExporterService,
        // Provide both single and multi-exporter tokens for compatibility
        {
          provide: OTEL_LOGS_EXPORTER,
          useExisting: LogsConsoleExporterService
        },
        // Add to multi-exporter collection
        {
          provide: OTEL_LOGS_EXPORTERS,
          useExisting: LogsConsoleExporterService,
          multi: true
        }
      ]
    };
  }
}