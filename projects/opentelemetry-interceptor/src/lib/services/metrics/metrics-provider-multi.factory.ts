import { PLATFORM_ID, Injector, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MeterProvider } from '@opentelemetry/api';
import { MeterProvider as SDKMeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { OpenTelemetryConfig } from '../../configuration/opentelemetry-config';
import { 
  IMetricsExporter, 
  OTEL_METRICS_EXPORTER, 
  OTEL_METRICS_EXPORTERS 
} from '../exporter/exporter.interface';
import { CompositeMetricReader } from '../exporter/composite/composite-metric-reader';

/**
 * Factory function to create MeterProvider supporting multiple exporters
 * Supports both single exporter (backwards compatibility) and multiple exporters
 */
export function createMetricsProviderMulti(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): MeterProvider | null {
  if (!isPlatformBrowser(platformId) || !config.metricsConfig?.enabled) {
    return null;
  }

  try {
    const metricsConfig = config.metricsConfig;

    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: config.commonConfig.serviceName,
        [ATTR_SERVICE_VERSION]: '1.0.0',
        ...config.commonConfig.resourceAttributes
      })
    );

    // Get metric readers from dependency injection
    const readers = getMetricsReadersFromDI(injector, config);
    
    // Create MeterProvider with readers
    const meterProvider = new SDKMeterProvider({
      resource,
      readers: readers.length > 1 ? [new CompositeMetricReader(readers)] : readers
    });

    if (readers.length > 0) {
      console.log(`OpenTelemetry Metrics Provider initialized with ${readers.length} reader(s)`);
    } else {
      console.warn('No metrics readers found');
    }

    return meterProvider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Metrics Provider (multi):', error);
    return null;
  }
}

/**
 * Get metric readers from dependency injection
 * Tries multiple exporters first, then falls back to single exporter
 */
function getMetricsReadersFromDI(injector: Injector, config: OpenTelemetryConfig): any[] {
  const readers: any[] = [];

  try {
    // Try to get multiple exporters first
    const multiExporters = injector.get<IMetricsExporter[]>(OTEL_METRICS_EXPORTERS, null);
    if (multiExporters && multiExporters.length > 0) {
      multiExporters.forEach(metricsExporter => {
        try {
          const reader = metricsExporter.getReader();
          if (reader) {
            readers.push(reader);
          }
        } catch (error) {
          console.warn('Failed to get reader from multi-provider:', error);
        }
      });
      
      if (readers.length > 0) {
        console.log(`Found ${readers.length} metric readers via multi-provider injection`);
        return readers;
      }
    }
  } catch (error) {
    // Multi-exporters not available, try single exporter
  }

  try {
    // Fallback to single exporter (backwards compatibility)
    const singleExporter = injector.get<IMetricsExporter>(OTEL_METRICS_EXPORTER, null);
    if (singleExporter) {
      const reader = singleExporter.getReader();
      if (reader) {
        readers.push(reader);
        console.log('Found 1 metric reader via single-provider injection');
      }
    }
  } catch (error) {
    console.warn('No metrics exporters found in dependency injection:', error);
  }

  return readers;
}

/**
 * Factory function for Angular dependency injection
 */
export function metricsProviderMultiFactory(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): MeterProvider | null {
  return createMetricsProviderMulti(config, platformId, injector);
}