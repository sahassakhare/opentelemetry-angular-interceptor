import { NgModule, ModuleWithProviders } from '@angular/core';
import { MetricsNoopExporterService } from './metrics-noop-exporter.service';
import { IMetricsExporter, OTEL_METRICS_EXPORTER } from '../exporter.interface';

/**
 * OpenTelemetry No-op Metrics Exporter Module
 */
@NgModule({})
export class MetricsNoopExporterModule {
  
  /**
   * Configure the no-op metrics exporter module
   * @returns ModuleWithProviders with no-op metrics exporter
   */
  static forRoot(): ModuleWithProviders<MetricsNoopExporterModule> {
    return {
      ngModule: MetricsNoopExporterModule,
      providers: [
        MetricsNoopExporterService,
        {
          provide: OTEL_METRICS_EXPORTER,
          useExisting: MetricsNoopExporterService
        }
      ]
    };
  }
}