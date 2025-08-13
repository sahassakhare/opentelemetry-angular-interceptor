import { NgModule, ModuleWithProviders } from '@angular/core';
import { LogsNoopExporterService } from './logs-noop-exporter.service';
import { ILogsExporter, OTEL_LOGS_EXPORTER } from '../exporter.interface';

/**
 * OpenTelemetry No-op Logs Exporter Module
 */
@NgModule({})
export class LogsNoopExporterModule {
  
  /**
   * Configure the no-op logs exporter module
   * @returns ModuleWithProviders with no-op logs exporter
   */
  static forRoot(): ModuleWithProviders<LogsNoopExporterModule> {
    return {
      ngModule: LogsNoopExporterModule,
      providers: [
        LogsNoopExporterService,
        {
          provide: OTEL_LOGS_EXPORTER,
          useExisting: LogsNoopExporterService
        }
      ]
    };
  }
}