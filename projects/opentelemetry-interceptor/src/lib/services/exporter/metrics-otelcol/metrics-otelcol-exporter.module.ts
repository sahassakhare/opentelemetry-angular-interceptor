import { NgModule, ModuleWithProviders } from '@angular/core';
import { MetricsOtelcolExporterService } from './metrics-otelcol-exporter.service';
import { IMetricsExporter, OTEL_METRICS_EXPORTER, OTEL_METRICS_EXPORTERS } from '../exporter.interface';

/**
 * OpenTelemetry OTLP Metrics Exporter Module
 */
@NgModule({})
export class MetricsOtelcolExporterModule {
  
  /**
   * Configure the OTLP metrics exporter module
   * @param options Optional configuration for multi-exporter behavior
   * @returns ModuleWithProviders with OTLP metrics exporter
   */
  static forRoot(options?: { 
    multiExporter?: boolean;
    priority?: number;
  }): ModuleWithProviders<MetricsOtelcolExporterModule> {
    return {
      ngModule: MetricsOtelcolExporterModule,
      providers: [
        MetricsOtelcolExporterService,
        // Provide both single and multi-exporter tokens for compatibility
        {
          provide: OTEL_METRICS_EXPORTER,
          useExisting: MetricsOtelcolExporterService
        },
        // Add to multi-exporter collection
        {
          provide: OTEL_METRICS_EXPORTERS,
          useExisting: MetricsOtelcolExporterService,
          multi: true
        }
      ]
    };
  }
}