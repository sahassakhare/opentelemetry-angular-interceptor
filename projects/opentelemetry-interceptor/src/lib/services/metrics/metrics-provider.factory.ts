import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MeterProvider } from '@opentelemetry/api';
import { MeterProvider as SDKMeterProvider, PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

import { OpenTelemetryConfig, MetricsConfig, MetricsExporters } from '../../configuration/opentelemetry-config';
import { RetryableOTLPMetricExporter } from '../retry-utils';

export function createMetricsProvider(
  config: OpenTelemetryConfig,
  platformId: Object
): MeterProvider | null {
  if (!isPlatformBrowser(platformId) || !config.metricsConfig?.enabled) {
    return null;
  }

  try {
    const metricsConfig = config.metricsConfig as MetricsConfig;
    const metricsExporters = config.metricsExporters || {};

    // Create resource with service information
    const resource = Resource.default().merge(
      new Resource({
        [ATTR_SERVICE_NAME]: config.commonConfig.serviceName,
        [ATTR_SERVICE_VERSION]: '1.0.0',
        ...config.commonConfig.resourceAttributes
      })
    );

    // Create MeterProvider
    const meterProvider = new SDKMeterProvider({
      resource,
      readers: createMetricReaders(config, metricsConfig, metricsExporters)
    });

    console.log('OpenTelemetry Metrics Provider initialized successfully');
    return meterProvider;

  } catch (error) {
    console.error('Failed to initialize OpenTelemetry Metrics Provider:', error);
    return null;
  }
}

function createMetricReaders(
  config: OpenTelemetryConfig,
  metricsConfig: MetricsConfig,
  metricsExporters: MetricsExporters
): any[] {
  const readers: any[] = [];

  // Add OTLP metric reader
  if (metricsExporters.otlp && !metricsExporters.none?.enabled) {
    try {
      const otlpConfig = metricsExporters.otlp;
      
      // Auto-inherit URL from main otelcolConfig if not specified
      const baseUrl = otlpConfig.url || config.otelcolConfig?.url || 'http://localhost:4318';
      const metricsUrl = baseUrl.endsWith('/v1/traces') 
        ? baseUrl.replace('/v1/traces', '/v1/metrics')
        : `${baseUrl}/v1/metrics`;

      const otlpExporter = new OTLPMetricExporter({
        url: metricsUrl,
        headers: {
          ...config.otelcolConfig?.headers,
          ...otlpConfig.headers
        },
        timeoutMillis: otlpConfig.timeoutMs || 10000
      });

      // Wrap with retry logic if configured
      const finalExporter = otlpConfig.retry?.enabled 
        ? new RetryableOTLPMetricExporter(otlpExporter, otlpConfig.retry)
        : otlpExporter;

      const otlpReader = new PeriodicExportingMetricReader({
        exporter: finalExporter,
        exportIntervalMillis: otlpConfig.intervalMs || metricsConfig.interval || 15000
      });

      readers.push(otlpReader);
      console.log(`OTLP Metrics reader added: ${metricsUrl}`);
    } catch (error) {
      console.error('Failed to add OTLP metrics reader:', error);
    }
  }

  // Add Console metric reader
  if (metricsExporters.console?.enabled || metricsConfig.console) {
    try {
      const consoleExporter = new ConsoleMetricExporter();
      const consoleReader = new PeriodicExportingMetricReader({
        exporter: consoleExporter,
        exportIntervalMillis: metricsExporters.console?.intervalMs || 30000
      });

      readers.push(consoleReader);
      console.log('Console Metrics reader added');
    } catch (error) {
      console.error('Failed to add console metrics reader:', error);
    }
  }

  // Add Prometheus reader (if configured)
  if (metricsExporters.prometheus) {
    try {
      // Note: Prometheus exporter would need to be installed separately
      // This is a placeholder for when users want to add Prometheus support
      console.log('Prometheus metrics exporter configured but not implemented (requires @opentelemetry/exporter-prometheus)');
    } catch (error) {
      console.error('Failed to add Prometheus metrics reader:', error);
    }
  }

  return readers;
}

export function metricsProviderFactory(
  config: OpenTelemetryConfig,
  platformId: Object
): MeterProvider | null {
  return createMetricsProvider(config, platformId);
}