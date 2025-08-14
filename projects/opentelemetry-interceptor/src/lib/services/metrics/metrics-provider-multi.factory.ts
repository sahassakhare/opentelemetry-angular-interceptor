import { Injector } from '@angular/core';
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
  // console.log('[MetricsProviderMulti] Creating metrics provider...');
  // console.log('[MetricsProviderMulti] Platform is browser:', isPlatformBrowser(platformId));
  // console.log('[MetricsProviderMulti] Metrics enabled:', config.metricsConfig?.enabled);
  
  if (!isPlatformBrowser(platformId) || !config.metricsConfig?.enabled) {
    // console.log('[MetricsProviderMulti] Metrics provider not created (not browser or disabled)');
    return null;
  }

  try {
    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: config.commonConfig.serviceName,
        [ATTR_SERVICE_VERSION]: '1.0.0',
        ...config.commonConfig.resourceAttributes
      })
    );

    // console.log('[MetricsProviderMulti] Resource created:', resource.attributes);

    // Get metric readers from dependency injection
    const readers = getMetricsReadersFromDI(injector);
    
    // console.log('[MetricsProviderMulti] Readers found:', readers.length);
    
    // Create MeterProvider with readers
    const meterProvider = new SDKMeterProvider({
      resource,
      readers: readers.length > 1 ? [new CompositeMetricReader(readers)] : readers
    });

    if (readers.length > 0) {
      console.log(`OpenTelemetry Metrics Provider initialized with ${readers.length} reader(s)`);
    } else {
      console.warn('No metrics readers found - metrics will not be exported!');
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
function getMetricsReadersFromDI(injector: Injector): any[] {
  const readers: any[] = [];

  // console.log('[MetricsProviderMulti] Looking for metric exporters in DI...');

  try {
    // Try to get multiple exporters first
    const multiExporters = injector.get<IMetricsExporter[]>(OTEL_METRICS_EXPORTERS, null);
    // console.log('[MetricsProviderMulti] Multi-exporters found:', multiExporters?.length || 0);
    
    if (multiExporters && multiExporters.length > 0) {
      multiExporters.forEach((metricsExporter, index) => {
        try {
          // console.log(`[MetricsProviderMulti] Getting reader from exporter ${index + 1}...`);
          const reader = metricsExporter.getReader();
          if (reader) {
            readers.push(reader);
            // console.log(`[MetricsProviderMulti] Successfully added reader ${index + 1}`);
          }
        } catch (error) {
          console.warn(`Failed to get reader from metrics exporter ${index + 1}:`, error);
        }
      });
      
      if (readers.length > 0) {
        // console.log(`[MetricsProviderMulti] Found ${readers.length} metric readers via multi-provider injection`);
        return readers;
      }
    }
  } catch (error) {
    // console.log('[MetricsProviderMulti] Multi-exporters not available, trying single exporter...', error);
  }

  try {
    // Fallback to single exporter (backwards compatibility)
    const singleExporter = injector.get<IMetricsExporter>(OTEL_METRICS_EXPORTER, null);
    if (singleExporter) {
      // console.log('[MetricsProviderMulti] Single exporter found, getting reader...');
      const reader = singleExporter.getReader();
      if (reader) {
        readers.push(reader);
        // console.log('[MetricsProviderMulti] Found 1 metric reader via single-provider injection');
      }
    } else {
      // console.log('[MetricsProviderMulti] No single exporter found');
    }
  } catch (error) {
    console.warn('Error getting metrics exporter:', error);
  }

  if (readers.length === 0) {
    console.warn('No metrics exporters found in dependency injection!');
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