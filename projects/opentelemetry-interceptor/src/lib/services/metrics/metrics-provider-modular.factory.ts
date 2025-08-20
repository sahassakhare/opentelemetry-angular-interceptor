import { PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MeterProvider } from '@opentelemetry/api';
import { MeterProvider as SDKMeterProvider } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { OpenTelemetryConfig } from '../../configuration/opentelemetry-config';
import { IMetricsExporter, OTEL_METRICS_EXPORTER, OTEL_METRICS_EXPORTERS } from '../exporter/exporter.interface';

/**
 * Factory function to create MeterProvider using modular exporters
 * This version uses Angular dependency injection to get metric readers from modules
 */
export function createMetricsProviderModular(
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

    // Collect metric readers from dependency injection
    const readers: any[] = [];

    try {
      const metricsExporters = injector.get<IMetricsExporter[]>(OTEL_METRICS_EXPORTERS, []);
      
      if (metricsExporters.length > 0) {
        console.log(`OpenTelemetry Metrics: Found ${metricsExporters.length} modular exporter(s)`);
        
        // Add a reader for each exporter
        metricsExporters.forEach((metricsExporter, index) => {
          const reader = metricsExporter.getReader();
          readers.push(reader);
          console.log(`Added metrics reader ${index + 1}/${metricsExporters.length}`);
        });
      } else {
        // Fallback to single exporter for backwards compatibility
        const singleExporter = injector.get<IMetricsExporter>(OTEL_METRICS_EXPORTER, null);
        if (singleExporter) {
          const reader = singleExporter.getReader();
          readers.push(reader);
          console.log('OpenTelemetry Metrics Provider initialized with single modular reader');
        } else {
          console.warn('No metrics exporters found. Please import at least one metrics exporter module.');
        }
      }
    } catch (error) {
      console.error('Failed to get metrics exporters from dependency injection:', error);
    }

    // Create MeterProvider with collected readers
    const meterProvider = new SDKMeterProvider({
      resource,
      readers
    });

    return meterProvider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Metrics Provider (modular):', error);
    return null;
  }
}

export function metricsProviderModularFactory(
  config: OpenTelemetryConfig,
  platformId: Object,
  injector: Injector
): MeterProvider | null {
  return createMetricsProviderModular(config, platformId, injector);
}