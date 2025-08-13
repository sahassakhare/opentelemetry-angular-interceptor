import { NgModule, ModuleWithProviders } from '@angular/core';
import { MetricsConsoleExporterService } from './metrics-console-exporter.service';
import { IMetricsExporter, OTEL_METRICS_EXPORTER, OTEL_METRICS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry Console Metrics Exporter Module
 */
@NgModule({})
export class MetricsConsoleExporterModule {
  
  /**
   * Configure the console metrics exporter module
   * @returns ModuleWithProviders with console metrics exporter
   */
  static forRoot(options?: { multiExporter?: boolean; priority?: number; }): ModuleWithProviders<MetricsConsoleExporterModule> {
    return {
      ngModule: MetricsConsoleExporterModule,
      providers: [
        MetricsConsoleExporterService,
        {
          provide: OTEL_METRICS_EXPORTER,
          useExisting: MetricsConsoleExporterService
        },
        {
          provide: OTEL_METRICS_EXPORTERS,
          useExisting: MetricsConsoleExporterService,
          multi: true
        }
      ]
    };
  }
}