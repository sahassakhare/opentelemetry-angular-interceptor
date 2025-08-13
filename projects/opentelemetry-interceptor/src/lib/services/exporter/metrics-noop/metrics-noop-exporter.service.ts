import { Injectable } from '@angular/core';
import { MetricReader, PushMetricExporter, ResourceMetrics, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { ExportResult, ExportResultCode } from '@opentelemetry/core';
import { IMetricsExporter } from '../exporter.interface';

/**
 * No-op MetricExporter implementation
 * Discards all metrics without processing them
 */
class NoopMetricExporter implements PushMetricExporter {
  
  export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
    // No-op: do nothing, just return success
    resultCallback({ code: ExportResultCode.SUCCESS });
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * No-op MetricReader implementation
 * Extends MetricReader to provide a reader that does nothing
 */
class NoopMetricReader extends PeriodicExportingMetricReader {
  
  constructor() {
    super({
      exporter: new NoopMetricExporter(),
      exportIntervalMillis: 60000 // Check every minute but do nothing
    });
  }

  protected onForceFlush(): Promise<void> {
    return Promise.resolve();
  }

  protected onShutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * OpenTelemetry No-op Metrics Exporter Service
 * Provides a no-op metric reader that discards all metrics
 */
@Injectable()
export class MetricsNoopExporterService implements IMetricsExporter {
  
  /**
   * Create and configure no-op metrics reader
   * @returns MetricReader that discards all metrics
   */
  getReader(): MetricReader {
    return new NoopMetricReader();
  }
}